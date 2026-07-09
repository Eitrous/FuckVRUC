const OAUTH_URL = 'https://v.ruc.edu.cn/oauth2/authorize?response_type=code&scope=all&state=yourstate&client_id=5d25ae5b90f4d14aa601ede8.ruc&redirect_uri=https://jw.ruc.edu.cn/'
const OAUTH_REDIRECT_HOST = 'https://jw.ruc.edu.cn'
const TOKEN_COOKIE_NAME = 'token'
const TOKEN_COOKIE_URLS = [
  'https://jw.ruc.edu.cn/resService/',
  'https://jw.ruc.edu.cn/Njw2017/index.html',
  OAUTH_REDIRECT_HOST,
]

type TokenCookie = {
  name: string
  value: string
  domain: string
  path: string
  expirationDate?: number
}

function isTokenCookie(value: unknown): value is TokenCookie {
  if (!value || typeof value !== 'object') return false

  const cookie = value as Partial<TokenCookie>

  return (
    typeof cookie.name === 'string' &&
    typeof cookie.value === 'string' &&
    typeof cookie.domain === 'string' &&
    typeof cookie.path === 'string'
  )
}

function isJwTokenCookie(cookie: TokenCookie) {
  if (cookie.name !== TOKEN_COOKIE_NAME || !cookie.value) return false

  const domain = cookie.domain.replace(/^\./, '')

  return domain === 'jw.ruc.edu.cn' || domain === 'ruc.edu.cn'
}

function isExpiredCookie(cookie: TokenCookie) {
  return (
    typeof cookie.expirationDate === 'number' &&
    cookie.expirationDate * 1000 <= Date.now()
  )
}

function tokenCookiePriority(cookie: TokenCookie) {
  if (cookie.path.startsWith('/resService')) return 4
  if (cookie.path === '/') return 3
  if (cookie.path.startsWith('/Njw2017')) return 2

  return 1
}

function pickTokenCookie(cookies: unknown[]) {
  return cookies
    .filter(isTokenCookie)
    .filter((cookie) => isJwTokenCookie(cookie) && !isExpiredCookie(cookie))
    .sort((a, b) => tokenCookiePriority(b) - tokenCookiePriority(a))[0]
}

export async function getExistingTokenCookie(): Promise<string | undefined> {
  const directCookies = await Promise.all(
    TOKEN_COOKIE_URLS.map((url) => {
      return browser.cookies.get({
        url,
        name: TOKEN_COOKIE_NAME,
      })
    }),
  )
  const allTokenCookies = await browser.cookies.getAll({
    name: TOKEN_COOKIE_NAME,
  })
  const cookie = pickTokenCookie([
    ...directCookies,
    ...allTokenCookies,
  ])

  return cookie?.value
}

export async function getTokenCookie(): Promise<string | undefined> {
  // 先看看有没有已存在的 token Cookie
  const existing = await getExistingTokenCookie()
  if (existing) return existing

  try {
    // 用 fetch 跟随 OAuth 重定向（不需要开标签页）
    const res = await fetch(OAUTH_URL, {
      credentials: 'include',
      redirect: 'follow',
    })

    console.log('[debug] OAuth final URL:', res.url)
    console.log('[debug] OAuth status:', res.status)
  } catch (err) {
    console.warn('[debug] OAuth token refresh failed:', err)
  }

  // 重定向完成后读取 cookie
  return await getExistingTokenCookie()
}
