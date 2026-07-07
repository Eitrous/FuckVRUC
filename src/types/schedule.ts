
export interface ScheduleItem {
  courseName: string
  courseCode?: string
  semester?: string
  credit?: number
  teacher?: string
  time?: number[] // 第几节课，1-14 对应第 1-14 节
  weekday?: number[] // 上课星期几，1-7 对应周一到周日
  weeks?: number[] // 上课周次
  time_note?: 0 | 1 | 2 // 0=单双周，1=单周，2=双周
  location?: string
  note?: string
  raw?: unknown
}

export interface ScheduleQueryResult {
  ok: boolean
  items: ScheduleItem[]
  raw?: unknown
  error?: string
  fetchedAt: number
}
