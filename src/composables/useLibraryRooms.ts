import { ref } from 'vue'
import type {
  LibraryQueryErrorCode,
  LibraryRoomPage,
  LibraryRoomQueryParams,
  LibraryRoomQueryResult,
} from '@/types/library'

const LIBRARY_AUTH_POLL_INTERVAL_MS = 1_000
const LIBRARY_AUTH_WAIT_TIMEOUT_MS = 120_000

function waitFor(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

export function useLibraryRooms() {
  const loading = ref(false)
  const error = ref<string>()
  const errorCode = ref<LibraryQueryErrorCode>()
  const page = ref<LibraryRoomPage>()
  const fetchedAt = ref<number>()
  let requestVersion = 0

  function clearLibraryRooms() {
    requestVersion += 1
    loading.value = false
    error.value = undefined
    errorCode.value = undefined
    page.value = undefined
    fetchedAt.value = undefined
  }

  async function queryLibraryRooms(params: LibraryRoomQueryParams) {
    if (loading.value) return

    const currentRequest = ++requestVersion
    loading.value = true
    error.value = undefined
    errorCode.value = undefined
    page.value = undefined
    fetchedAt.value = undefined

    try {
      const authenticationDeadline =
        Date.now() + LIBRARY_AUTH_WAIT_TIMEOUT_MS

      while (currentRequest === requestVersion) {
        const result = (await browser.runtime.sendMessage({
          type: 'RUC_LIBRARY_ROOMS_QUERY',
          params,
        })) as LibraryRoomQueryResult | undefined

        if (currentRequest !== requestVersion) return

        if (!result || typeof result.ok !== 'boolean') {
          error.value = '图书馆查询返回了无效结果。'
          errorCode.value = 'INVALID_RESPONSE'
          return
        }

        if (!result.ok && result.errorCode === 'AUTH_PENDING') {
          const remainingTime = authenticationDeadline - Date.now()
          if (remainingTime <= 0) {
            error.value =
              '图书馆自动登录等待超时，请完成已打开页面中的认证后重试。'
            errorCode.value = 'AUTH_REQUIRED'
            return
          }

          await waitFor(
            Math.min(LIBRARY_AUTH_POLL_INTERVAL_MS, remainingTime),
          )
          continue
        }

        if (!result.ok) {
          error.value = result.error || '图书馆余座查询失败。'
          errorCode.value = result.errorCode
          return
        }

        page.value = result.page
        fetchedAt.value = result.fetchedAt
        return
      }
    } catch (caught) {
      if (currentRequest !== requestVersion) return

      error.value =
        caught instanceof Error
          ? caught.message
          : '图书馆余座查询失败。'
      errorCode.value = 'API_ERROR'
      page.value = undefined
      fetchedAt.value = undefined
    } finally {
      if (currentRequest === requestVersion) {
        loading.value = false
      }
    }
  }

  return {
    loading,
    error,
    errorCode,
    page,
    fetchedAt,
    queryLibraryRooms,
    clearLibraryRooms,
  }
}
