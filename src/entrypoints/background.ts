import { fetchGrades } from '@/services/grade'
import { fetchSchedule } from '@/services/schedule'

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message) => {
    if (message?.type === 'RUC_GRADES_QUERY') {
      return await fetchGrades()
    }
    if (message?.type === 'RUC_SCHEDULE_QUERY') {
      return await fetchSchedule(message.semester)
    }
    return null
  })
})