const OAUTH_URL = 'https://v.ruc.edu.cn/oauth2/authorize?response_type=code&scope=all&state=yourstate&client_id=5d25ae5b90f4d14aa601ede8.ruc&redirect_uri=https://jw.ruc.edu.cn/'
const OAUTH_REDIRECT_HOST = 'https://jw.ruc.edu.cn'

export async function getExistingTokenCookie(): Promise<string | undefined> {
  const cookie = await browser.cookies.get({
    url: OAUTH_REDIRECT_HOST,
    name: 'token',
  })

  return cookie?.value
}

export async function getTokenCookie(): Promise<string | undefined> {
  // 先看看有没有已存在的 token Cookie
  const existing = await getExistingTokenCookie()
  if (existing) return existing

  // 用 fetch 跟随 OAuth 重定向（不需要开标签页）
  const res = await fetch(OAUTH_URL, {
    credentials: 'include',
    redirect: 'follow',
  })

  console.log('[debug] OAuth final URL:', res.url)
  console.log('[debug] OAuth status:', res.status)

  // 重定向完成后读取 cookie
  return await getExistingTokenCookie()
}
