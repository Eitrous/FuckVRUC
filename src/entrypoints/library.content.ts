const TOKEN_READ_MESSAGE = 'RUC_LIBRARY_TOKEN_READ'
const TOKEN_OBSERVED_MESSAGE = 'RUC_LIBRARY_TOKEN_OBSERVED'
const TOKEN_POLL_INTERVAL_MS = 1_500
const TOKEN_STORAGE_KEYS = ['jsq_p-token', 'token'] as const

export default defineContentScript({
  matches: ['https://zwlib.ruc.edu.cn/*'],
  main(ctx) {
    let lastToken: string | null = null
    let hasObservedToken = false

    function readLibraryToken() {
      try {
        for (const key of TOKEN_STORAGE_KEYS) {
          const token = sessionStorage.getItem(key)?.trim()
          if (token) return token
        }

        return null
      } catch {
        return null
      }
    }

    async function reportLibraryToken(force = false) {
      const token = readLibraryToken()

      if (!force && token === lastToken) return

      const shouldReport = Boolean(token) || hasObservedToken
      lastToken = token
      if (token) hasObservedToken = true
      if (!shouldReport) return

      try {
        await browser.runtime.sendMessage({
          type: TOKEN_OBSERVED_MESSAGE,
          token,
        })
      } catch {
        // The extension may have been reloaded while this tab stayed open.
      }
    }

    const handleMessage = (message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        (message as { type?: unknown }).type === TOKEN_READ_MESSAGE
      ) {
        return Promise.resolve({ token: readLibraryToken() })
      }

      return undefined
    }
    const reportWhenVisible = () => {
      if (!document.hidden) void reportLibraryToken()
    }
    const pollTimer = window.setInterval(
      () => void reportLibraryToken(),
      TOKEN_POLL_INTERVAL_MS,
    )

    browser.runtime.onMessage.addListener(handleMessage)
    window.addEventListener('focus', reportWhenVisible)
    window.addEventListener('pageshow', reportWhenVisible)
    document.addEventListener('visibilitychange', reportWhenVisible)

    ctx.onInvalidated(() => {
      window.clearInterval(pollTimer)
      browser.runtime.onMessage.removeListener(handleMessage)
      window.removeEventListener('focus', reportWhenVisible)
      window.removeEventListener('pageshow', reportWhenVisible)
      document.removeEventListener('visibilitychange', reportWhenVisible)
    })

    lastToken = readLibraryToken()
    if (lastToken) hasObservedToken = true
    void reportLibraryToken(true)
  },
})
