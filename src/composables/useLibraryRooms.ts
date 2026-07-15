import { ref } from 'vue'
import type {
  LibraryQueryErrorCode,
  LibraryReservationErrorCode,
  LibraryReservationSubmitParams,
  LibraryReservationSubmitResult,
  LibraryRoomPage,
  LibraryRoomQueryParams,
  LibraryRoomQueryResult,
  LibrarySeatEndTimesQueryParams,
  LibrarySeatEndTimesQueryResult,
  LibrarySeatList,
  LibrarySeatQueryParams,
  LibrarySeatQueryResult,
  LibrarySeatReservationDetailsQueryParams,
  LibrarySeatReservationDetailsQueryResult,
  LibraryTimeOption,
} from '@/types/library'

type LibrarySeatReservationDetails = Extract<
  LibrarySeatReservationDetailsQueryResult,
  { ok: true }
>['details']

type LibraryReservationReceipt = Extract<
  LibraryReservationSubmitResult,
  { ok: true }
>['receipt']

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
  const seatLoading = ref(false)
  const seatError = ref<string>()
  const seatErrorCode = ref<LibraryQueryErrorCode>()
  const seatList = ref<LibrarySeatList>()
  const seatFetchedAt = ref<number>()
  const reservationDetailsLoading = ref(false)
  const reservationDetailsError = ref<string>()
  const reservationDetailsErrorCode = ref<LibraryQueryErrorCode>()
  const reservationDetails = ref<LibrarySeatReservationDetails>()
  const reservationDetailsFetchedAt = ref<number>()
  const reservationEndTimesLoading = ref(false)
  const reservationEndTimesError = ref<string>()
  const reservationEndTimesErrorCode = ref<LibraryQueryErrorCode>()
  const reservationEndTimes = ref<LibraryTimeOption<number>[]>([])
  const reservationEndTimesFetchedAt = ref<number>()
  const reservationSubmitting = ref(false)
  const reservationError = ref<string>()
  const reservationErrorCode = ref<LibraryReservationErrorCode>()
  const reservationReceipt = ref<LibraryReservationReceipt>()
  const reservationFetchedAt = ref<number>()
  let requestVersion = 0
  let seatRequestVersion = 0
  let reservationDetailsRequestVersion = 0
  let reservationEndTimesRequestVersion = 0
  let reservationSubmitRequestVersion = 0

  function clearLibraryReservation() {
    reservationDetailsRequestVersion += 1
    reservationEndTimesRequestVersion += 1
    reservationSubmitRequestVersion += 1
    reservationDetailsLoading.value = false
    reservationDetailsError.value = undefined
    reservationDetailsErrorCode.value = undefined
    reservationDetails.value = undefined
    reservationDetailsFetchedAt.value = undefined
    reservationEndTimesLoading.value = false
    reservationEndTimesError.value = undefined
    reservationEndTimesErrorCode.value = undefined
    reservationEndTimes.value = []
    reservationEndTimesFetchedAt.value = undefined
    reservationSubmitting.value = false
    reservationError.value = undefined
    reservationErrorCode.value = undefined
    reservationReceipt.value = undefined
    reservationFetchedAt.value = undefined
  }

  function clearLibrarySeats() {
    seatRequestVersion += 1
    seatLoading.value = false
    seatError.value = undefined
    seatErrorCode.value = undefined
    seatList.value = undefined
    seatFetchedAt.value = undefined
    clearLibraryReservation()
  }

  function clearLibraryRooms() {
    requestVersion += 1
    loading.value = false
    error.value = undefined
    errorCode.value = undefined
    page.value = undefined
    fetchedAt.value = undefined
    clearLibrarySeats()
  }

  async function queryLibraryRooms(params: LibraryRoomQueryParams) {
    if (loading.value) return

    clearLibrarySeats()
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

  async function queryLibrarySeats(params: LibrarySeatQueryParams) {
    clearLibraryReservation()
    const currentRequest = ++seatRequestVersion
    seatLoading.value = true
    seatError.value = undefined
    seatErrorCode.value = undefined
    seatList.value = undefined
    seatFetchedAt.value = undefined

    try {
      const authenticationDeadline =
        Date.now() + LIBRARY_AUTH_WAIT_TIMEOUT_MS

      while (currentRequest === seatRequestVersion) {
        const result = (await browser.runtime.sendMessage({
          type: 'RUC_LIBRARY_SEATS_QUERY',
          params,
        })) as LibrarySeatQueryResult | undefined

        if (currentRequest !== seatRequestVersion) return

        if (!result || typeof result.ok !== 'boolean') {
          seatError.value = '图书馆座位详情返回了无效结果。'
          seatErrorCode.value = 'INVALID_RESPONSE'
          return
        }

        if (!result.ok && result.errorCode === 'AUTH_PENDING') {
          const remainingTime = authenticationDeadline - Date.now()
          if (remainingTime <= 0) {
            seatError.value =
              '图书馆自动登录等待超时，请完成已打开页面中的认证后重试。'
            seatErrorCode.value = 'AUTH_REQUIRED'
            return
          }

          await waitFor(
            Math.min(LIBRARY_AUTH_POLL_INTERVAL_MS, remainingTime),
          )
          continue
        }

        if (!result.ok) {
          seatError.value = result.error || '图书馆座位详情查询失败。'
          seatErrorCode.value = result.errorCode
          return
        }

        seatList.value = result.list
        seatFetchedAt.value = result.fetchedAt
        return
      }
    } catch (caught) {
      if (currentRequest !== seatRequestVersion) return

      seatError.value =
        caught instanceof Error
          ? caught.message
          : '图书馆座位详情查询失败。'
      seatErrorCode.value = 'API_ERROR'
      seatList.value = undefined
      seatFetchedAt.value = undefined
    } finally {
      if (currentRequest === seatRequestVersion) {
        seatLoading.value = false
      }
    }
  }

  async function queryLibrarySeatReservationDetails(
    params: LibrarySeatReservationDetailsQueryParams,
  ) {
    clearLibraryReservation()
    const currentRequest = ++reservationDetailsRequestVersion
    reservationDetailsLoading.value = true

    try {
      const authenticationDeadline =
        Date.now() + LIBRARY_AUTH_WAIT_TIMEOUT_MS

      while (currentRequest === reservationDetailsRequestVersion) {
        const result = (await browser.runtime.sendMessage({
          type: 'RUC_LIBRARY_SEAT_RESERVATION_OPTIONS_QUERY',
          params,
        })) as LibrarySeatReservationDetailsQueryResult | undefined

        if (currentRequest !== reservationDetailsRequestVersion) return

        if (!result || typeof result.ok !== 'boolean') {
          reservationDetailsError.value =
            '图书馆座位预约信息返回了无效结果。'
          reservationDetailsErrorCode.value = 'INVALID_RESPONSE'
          return
        }

        if (!result.ok && result.errorCode === 'AUTH_PENDING') {
          const remainingTime = authenticationDeadline - Date.now()
          if (remainingTime <= 0) {
            reservationDetailsError.value =
              '图书馆自动登录等待超时，请完成已打开页面中的认证后重试。'
            reservationDetailsErrorCode.value = 'AUTH_REQUIRED'
            return
          }

          await waitFor(
            Math.min(LIBRARY_AUTH_POLL_INTERVAL_MS, remainingTime),
          )
          continue
        }

        if (!result.ok) {
          reservationDetailsError.value =
            result.error || '图书馆座位预约信息查询失败。'
          reservationDetailsErrorCode.value = result.errorCode
          return
        }

        reservationDetails.value = result.details
        reservationDetailsFetchedAt.value = result.fetchedAt
        return
      }
    } catch (caught) {
      if (currentRequest !== reservationDetailsRequestVersion) return

      reservationDetailsError.value =
        caught instanceof Error
          ? caught.message
          : '图书馆座位预约信息查询失败。'
      reservationDetailsErrorCode.value = 'API_ERROR'
      reservationDetails.value = undefined
      reservationDetailsFetchedAt.value = undefined
    } finally {
      if (currentRequest === reservationDetailsRequestVersion) {
        reservationDetailsLoading.value = false
      }
    }
  }

  async function queryLibrarySeatEndTimes(
    params: LibrarySeatEndTimesQueryParams,
  ) {
    const currentRequest = ++reservationEndTimesRequestVersion
    reservationEndTimesLoading.value = true
    reservationEndTimesError.value = undefined
    reservationEndTimesErrorCode.value = undefined
    reservationEndTimes.value = []
    reservationEndTimesFetchedAt.value = undefined

    try {
      const authenticationDeadline =
        Date.now() + LIBRARY_AUTH_WAIT_TIMEOUT_MS

      while (currentRequest === reservationEndTimesRequestVersion) {
        const result = (await browser.runtime.sendMessage({
          type: 'RUC_LIBRARY_SEAT_END_TIMES_QUERY',
          params,
        })) as LibrarySeatEndTimesQueryResult | undefined

        if (currentRequest !== reservationEndTimesRequestVersion) return

        if (!result || typeof result.ok !== 'boolean') {
          reservationEndTimesError.value =
            '图书馆预约结束时间返回了无效结果。'
          reservationEndTimesErrorCode.value = 'INVALID_RESPONSE'
          return
        }

        if (!result.ok && result.errorCode === 'AUTH_PENDING') {
          const remainingTime = authenticationDeadline - Date.now()
          if (remainingTime <= 0) {
            reservationEndTimesError.value =
              '图书馆自动登录等待超时，请完成已打开页面中的认证后重试。'
            reservationEndTimesErrorCode.value = 'AUTH_REQUIRED'
            return
          }

          await waitFor(
            Math.min(LIBRARY_AUTH_POLL_INTERVAL_MS, remainingTime),
          )
          continue
        }

        if (!result.ok) {
          reservationEndTimesError.value =
            result.error || '图书馆预约结束时间查询失败。'
          reservationEndTimesErrorCode.value = result.errorCode
          return
        }

        reservationEndTimes.value = result.options
        reservationEndTimesFetchedAt.value = result.fetchedAt
        return
      }
    } catch (caught) {
      if (currentRequest !== reservationEndTimesRequestVersion) return

      reservationEndTimesError.value =
        caught instanceof Error
          ? caught.message
          : '图书馆预约结束时间查询失败。'
      reservationEndTimesErrorCode.value = 'API_ERROR'
      reservationEndTimes.value = []
      reservationEndTimesFetchedAt.value = undefined
    } finally {
      if (currentRequest === reservationEndTimesRequestVersion) {
        reservationEndTimesLoading.value = false
      }
    }
  }

  async function submitLibraryReservation(
    params: LibraryReservationSubmitParams,
  ) {
    if (reservationSubmitting.value) return

    const currentRequest = ++reservationSubmitRequestVersion
    reservationSubmitting.value = true
    reservationError.value = undefined
    reservationErrorCode.value = undefined
    reservationReceipt.value = undefined
    reservationFetchedAt.value = undefined

    try {
      const result = (await browser.runtime.sendMessage({
        type: 'RUC_LIBRARY_RESERVATION_SUBMIT',
        params,
      })) as LibraryReservationSubmitResult | undefined

      if (currentRequest !== reservationSubmitRequestVersion) return

      if (!result || typeof result.ok !== 'boolean') {
        reservationError.value =
          '预约结果无法确认，请先到图书馆系统核对预约记录。'
        reservationErrorCode.value = 'RESULT_UNCERTAIN'
        return
      }

      if (!result.ok) {
        reservationError.value = result.error || '图书馆座位预约失败。'
        reservationErrorCode.value = result.errorCode
        reservationFetchedAt.value = result.fetchedAt
        return
      }

      reservationReceipt.value = result.receipt
      reservationFetchedAt.value = result.fetchedAt
    } catch {
      if (currentRequest !== reservationSubmitRequestVersion) return

      reservationError.value =
        '预约结果无法确认，请先到图书馆系统核对预约记录。'
      reservationErrorCode.value = 'RESULT_UNCERTAIN'
      reservationReceipt.value = undefined
      reservationFetchedAt.value = Date.now()
    } finally {
      if (currentRequest === reservationSubmitRequestVersion) {
        reservationSubmitting.value = false
      }
    }
  }

  return {
    loading,
    error,
    errorCode,
    page,
    fetchedAt,
    seatLoading,
    seatError,
    seatErrorCode,
    seatList,
    seatFetchedAt,
    reservationDetailsLoading,
    reservationDetailsError,
    reservationDetailsErrorCode,
    reservationDetails,
    reservationDetailsFetchedAt,
    reservationEndTimesLoading,
    reservationEndTimesError,
    reservationEndTimesErrorCode,
    reservationEndTimes,
    reservationEndTimesFetchedAt,
    reservationSubmitting,
    reservationError,
    reservationErrorCode,
    reservationReceipt,
    reservationFetchedAt,
    queryLibraryRooms,
    clearLibraryRooms,
    queryLibrarySeats,
    clearLibrarySeats,
    queryLibrarySeatReservationDetails,
    queryLibrarySeatEndTimes,
    submitLibraryReservation,
    clearLibraryReservation,
  }
}
