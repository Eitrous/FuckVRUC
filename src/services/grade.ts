// src/services/grades.ts
import type { GradeItem, GradeQueryResult, GradeSemesterSummary } from '@/types/grade'
import { getTokenCookie } from '@/utils/getTokenCookie'

const GRADE_API_URL = 'https://jw.ruc.edu.cn/resService/jwxtpt/v1/xsd/cjgl_xsxdsq/findKccjList?resourceCode=XSMH0526&apiCode=jw.xsd.xsdInfo.controller.CjglKccjckController.findKccjList'

export async function fetchGrades(): Promise<GradeQueryResult> {
  try {
    const token = await getTokenCookie()

    if (!token) {
      return {
        ok: false,
        items: [],
        error: '没有找到 Token。请先登录微人大 (v.ruc.edu.cn) 后再查询。',
        fetchedAt: Date.now(),
      }
    }

    const res = await fetch(GRADE_API_URL, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        Token: token,
      },
      body: JSON.stringify({"pyfa007id":"1","jczy013id":[],"fxjczy005id":"","cjckflag":"xsdcjck","kthList":["2526221001277035","2526221168145001","2526221001580027","2526221058844009","2526221037498008","2526221116344013","2526221160944012","2526221021255001","2526221024154025"],"page":{"pageIndex":1,"pageSize":30,"orderBy":"[{\"field\":\"jczy013id\",\"sortType\":\"asc\"}]","conditions":"QZDATASOFTJddJJVIJY29uZGl0aW9uR3JvdXAlMjIlM0ElNUIlN0IlMjJsaW5rJTIyJTNBJTIyYW5kJTIyJTJDJTIyY29uZGl0aW9uJTIyJTNBJTVCJTVEJTdEyTTECTTE"}})
    })

    const text = await res.text()

    if (!res.ok) {
        return {
        ok: false,
        items: [],
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        fetchedAt: Date.now(),
        }
    }

    let raw: any
    try {
      raw = JSON.parse(text)
    } catch (err) {
      return {
        ok: false,
        items: [],
        error: `Failed to parse response JSON: ${err instanceof Error ? err.message : String(err)}`,
        fetchedAt: Date.now(),
      }
    }

    const normalized = normalizeGrades(raw)

    return {
        ok: true,
        raw,
        items: normalized.items,
        summaries: normalized.summaries,
        fetchedAt: Date.now(),
    }
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: Date.now(),
    }
  }
}

function normalizeGrades(raw: any): {
  items: GradeItem[]
  summaries: GradeSemesterSummary[]
} {

  const list = raw?.data ?? []

  if (!Array.isArray(list)) return { items: [], summaries: [] }

  return list.reduce<{
    items: GradeItem[]
    summaries: GradeSemesterSummary[]
  }>((normalized, item: any) => {
    if (isSummaryRow(item)) {
      normalized.summaries.push(normalizeGradeSummary(item))
      return normalized
    }

    normalized.items.push({
      courseName: item.kcname ?? '',
      courseCode: item.kcbh,
      semester: normalizeSemester(item.xnxq),
      credit: parseNumber(item.xf),
      score: String(item.zcj ?? ''),
      gradePoint: parseNumber(item.jd) !== undefined && parseNumber(item.xf) !== undefined && parseNumber(item.xf) > 0 ? parseNumber(item.jd) / parseNumber(item.xf) : undefined,
      courseType: item.kclbname ?? '-',
      raw: item,
    })

    return normalized
  }, { items: [], summaries: [] })
}

function normalizeGradeSummary(item: any): GradeSemesterSummary {
  const totalCredit = parseNumber(item.sumxf)
  const totalWeightedGradePoint = parseNumber(item.sumxfjd)
  const averageGradePoint =
    totalCredit !== undefined &&
    totalCredit > 0 &&
    totalWeightedGradePoint !== undefined
      ? totalWeightedGradePoint / totalCredit
      : undefined

  return {
    semester: normalizeSemester(item.xnxq),
    totalCredit,
    totalWeightedGradePoint,
    averageGradePoint,
    raw: item,
  }
}

function isSummaryRow(item: any) {
  return parseNumber(item?.sumxf) !== undefined || parseNumber(item?.sumxfjd) !== undefined
}

function normalizeSemester(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim()

  return '未知学期'
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && !value.trim()) return undefined

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}
