// src/composables/useGrades.ts

import { ref } from 'vue'
import type { GradeItem, GradeQueryResult } from '@/types/grade'

export function useGrades() {
  const loading = ref(false)
  const error = ref<string>()
  const grades = ref<GradeItem[]>([])
  const fetchedAt = ref<number>()

  async function queryGrades(semester?: string) {
    loading.value = true
    error.value = undefined

    try {
      const result = await browser.runtime.sendMessage({
        type: 'RUC_GRADES_QUERY',
      }) as GradeQueryResult

      if (!result.ok) {
        error.value = result.error ?? '查询失败'
        grades.value = []
        return
      }

      grades.value = result.items
      fetchedAt.value = result.fetchedAt
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      grades.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    grades,
    fetchedAt,
    queryGrades,
  }
}