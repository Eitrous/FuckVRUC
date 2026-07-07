import { ref } from 'vue'
import type { ScheduleItem, ScheduleQueryResult } from '@/types/schedule'

export function useSchedules() {
  const schedule_queryLoading = ref(false)
  const schedule_error = ref<string>()
  const schedules = ref<ScheduleItem[]>([])
  const schedule_fetchedAt = ref<number>()

  async function querySchedules(semester: string) {
    schedule_queryLoading.value = true
    schedule_error.value = undefined

    try {
      const result = await browser.runtime.sendMessage({
        type: 'RUC_SCHEDULE_QUERY',
        semester,
      }) as ScheduleQueryResult
      
      if (!result.ok) {
        schedule_error.value = result.error ?? '查询失败'
        schedules.value = []
        return
      }
      console.log('querySchedules result:', result)

      schedules.value = result.items
      schedule_fetchedAt.value = result.fetchedAt
    } catch (err) {
      schedule_error.value = err instanceof Error ? err.message : String(err)
      schedules.value = []
    } finally {
      schedule_queryLoading.value = false
    }
  }

  return {
    schedule_queryLoading,
    schedule_error,
    schedules,
    schedule_fetchedAt,
    querySchedules,
  }
}