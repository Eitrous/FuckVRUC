import { ref } from 'vue'
import type { ScheduleItem, ScheduleQueryResult } from '@/types/schedule'

type CachedSchedule = {
  semester: string
  items: ScheduleItem[]
  fetchedAt: number
}

function scheduleCacheKey(semester: string) {
  return `rucScheduleCache:${semester}`
}

function isCachedSchedule(value: unknown, semester: string): value is CachedSchedule {
  if (!value || typeof value !== 'object') return false

  const cached = value as Partial<CachedSchedule>

  return (
    cached.semester === semester &&
    Array.isArray(cached.items) &&
    typeof cached.fetchedAt === 'number'
  )
}

export function useSchedules() {
  const schedule_queryLoading = ref(false)
  const schedule_error = ref<string>()
  const schedules = ref<ScheduleItem[]>([])
  const schedule_fetchedAt = ref<number>()

  function clearScheduleState() {
    schedules.value = []
    schedule_fetchedAt.value = undefined
    schedule_error.value = undefined
  }

  async function loadCachedSchedule(semester: string) {
    try {
      const key = scheduleCacheKey(semester)
      const cached = (await browser.storage.local.get(key))[key]

      if (!isCachedSchedule(cached, semester)) {
        clearScheduleState()
        return false
      }

      schedules.value = cached.items
      schedule_fetchedAt.value = cached.fetchedAt
      schedule_error.value = undefined

      return true
    } catch (err) {
      clearScheduleState()
      schedule_error.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

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
        return
      }
      console.log('querySchedules result:', result)

      schedules.value = result.items
      schedule_fetchedAt.value = result.fetchedAt
      await browser.storage.local.set({
        [scheduleCacheKey(semester)]: {
          semester,
          items: result.items,
          fetchedAt: result.fetchedAt,
        } satisfies CachedSchedule,
      })
    } catch (err) {
      schedule_error.value = err instanceof Error ? err.message : String(err)
    } finally {
      schedule_queryLoading.value = false
    }
  }

  return {
    schedule_queryLoading,
    schedule_error,
    schedules,
    schedule_fetchedAt,
    loadCachedSchedule,
    querySchedules,
  }
}
