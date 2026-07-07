// src/services/grades.ts
import type { GradeItem, GradeQueryResult } from '@/types/grade'
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

    return {
        ok: true,
        raw,
        items: normalizeGrades(raw),
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

function normalizeGrades(raw: any): GradeItem[] {

  const list = raw?.data ?? []

  if (!Array.isArray(list)) return []

  return list.map((item: any) => ({
    courseName: item.kcname ?? '',
    courseCode: item.kcbh,
    semester: item.xnxq,
    credit: Number(item.xf ?? 0) || undefined,
    score: String(item.zcj ?? ''),
    gradePoint: Number(item.jd ?? 0) || undefined,
    courseType: item.kclbname ?? '-',
    raw: item,
  }))
}