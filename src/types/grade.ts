// src/types/grade.ts

export interface GradeItem {
  courseName: string
  courseCode?: string
  semester?: string
  credit?: number
  score?: string
  gradePoint?: number
  courseType?: string
  raw?: unknown
}

export interface GradeQueryParams {
  semester?: string
}

export interface GradeQueryResult {
  ok: boolean
  items: GradeItem[]
  raw?: unknown
  error?: string
  fetchedAt: number
}