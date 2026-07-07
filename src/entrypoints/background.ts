import { fetchGrades } from '@/services/grade'
import { fetchSchedule } from '@/services/schedule'
import { getLoginStatus, getUserInfo } from '@/services/user'

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message) => {
    if (message?.type === 'RUC_LOGIN_STATUS_QUERY') {
      return await getLoginStatus()
    }
    if (message?.type === 'RUC_GRADES_QUERY') {
      return await fetchGrades()
    }
    if (message?.type === 'RUC_USER_INFO_QUERY') {
      return await getUserInfo()
    }
    if (message?.type === 'RUC_SCHEDULE_QUERY') {
      return await fetchSchedule(message.semester)
    }
    if (message?.type === 'RUC_DASHBOARD_OPEN') {
      return browser.tabs.create({
        url: browser.runtime.getURL('/dashboard.html'),
      })
    }
    return null
  })
})
