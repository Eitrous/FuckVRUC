// src/services/schedule.ts
import { getTokenCookie } from "@/utils/getTokenCookie";
import type { ScheduleItem, ScheduleQueryResult } from "@/types/schedule";

const SCHEDULE_API_URL =
  "https://jw.ruc.edu.cn/resService/jwxtpt/v1/jczy/userIndex/findKbStudentRmdx?resourceCode=GRZX01&apiCode=jwPublic.controller.UserIndexController.findKbStudentRmdx";

export async function fetchSchedule(
  semester: string,
): Promise<ScheduleQueryResult> {
  try {
    const token = await getTokenCookie();

    if (!token) {
      return {
        ok: false,
        items: [],
        error: "没有找到 Token。请先登录微人大 (v.ruc.edu.cn) 后再查询。",
        fetchedAt: Date.now(),
      };
    }

    const res = await fetch(SCHEDULE_API_URL, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        Token: token,
      },
      body: JSON.stringify({ jczy013id: semester, zc: "-1" }),
    });

    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        items: [],
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        fetchedAt: Date.now(),
      };
    }

    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        items: [],
        error: `Failed to parse response JSON: ${err instanceof Error ? err.message : String(err)}`,
        fetchedAt: Date.now(),
      };
    }

    return {
      ok: true,
      raw,
      items: normalizeSchedule(raw),
      fetchedAt: Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: `Failed to fetch schedule: ${err instanceof Error ? err.message : String(err)}`,
      fetchedAt: Date.now(),
    };
  }
}

function normalizeSchedule(raw: any): ScheduleItem[] {
  if (!raw || !Array.isArray(raw.data.kbList)) {
    return [];
  }

  return raw.data.kbList.map((item: any) => ({
    courseName: item.kc_name,
    courseCode: "",
    semester: item.xnxq_name,
    credit: parseFloat(item.zxf),
    teacher: item.teachernames,
    time: item.pksjmx.split(",").map((t: string) => parseInt(t.slice(1, 3), 10)),
    weekday: item.pksjmx.split(",").map((t: string) => parseInt(t[0], 10)),
    weeks: parseWeeks(item.pkzcmx),
    time_note: item.sjbz_name === "单双周" ? 0 : item.sjbz_name === "单周" ? 1 : item.sjbz_name === "双周" ? 2 : undefined,
    location: item.js_name,
    note: item.pkzt_name,
    raw: item,
  }));
}

function parseWeeks(value: unknown): number[] | undefined {
  if (typeof value !== "string") return undefined;

  const weeks = value
    .split(",")
    .flatMap((segment) => {
      const numbers = segment.match(/\d+/g)?.map(Number) ?? [];

      if (numbers.length >= 2 && segment.includes("-")) {
        const [start, end] = numbers;
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);

        return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index);
      }

      return numbers.slice(0, 1);
    })
    .filter((week) => Number.isInteger(week) && week > 0);

  return weeks.length ? weeks : undefined;
}
