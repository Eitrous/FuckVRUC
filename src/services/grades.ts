// src/services/grades.ts
import type { GradeItem, GradeQueryResult } from '@/types/grade'

const GRADE_API_URL = 'https://jw.ruc.edu.cn/resService/jwxtpt/v1/xsd/cjgl_xsxdsq/findKccjList?resourceCode=XSMH0526&apiCode=jw.xsd.xsdInfo.controller.CjglKccjckController.findKccjList'
const OAUTH_URL =
  'https://v.ruc.edu.cn/oauth2/authorize?response_type=code&scope=all&state=yourstate&client_id=5d25ae5b90f4d14aa601ede8.ruc&redirect_uri=https://jw.ruc.edu.cn/'

const OAUTH_REDIRECT_HOST = 'https://jw.ruc.edu.cn'


async function getTokenCookie(): Promise<string | undefined> {
  // 先看看有没有已存在的 token Cookie
  const existing = await browser.cookies.get({
    url: OAUTH_REDIRECT_HOST,
    name: 'token',
  })
  if (existing?.value) return existing.value

  // 用 fetch 跟随 OAuth 重定向（不需要开标签页）
  const res = await fetch(OAUTH_URL, {
    credentials: 'include',
    redirect: 'follow',
  })

  console.log('[debug] OAuth final URL:', res.url)
  console.log('[debug] OAuth status:', res.status)

  // 重定向完成后读取 cookie
  const cookie = await browser.cookies.get({
    url: OAUTH_REDIRECT_HOST,
    name: 'token',
  })

  return cookie?.value
}

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