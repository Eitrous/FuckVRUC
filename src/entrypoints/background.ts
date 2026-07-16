import { fetchGrades } from '@/services/grade'
import {
  getCookieStoreIdForTab,
  isJwSessionCookie,
  observeJwToken,
  reconcileJwSession,
} from '@/services/jwAuth'
import { fetchSchedule } from '@/services/schedule'
import { getLoginStatus, getUserInfo } from '@/services/user'
import {
  fetchLibraryReservationRecords,
  fetchLibraryRooms,
  fetchLibrarySeatEndTimes,
  fetchLibrarySeatReservationDetails,
  fetchLibrarySeats,
  submitLibraryReservation,
} from '@/services/library'
import { observeLibraryToken } from '@/services/libraryAuth'

function isJwSender(url?: string) {
  if (!url) return false

  try {
    return new URL(url).origin === 'https://jw.ruc.edu.cn'
  } catch {
    return false
  }
}

function isLibrarySender(url?: string) {
  if (!url) return false

  try {
    return new URL(url).origin === 'https://zwlib.ruc.edu.cn'
  } catch {
    return false
  }
}

export default defineBackground(() => {
  browser.cookies.onChanged.addListener((changeInfo) => {
    if (isJwSessionCookie(changeInfo.cookie)) {
      void reconcileJwSession(changeInfo.cookie.storeId)
    }
  })

  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type === 'RUC_JW_TOKEN_OBSERVED') {
      const senderUrl = sender.url ?? sender.tab?.url

      if (!isJwSender(senderUrl)) {
        return false
      }

      const storeId = await getCookieStoreIdForTab(sender.tab?.id)
      return await observeJwToken(message.token, storeId)
    }

    if (message?.type === 'RUC_LIBRARY_TOKEN_OBSERVED') {
      const senderUrl = sender.url ?? sender.tab?.url

      if (!isLibrarySender(senderUrl)) {
        return false
      }

      const storeId = await getCookieStoreIdForTab(sender.tab?.id)
      return await observeLibraryToken(message.token, storeId)
    }

    const storeId = await getCookieStoreIdForTab(sender.tab?.id)

    if (message?.type === 'RUC_LOGIN_STATUS_QUERY') {
      return await getLoginStatus(storeId)
    }
    if (message?.type === 'RUC_GRADES_QUERY') {
      return await fetchGrades(storeId)
    }
    if (message?.type === 'RUC_USER_INFO_QUERY') {
      return await getUserInfo(storeId)
    }
    if (message?.type === 'RUC_SCHEDULE_QUERY') {
      return await fetchSchedule(message.semester, storeId)
    }
    if (message?.type === 'RUC_LIBRARY_ROOMS_QUERY') {
      return await fetchLibraryRooms(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_LIBRARY_SEATS_QUERY') {
      return await fetchLibrarySeats(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_LIBRARY_RESERVATION_RECORDS_QUERY') {
      return await fetchLibraryReservationRecords(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_LIBRARY_SEAT_RESERVATION_OPTIONS_QUERY') {
      return await fetchLibrarySeatReservationDetails(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_LIBRARY_SEAT_END_TIMES_QUERY') {
      return await fetchLibrarySeatEndTimes(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_LIBRARY_RESERVATION_SUBMIT') {
      return await submitLibraryReservation(
        message.params,
        storeId,
        sender.tab?.windowId,
      )
    }
    if (message?.type === 'RUC_DASHBOARD_OPEN') {
      return browser.tabs.create({
        url: browser.runtime.getURL('/dashboard.html'),
      })
    }
    return null
  })
})
