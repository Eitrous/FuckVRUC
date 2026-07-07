// src/composables/useGrades.ts
import { ref } from 'vue'
import type { GradeItem, GradeQueryResult, GradeSemesterSummary } from '@/types/grade'

export function useGrades() {
  const loading = ref(false)
  const error = ref<string>()
  const grades = ref<GradeItem[]>([])
  const gradeSummaries = ref<GradeSemesterSummary[]>([])
  const fetchedAt = ref<number>()

  async function queryGrades() {
    loading.value = true
    error.value = undefined

    try {
      const result = await browser.runtime.sendMessage({
        type: 'RUC_GRADES_QUERY',
      }) as GradeQueryResult

      if (!result.ok) {
        error.value = result.error ?? '查询失败'
        grades.value = []
        gradeSummaries.value = []
        return
      }

      grades.value = result.items
      gradeSummaries.value = result.summaries ?? []
      fetchedAt.value = result.fetchedAt
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      grades.value = []
      gradeSummaries.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    grades,
    gradeSummaries,
    fetchedAt,
    queryGrades,
  }
}
