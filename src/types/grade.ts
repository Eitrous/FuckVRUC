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

export interface GradeSemesterSummary {
  semester: string
  totalCredit?: number
  totalWeightedGradePoint?: number
  averageGradePoint?: number
  raw?: unknown
}

export interface GradeQueryParams {
  semester?: string
}

export interface GradeQueryResult {
  ok: boolean
  items: GradeItem[]
  summaries?: GradeSemesterSummary[]
  raw?: unknown
  error?: string
  fetchedAt: number
}
