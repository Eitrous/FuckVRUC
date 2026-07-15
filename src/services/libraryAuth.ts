const LIBRARY_ORIGIN = 'https://zwlib.ruc.edu.cn'
const LIBRARY_APP_URL = `${LIBRARY_ORIGIN}/jsq-v`
const LIBRARY_LOGIN_URL =
  `${LIBRARY_ORIGIN}/rem/static/sso/login?redirectUrl=` +
  encodeURIComponent(LIBRARY_APP_URL)
const TOKEN_CACHE_PREFIX = 'rucLibraryCredential'
const REJECTED_TOKEN_CACHE_PREFIX = 'rucLibraryRejectedCredential'
const AUTH_CACHE_PREFIX = 'rucLibraryAuthentication'
const MAX_TOKEN_LENGTH = 16_384
const MAX_REJECTED_TOKEN_HASHES = 128
const DEFAULT_STORE_KEY = 'default'
const AUTH_INTERACTION_DELAY_MS = 6_000
const AUTH_MAX_AGE_MS = 5 * 60_000
const LIBRARY_AUTH_ORIGINS = new Set([
  LIBRARY_ORIGIN,
  'https://cas.ruc.edu.cn',
])
const DEFAULT_COOKIE_STORE_IDS = new Set([
  '0',
  'firefox-default',
  '__unresolved__',
])

const memoryTokens = new Map<string, string>()
// Keep fingerprints for this browser session because old tabs can continue
// exposing expired credentials after a newer library login succeeds.
const rejectedTokenHashes = new Map<string, string[]>()
const credentialVersions = new Map<string, number>()
const cacheWritePromises = new Map<string, Promise<void>>()
const rejectedTokenUpdatePromises = new Map<string, Promise<void>>()
const authenticationStates = new Map<string, LibraryAuthenticationState>()
const authenticationStartPromises = new Map<
  string,
  Promise<LibraryTokenResolution>
>()

type LibraryAuthenticationState = {
  tabId: number
  createdAt: number
  activated: boolean
}

export type LibraryTokenResolution =
  | { status: 'ready'; token: string }
  | { status: 'pending' }
  | { status: 'failed' }

function storeKey(storeId?: string) {
  return !storeId || DEFAULT_COOKIE_STORE_IDS.has(storeId)
    ? DEFAULT_STORE_KEY
    : storeId
}

function cacheKey(storeId?: string) {
  return `${TOKEN_CACHE_PREFIX}:${storeKey(storeId)}`
}

function rejectedTokenCacheKey(storeId?: string) {
  return `${REJECTED_TOKEN_CACHE_PREFIX}:${storeKey(storeId)}`
}

function authenticationCacheKey(storeId?: string) {
  return `${AUTH_CACHE_PREFIX}:${storeKey(storeId)}`
}

function credentialVersion(storeId?: string) {
  return credentialVersions.get(storeKey(storeId)) ?? 0
}

function bumpCredentialVersion(storeId?: string) {
  const nextVersion = credentialVersion(storeId) + 1
  credentialVersions.set(storeKey(storeId), nextVersion)
  return nextVersion
}

function normalizeToken(value: unknown) {
  if (typeof value !== 'string') return undefined

  const token = value.trim()
  if (!token || token.length > MAX_TOKEN_LENGTH) return undefined

  return token
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

async function queueRejectedTokenUpdate(
  storeId: string | undefined,
  update: () => Promise<void>,
) {
  const key = storeKey(storeId)
  const previousUpdate =
    rejectedTokenUpdatePromises.get(key) ?? Promise.resolve()
  const nextUpdate = previousUpdate.catch(() => undefined).then(update)

  rejectedTokenUpdatePromises.set(key, nextUpdate)

  try {
    await nextUpdate
  } finally {
    if (rejectedTokenUpdatePromises.get(key) === nextUpdate) {
      rejectedTokenUpdatePromises.delete(key)
    }
  }
}

async function tokenFingerprint(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function normalizeRejectedTokenHashes(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value.filter(
        (hash): hash is string =>
          typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash),
      ),
    ),
  ).slice(-MAX_REJECTED_TOKEN_HASHES)
}

async function getRejectedLibraryTokenHashes(
  storeId?: string,
  waitForUpdates = true,
) {
  const key = storeKey(storeId)

  if (waitForUpdates) {
    try {
      await rejectedTokenUpdatePromises.get(key)
    } catch {
      // Continue with the last successfully applied marker update.
    }
  }

  const memoryHashes = rejectedTokenHashes.get(key)
  if (memoryHashes) return memoryHashes

  try {
    await cacheWritePromises.get(key)
  } catch {
    // Continue with the last successfully persisted markers.
  }

  const currentMemoryHashes = rejectedTokenHashes.get(key)
  if (currentMemoryHashes) return currentMemoryHashes

  let storedHashes: unknown
  try {
    storedHashes = (await sessionStorageArea()?.get(
      rejectedTokenCacheKey(storeId),
    ))?.[rejectedTokenCacheKey(storeId)]
  } catch {
    storedHashes = undefined
  }

  const hashes = normalizeRejectedTokenHashes(storedHashes)
  rejectedTokenHashes.set(key, hashes)
  return hashes
}

async function rememberRejectedLibraryToken(
  token: string,
  storeId?: string,
) {
  const hash = await tokenFingerprint(token)
  await queueRejectedTokenUpdate(storeId, async () => {
    const existingHashes = await getRejectedLibraryTokenHashes(
      storeId,
      false,
    )
    const hashes = [
      ...existingHashes.filter((candidate) => candidate !== hash),
      hash,
    ].slice(-MAX_REJECTED_TOKEN_HASHES)

    rejectedTokenHashes.set(storeKey(storeId), hashes)

    const area = sessionStorageArea()
    if (!area) return

    try {
      await queueCacheWrite(storeId, () =>
        area.set({ [rejectedTokenCacheKey(storeId)]: hashes }),
      )
    } catch {
      // Older Firefox versions retain these markers in background memory.
    }
  })
}

function isLibraryAuthenticationState(
  value: unknown,
): value is LibraryAuthenticationState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const state = value as Record<string, unknown>
  return (
    typeof state.tabId === 'number' &&
    Number.isInteger(state.tabId) &&
    state.tabId >= 0 &&
    typeof state.createdAt === 'number' &&
    Number.isFinite(state.createdAt) &&
    typeof state.activated === 'boolean'
  )
}

function isLibraryAuthenticationUrl(url?: string) {
  if (!url) return false

  try {
    return LIBRARY_AUTH_ORIGINS.has(new URL(url).origin)
  } catch {
    return false
  }
}

async function rememberLibraryAuthentication(
  state: LibraryAuthenticationState,
  storeId?: string,
) {
  authenticationStates.set(storeKey(storeId), state)

  const area = sessionStorageArea()
  if (!area) return

  try {
    await queueCacheWrite(storeId, () =>
      area.set({ [authenticationCacheKey(storeId)]: state }),
    )
  } catch {
    // Older Firefox versions keep the short-lived state in background memory.
  }
}

async function getLibraryAuthentication(storeId?: string) {
  const key = storeKey(storeId)
  const memoryState = authenticationStates.get(key)
  if (memoryState) return memoryState

  try {
    await cacheWritePromises.get(key)
  } catch {
    // Continue with the last successfully persisted session state.
  }

  const currentMemoryState = authenticationStates.get(key)
  if (currentMemoryState) return currentMemoryState

  let storedState: unknown
  try {
    storedState = (await sessionStorageArea()?.get(
      authenticationCacheKey(storeId),
    ))?.[authenticationCacheKey(storeId)]
  } catch {
    storedState = undefined
  }

  if (!isLibraryAuthenticationState(storedState)) return undefined

  authenticationStates.set(key, storedState)
  return storedState
}

async function clearLibraryAuthentication(storeId?: string) {
  const key = storeKey(storeId)
  const state =
    authenticationStates.get(key) ??
    (await getLibraryAuthentication(storeId))

  authenticationStates.delete(key)

  const area = sessionStorageArea()
  if (area) {
    try {
      await queueCacheWrite(storeId, () =>
        area.remove(authenticationCacheKey(storeId)),
      )
    } catch {
      // The in-memory state has already been cleared.
    }
  }

  return state
}

async function closeLibraryAuthenticationTab(storeId?: string) {
  const state = await clearLibraryAuthentication(storeId)
  if (!state) return

  try {
    const tab = await browser.tabs.get(state.tabId)
    if (
      !isLibraryAuthenticationUrl(tab.url) &&
      !isLibraryAuthenticationUrl(tab.pendingUrl) &&
      Date.now() - state.createdAt >= AUTH_INTERACTION_DELAY_MS
    ) {
      return
    }
    await browser.tabs.remove(state.tabId)
  } catch {
    // The temporary tab may already be closed.
  }
}

async function rememberLibraryToken(token: string, storeId?: string) {
  bumpCredentialVersion(storeId)
  memoryTokens.set(storeKey(storeId), token)

  const area = sessionStorageArea()
  if (area) {
    try {
      await queueCacheWrite(storeId, () =>
        area.set({ [cacheKey(storeId)]: token }),
      )
    } catch {
      // Older Firefox versions can continue with the background-memory cache.
    }
  }

  await closeLibraryAuthenticationTab(storeId)
}

export async function clearLibraryToken(
  storeId?: string,
  expectedToken?: string,
) {
  if (expectedToken !== undefined) {
    const expected = normalizeToken(expectedToken)
    const current = normalizeToken(memoryTokens.get(storeKey(storeId)))

    if (!expected || current !== expected) return false
  }

  bumpCredentialVersion(storeId)
  memoryTokens.delete(storeKey(storeId))

  const area = sessionStorageArea()
  if (!area) return true

  try {
    await queueCacheWrite(storeId, () => area.remove(cacheKey(storeId)))
  } catch {
    // The in-memory credential has already been removed.
  }

  return true
}

export async function rejectLibraryToken(
  token: unknown,
  storeId?: string,
) {
  const normalized = normalizeToken(token)
  if (!normalized) return false

  await rememberRejectedLibraryToken(normalized, storeId)
  await clearLibraryToken(storeId, normalized)
  return true
}

async function getCachedLibraryToken(storeId?: string) {
  const memoryToken = normalizeToken(memoryTokens.get(storeKey(storeId)))
  if (memoryToken) return memoryToken

  const versionAtStart = credentialVersion(storeId)
  let storedToken: unknown

  try {
    storedToken = (await sessionStorageArea()?.get(cacheKey(storeId)))?.[
      cacheKey(storeId)
    ]
  } catch {
    storedToken = undefined
  }

  if (credentialVersion(storeId) !== versionAtStart) return undefined

  const token = normalizeToken(storedToken)
  if (!token) {
    await clearLibraryToken(storeId)
    return undefined
  }

  memoryTokens.set(storeKey(storeId), token)
  return token
}

async function getLibraryTabIds(storeId?: string) {
  const tabs = await browser.tabs.query({ url: `${LIBRARY_ORIGIN}/*` })
  const tabIds = tabs
    .map((tab) => tab.id)
    .filter((tabId): tabId is number => typeof tabId === 'number')

  const stores = await browser.cookies.getAllCookieStores()
  const key = storeKey(storeId)
  const store = stores.find((candidate) => {
    return key === DEFAULT_STORE_KEY
      ? DEFAULT_COOKIE_STORE_IDS.has(candidate.id)
      : candidate.id === key
  })

  if (!store) return []

  const storeTabIds = new Set(store.tabIds)
  return tabIds.filter((tabId) => storeTabIds.has(tabId))
}

async function readLibraryTokenFromTabs(
  storeId?: string,
  rejectedHashes = new Set<string>(),
) {
  let tabIds: number[]

  try {
    tabIds = await getLibraryTabIds(storeId)
  } catch {
    return undefined
  }

  for (const tabId of tabIds) {
    try {
      const response = (await browser.tabs.sendMessage(tabId, {
        type: 'RUC_LIBRARY_TOKEN_READ',
      })) as { token?: unknown } | undefined
      const token = normalizeToken(response?.token)

      if (token && !rejectedHashes.has(await tokenFingerprint(token))) {
        await rememberLibraryToken(token, storeId)
        return token
      }
    } catch {
      // Tabs opened before an extension reload may not have this content script.
    }
  }

  return undefined
}

export async function observeLibraryToken(token: unknown, storeId?: string) {
  if (token === null || token === undefined || token === '') {
    await clearLibraryToken(storeId)
    return false
  }

  const normalized = normalizeToken(token)
  if (!normalized) return false

  const rejectedHashes = new Set(
    await getRejectedLibraryTokenHashes(storeId),
  )
  if (rejectedHashes.has(await tokenFingerprint(normalized))) return false

  await rememberLibraryToken(normalized, storeId)
  return true
}

export async function resolveLibraryToken(storeId?: string) {
  const rejectedHashes = new Set(
    await getRejectedLibraryTokenHashes(storeId),
  )
  const tabToken = await readLibraryTokenFromTabs(
    storeId,
    rejectedHashes,
  )
  if (tabToken) return tabToken

  const cachedToken = await getCachedLibraryToken(storeId)
  if (!cachedToken) return undefined

  if (rejectedHashes.has(await tokenFingerprint(cachedToken))) {
    await clearLibraryToken(storeId, cachedToken)
    return undefined
  }

  return cachedToken
}

async function continueLibraryAuthentication(storeId?: string) {
  const state = await getLibraryAuthentication(storeId)
  if (!state) return undefined

  if (Date.now() - state.createdAt > AUTH_MAX_AGE_MS) {
    await closeLibraryAuthenticationTab(storeId)
    return { status: 'failed' } as const
  }

  let tabUrl: string | undefined
  let pendingTabUrl: string | undefined
  try {
    const tab = await browser.tabs.get(state.tabId)
    tabUrl = tab.url
    pendingTabUrl = tab.pendingUrl
  } catch {
    await clearLibraryAuthentication(storeId)
    return { status: 'failed' } as const
  }

  const hasAuthenticationUrl =
    isLibraryAuthenticationUrl(tabUrl) ||
    isLibraryAuthenticationUrl(pendingTabUrl)

  if (
    !hasAuthenticationUrl &&
    Date.now() - state.createdAt >= AUTH_INTERACTION_DELAY_MS
  ) {
    await clearLibraryAuthentication(storeId)
    return { status: 'failed' } as const
  }

  if (
    !state.activated &&
    Date.now() - state.createdAt >= AUTH_INTERACTION_DELAY_MS
  ) {
    try {
      await browser.tabs.update(state.tabId, { active: true })
      await rememberLibraryAuthentication(
        { ...state, activated: true },
        storeId,
      )
    } catch {
      await clearLibraryAuthentication(storeId)
      return { status: 'failed' } as const
    }
  }

  return { status: 'pending' } as const
}

async function createLibraryAuthentication(
  storeId?: string,
  windowId?: number,
): Promise<LibraryTokenResolution> {
  const existingAuthentication =
    await continueLibraryAuthentication(storeId)
  if (existingAuthentication) return existingAuthentication

  try {
    const cookieStoreId =
      import.meta.env.BROWSER === 'firefox' &&
      storeId &&
      storeId !== '__unresolved__'
        ? storeId
        : undefined
    const authTab = await browser.tabs.create({
      url: LIBRARY_LOGIN_URL,
      active: false,
      ...(typeof windowId === 'number' ? { windowId } : {}),
      ...(cookieStoreId ? { cookieStoreId } : {}),
    })

    if (typeof authTab.id !== 'number') {
      return { status: 'failed' }
    }

    await rememberLibraryAuthentication(
      {
        tabId: authTab.id,
        createdAt: Date.now(),
        activated: false,
      },
      storeId,
    )

    return { status: 'pending' }
  } catch {
    return { status: 'failed' }
  }
}

async function startLibraryAuthentication(
  storeId?: string,
  windowId?: number,
) {
  const key = storeKey(storeId)
  const currentAuthentication = authenticationStartPromises.get(key)
  if (currentAuthentication) return await currentAuthentication

  const authentication = createLibraryAuthentication(storeId, windowId)
  authenticationStartPromises.set(key, authentication)

  try {
    return await authentication
  } finally {
    if (authenticationStartPromises.get(key) === authentication) {
      authenticationStartPromises.delete(key)
    }
  }
}

export async function resolveOrStartLibraryAuthentication(
  storeId?: string,
  windowId?: number,
): Promise<LibraryTokenResolution> {
  const token = await resolveLibraryToken(storeId)
  if (token) {
    await closeLibraryAuthenticationTab(storeId)
    return { status: 'ready', token }
  }

  return await startLibraryAuthentication(storeId, windowId)
}
