const OAUTH_URL =
  'https://v.ruc.edu.cn/oauth2/authorize?response_type=code&scope=all&state=yourstate&client_id=5d25ae5b90f4d14aa601ede8.ruc&redirect_uri=https://jw.ruc.edu.cn/'
const JW_ORIGIN = 'https://jw.ruc.edu.cn'
const JW_API_COOKIE_URL = `${JW_ORIGIN}/resService/`
const TOKEN_COOKIE_URLS = [
  `${JW_ORIGIN}/`,
  `${JW_ORIGIN}/Njw2017/index.html`,
  JW_API_COOKIE_URL,
]
const TOKEN_COOKIE_NAME = 'token'
const SESSION_COOKIE_NAME = 'SESSION'
const TOKEN_CACHE_PREFIX = 'rucJwCredential'
const TOKEN_EXPIRY_SKEW_SECONDS = 30
const MAX_TOKEN_LENGTH = 16_384
const UNRESOLVED_COOKIE_STORE = '__unresolved__'

// The JW frontend migrates the one-time `token` cookie into
// localStorage.qzdatasoft and then clears the cookie. The page value is the
// canonical credential; the cookie is only an OAuth fallback.

type JwtClaims = {
  sid: string
  exp: number
  iat?: number
}

export type JwCredential = {
  token: string
  claims: JwtClaims
}

export type JwAuthErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'AUTH_REFRESH_FAILED'
  | 'NETWORK'
  | 'UNSUPPORTED_CONTEXT'

export class JwAuthError extends Error {
  constructor(
    public readonly code: JwAuthErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'JwAuthError'
  }
}

const memoryCredentials = new Map<string, JwCredential>()
const credentialVersions = new Map<string, number>()
const refreshPromises = new Map<string, Promise<JwCredential | undefined>>()
const cacheWritePromises = new Map<string, Promise<void>>()

function storeKey(storeId?: string) {
  return storeId ?? 'default'
}

function cacheKey(storeId?: string) {
  return `${TOKEN_CACHE_PREFIX}:${storeKey(storeId)}`
}

function credentialVersion(storeId?: string) {
  return credentialVersions.get(storeKey(storeId)) ?? 0
}

function bumpCredentialVersion(storeId?: string) {
  const nextVersion = credentialVersion(storeId) + 1
  credentialVersions.set(storeKey(storeId), nextVersion)
  return nextVersion
}

function isJwDomain(domain: string) {
  const normalized = domain.replace(/^\./, '')
  return normalized === 'jw.ruc.edu.cn' || normalized === 'ruc.edu.cn'
}

function isSupportedCookieStore(storeId?: string) {
  if (!storeId || storeId === '0' || storeId === 'firefox-default') {
    return true
  }

  if (!browser.extension?.inIncognitoContext) return false
  return storeId === '1' || storeId === 'firefox-private'
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  const bytes = Uint8Array.from(atob(normalized + padding), (character) =>
    character.charCodeAt(0),
  )

  return new TextDecoder().decode(bytes)
}

function parseJwtClaims(token: string): JwtClaims | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Partial<JwtClaims>

    if (typeof payload.sid !== 'string' || !payload.sid) return null
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null
    }

    return {
      sid: payload.sid,
      exp: payload.exp,
      iat:
        typeof payload.iat === 'number' && Number.isFinite(payload.iat)
          ? payload.iat
          : undefined,
    }
  } catch {
    return null
  }
}

function isCredentialFresh(credential: JwCredential) {
  const now = Date.now() / 1000
  return credential.claims.exp > now + TOKEN_EXPIRY_SKEW_SECONDS
}

function credentialFromToken(token: unknown): JwCredential | null {
  if (typeof token !== 'string') return null

  const normalized = token.trim()
  const claims = parseJwtClaims(normalized)

  if (!claims) return null

  const credential = { token: normalized, claims }
  return isCredentialFresh(credential) ? credential : null
}

function isCredentialForSessions(
  credential: JwCredential,
  sessionIds: Set<string>,
) {
  return sessionIds.has(credential.claims.sid)
}

async function getSessionIds(storeId?: string) {
  const cookie = await browser.cookies.get({
    url: JW_API_COOKIE_URL,
    name: SESSION_COOKIE_NAME,
    ...(storeId ? { storeId } : {}),
  })

  if (!cookie || !isJwDomain(cookie.domain) || !cookie.value) {
    return new Set<string>()
  }

  return new Set([cookie.value])
}

async function getCookieCredential(
  storeId: string | undefined,
  sessionIds: Set<string>,
  rejectedToken?: string,
) {
  const cookieBatches = await Promise.all(
    TOKEN_COOKIE_URLS.map((url) =>
      browser.cookies.getAll({
        url,
        name: TOKEN_COOKIE_NAME,
        ...(storeId ? { storeId } : {}),
      }),
    ),
  )
  const seenCookies = new Set<string>()
  const cookies = cookieBatches.flat().filter((cookie) => {
    const key = `${cookie.storeId}:${cookie.domain}:${cookie.path}:${cookie.value}`
    if (seenCookies.has(key)) return false
    seenCookies.add(key)
    return true
  })

  return cookies
    .filter(
      (cookie) =>
        isJwDomain(cookie.domain) &&
        Boolean(cookie.value) &&
        cookie.value !== rejectedToken,
    )
    .filter(
      (cookie) =>
        typeof cookie.expirationDate !== 'number' ||
        cookie.expirationDate * 1000 > Date.now(),
    )
    .map((cookie) => credentialFromToken(cookie.value))
    .filter((credential): credential is JwCredential => Boolean(credential))
    .filter((credential) =>
      isCredentialForSessions(credential, sessionIds),
    )
    .sort((left, right) => {
      const issuedAtDifference =
        (right.claims.iat ?? 0) - (left.claims.iat ?? 0)

      return issuedAtDifference || right.claims.exp - left.claims.exp
    })[0]
}

function isStoredCredential(value: unknown): value is JwCredential {
  if (!value || typeof value !== 'object') return false

  const credential = value as Partial<JwCredential>
  const parsedCredential = credentialFromToken(credential.token)

  return Boolean(
    parsedCredential &&
      credential.claims?.sid === parsedCredential.claims.sid &&
      credential.claims.exp === parsedCredential.claims.exp,
  )
}

function sessionStorageArea() {
  return browser.storage?.session
}

async function queueCacheWrite(
  storeId: string | undefined,
  write: () => Promise<void>,
) {
  const key = storeKey(storeId)
  const previousWrite = cacheWritePromises.get(key) ?? Promise.resolve()
  const nextWrite = previousWrite.catch(() => undefined).then(write)

  cacheWritePromises.set(key, nextWrite)

  try {
    await nextWrite
  } finally {
    if (cacheWritePromises.get(key) === nextWrite) {
      cacheWritePromises.delete(key)
    }
  }
}

async function rememberCredential(
  credential: JwCredential,
  storeId?: string,
) {
  bumpCredentialVersion(storeId)
  memoryCredentials.set(storeKey(storeId), credential)

  const area = sessionStorageArea()
  if (!area) return

  try {
    await queueCacheWrite(storeId, () =>
      area.set({ [cacheKey(storeId)]: credential }),
    )
  } catch {
    // Firefox versions without storage.session still use the in-memory cache.
  }
}

export async function clearJwCredential(storeId?: string) {
  bumpCredentialVersion(storeId)
  memoryCredentials.delete(storeKey(storeId))

  const area = sessionStorageArea()
  if (!area) return

  try {
    await queueCacheWrite(storeId, () => area.remove(cacheKey(storeId)))
  } catch {
    // The in-memory cache has already been cleared.
  }
}

async function getCachedCredential(
  storeId: string | undefined,
  sessionIds: Set<string>,
) {
  const versionAtStart = credentialVersion(storeId)
  const memoryCredential = memoryCredentials.get(storeKey(storeId))

  if (
    memoryCredential &&
    isCredentialFresh(memoryCredential) &&
    isCredentialForSessions(memoryCredential, sessionIds)
  ) {
    return memoryCredential
  }

  let storedCredential: unknown

  try {
    storedCredential = (
      await sessionStorageArea()?.get(cacheKey(storeId))
    )?.[cacheKey(storeId)]
  } catch {
    storedCredential = undefined
  }

  if (credentialVersion(storeId) !== versionAtStart) {
    return undefined
  }

  if (
    !isStoredCredential(storedCredential) ||
    !isCredentialFresh(storedCredential) ||
    !isCredentialForSessions(storedCredential, sessionIds)
  ) {
    await clearJwCredential(storeId)
    return undefined
  }

  memoryCredentials.set(storeKey(storeId), storedCredential)
  return storedCredential
}

export async function getCookieStoreIdForTab(tabId?: number) {
  if (typeof tabId !== 'number') return undefined

  try {
    const stores = await browser.cookies.getAllCookieStores()
    return (
      stores.find((store) => store.tabIds.includes(tabId))?.id ??
      UNRESOLVED_COOKIE_STORE
    )
  } catch {
    return UNRESOLVED_COOKIE_STORE
  }
}

async function getJwTabIds(storeId?: string) {
  const tabs = await browser.tabs.query({ url: `${JW_ORIGIN}/*` })
  const tabIds = tabs
    .map((tab) => tab.id)
    .filter((tabId): tabId is number => typeof tabId === 'number')

  if (!storeId) return tabIds

  const stores = await browser.cookies.getAllCookieStores()
  const store = stores.find((candidate) => candidate.id === storeId)

  if (!store) return []

  const storeTabIds = new Set(store.tabIds)
  return tabIds.filter((tabId) => storeTabIds.has(tabId))
}

async function readCredentialFromJwTabs(
  storeId: string | undefined,
  sessionIds: Set<string>,
  rejectedToken?: string,
) {
  let tabIds: number[]

  try {
    tabIds = await getJwTabIds(storeId)
  } catch {
    return undefined
  }

  for (const tabId of tabIds) {
    try {
      const response = (await browser.tabs.sendMessage(tabId, {
        type: 'RUC_JW_TOKEN_READ',
      })) as { token?: unknown } | undefined
      const credential = credentialFromToken(response?.token)

      if (
        credential &&
        credential.token !== rejectedToken &&
        isCredentialForSessions(credential, sessionIds)
      ) {
        await rememberCredential(credential, storeId)
        return credential
      }
    } catch {
      // Existing tabs may not have the current content script until reloaded.
    }
  }

  return undefined
}

export async function observeJwToken(token: unknown, storeId?: string) {
  if (!isSupportedCookieStore(storeId)) return false

  if (token === null || token === undefined || token === '') {
    await clearJwCredential(storeId)
    return false
  }

  const credential = credentialFromToken(token)
  if (!credential) return false

  const sessionIds = await getSessionIds(storeId)
  if (!isCredentialForSessions(credential, sessionIds)) return false

  await rememberCredential(credential, storeId)
  return true
}

async function refreshViaOAuth(storeId?: string, rejectedToken?: string) {
  const key = storeKey(storeId)
  const pendingRefresh = refreshPromises.get(key)
  if (pendingRefresh) return pendingRefresh

  const refresh = (async () => {
    await clearJwCredential(storeId)

    let response: Response

    try {
      response = await fetch(OAUTH_URL, {
        credentials: 'include',
        redirect: 'follow',
        cache: 'no-store',
      })
    } catch {
      throw new JwAuthError(
        'NETWORK',
        '暂时无法连接统一身份认证，请稍后重试。',
      )
    }

    if (response.status >= 500) {
      throw new JwAuthError(
        'AUTH_REFRESH_FAILED',
        `统一身份认证暂时不可用（HTTP ${response.status}）。`,
      )
    }

    try {
      if (new URL(response.url).origin !== JW_ORIGIN) {
        throw new JwAuthError(
          'NOT_AUTHENTICATED',
          '请先登录微人大，然后重试。',
        )
      }
    } catch (error) {
      if (error instanceof JwAuthError) throw error
      throw new JwAuthError(
        'AUTH_REFRESH_FAILED',
        '统一身份认证返回了异常地址，请重试。',
      )
    }

    const sessionIds = await getSessionIds(storeId)
    const cookieCredential = await getCookieCredential(
      storeId,
      sessionIds,
      rejectedToken,
    )

    if (cookieCredential) {
      await rememberCredential(cookieCredential, storeId)
      return cookieCredential
    }

    return await readCredentialFromJwTabs(
      storeId,
      sessionIds,
      rejectedToken,
    )
  })().finally(() => {
    refreshPromises.delete(key)
  })

  refreshPromises.set(key, refresh)
  return refresh
}

export async function resolveJwCredential(options?: {
  forceRefresh?: boolean
  rejectedToken?: string
  storeId?: string
}) {
  const storeId = options?.storeId

  if (!isSupportedCookieStore(storeId)) {
    throw new JwAuthError(
      'UNSUPPORTED_CONTEXT',
      '暂不支持在 Firefox 容器或跨 Cookie 存储环境中查询教务信息。',
    )
  }

  if (options?.forceRefresh) {
    const credential = await refreshViaOAuth(
      storeId,
      options.rejectedToken,
    )

    if (credential?.token === options.rejectedToken) {
      await clearJwCredential(storeId)
      return undefined
    }

    return credential
  }

  const sessionIds = await getSessionIds(storeId)
  const pageCredential = await readCredentialFromJwTabs(storeId, sessionIds)
  if (pageCredential) return pageCredential

  const cachedCredential = await getCachedCredential(storeId, sessionIds)
  if (cachedCredential) return cachedCredential

  const cookieCredential = await getCookieCredential(storeId, sessionIds)
  if (cookieCredential) {
    await rememberCredential(cookieCredential, storeId)
    return cookieCredential
  }

  return await refreshViaOAuth(storeId)
}

export async function reconcileJwSession(storeId?: string) {
  if (!isSupportedCookieStore(storeId)) return

  const sessionIds = await getSessionIds(storeId)
  await getCachedCredential(storeId, sessionIds)
}

async function isAuthenticationFailure(response: Response) {
  if (response.status === 401) return true

  try {
    if (response.url && new URL(response.url).origin !== JW_ORIGIN) {
      return true
    }
  } catch {
    // Continue with the response body check below.
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.includes('json')) return false

  try {
    const text = await response.clone().text()
    return /"errorCode"\s*:\s*"security\.httpstatu\.401(?:\.|\")/.test(
      text,
    )
  } catch {
    return false
  }
}

function requestWithToken(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('Token', token)

  return {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
  }
}

async function performJwRequest(
  input: RequestInfo | URL,
  init: RequestInit,
  credential: JwCredential,
) {
  try {
    return await fetch(input, requestWithToken(init, credential.token))
  } catch {
    throw new JwAuthError(
      'NETWORK',
      '暂时无法连接教务系统，请检查网络后重试。',
    )
  }
}

export async function fetchJw(
  input: RequestInfo | URL,
  init: RequestInit,
  storeId?: string,
) {
  const credential = await resolveJwCredential({ storeId })
  // console.log("Resolved JW credential:", credential, "for storeId:", storeId);
  if (!credential) {
    throw new JwAuthError(
      'NOT_AUTHENTICATED',
      '请先登录微人大，然后重试。',
    )
  }

  const firstResponse = await performJwRequest(input, init, credential)
  // console.log("First JW request response:", firstResponse, "for input:", input, "with init:", init);
  if (!(await isAuthenticationFailure(firstResponse))) {
    if (firstResponse.ok) {
      await rememberCredential(credential, storeId)
    }
    return firstResponse
  }

  await clearJwCredential(storeId)

  let refreshedCredential: JwCredential | undefined

  try {
    refreshedCredential = await resolveJwCredential({
      forceRefresh: true,
      rejectedToken: credential.token,
      storeId,
    })
  } catch (error) {
    if (error instanceof JwAuthError) throw error
    throw new JwAuthError('AUTH_REFRESH_FAILED', '登录状态刷新失败，请重试。')
  }

  if (!refreshedCredential) {
    throw new JwAuthError(
      'NOT_AUTHENTICATED',
      '登录状态已失效，请重新登录微人大。',
    )
  }

  const retryResponse = await performJwRequest(
    input,
    init,
    refreshedCredential,
  )

  if (await isAuthenticationFailure(retryResponse)) {
    await clearJwCredential(storeId)
    throw new JwAuthError(
      'NOT_AUTHENTICATED',
      '登录状态已失效，请重新登录微人大。',
    )
  }

  if (retryResponse.ok) {
    await rememberCredential(refreshedCredential, storeId)
  }

  return retryResponse
}

export function jwAuthErrorMessage(error: unknown) {
  if (error instanceof JwAuthError) return error.message
  return error instanceof Error ? error.message : String(error)
}

export function isNotAuthenticatedError(error: unknown) {
  return error instanceof JwAuthError && error.code === 'NOT_AUTHENTICATED'
}

export function isJwSessionCookie(cookie: { domain: string; name: string }) {
  return cookie.name === SESSION_COOKIE_NAME && isJwDomain(cookie.domain)
}
