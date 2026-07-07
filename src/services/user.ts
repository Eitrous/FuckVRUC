import { getTokenCookie } from "@/utils/getTokenCookie";
import type { LoginStatusQueryResult, UserInfo, UserInfoQueryResult } from "@/types/user";

const USER_INFO_API_URL = "https://jw.ruc.edu.cn/resService/jwxtpt/v1/jczy/userIndex/findUserDetail?resourceCode=GRZX01&apiCode=jwPublic.controller.UserIndexController.findUserDetail";

export async function getLoginStatus(): Promise<LoginStatusQueryResult> {
  try {
    const token = await getTokenCookie();

    return {
      ok: true,
      isLoggedIn: !!token,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      isLoggedIn: false,
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: Date.now(),
    };
  }
}

export async function getUserInfo(): Promise<UserInfoQueryResult> {
  try {
    const token = await getTokenCookie();

    if (!token) {
      return {
        ok: false,
        userInfo: null,
        error: "没有找到 Token。请先登录微人大 (v.ruc.edu.cn) 后再查询。",
        fetchedAt: Date.now(),
      };
    }

    const res = await fetch(USER_INFO_API_URL, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        Token: token,
      },
      body: JSON.stringify({"sctype":"rmdx","userType":"student"}),
    });

    const text = await res.text();
    
    if (!res.ok) {
      return {
        ok: false,
        userInfo: null,
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
        userInfo: null,
        error: `Failed to parse response JSON: ${err instanceof Error ? err.message : String(err)}`,
        fetchedAt: Date.now(),
      };
    }

    return {
      ok: true,
      raw,
      userInfo: normalizeUserInfo(raw),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      userInfo: null,
      error: `Error fetching user info: ${error instanceof Error ? error.message : String(error)}`,
      fetchedAt: Date.now(),
    };
  }
}

function normalizeUserInfo(raw: any): UserInfo | null {
  if (!raw || !raw.data || !raw.data.xsInfo) {
    return null;
  }

  const info = raw.data.xsInfo;

  return {
    name: info.xs_name || "",
    studentId: info.xh || "",
    college: info.skdw_name || "",
    major: info.ndzy_name || "",
    class: info.bj_name || "",
  };
}
