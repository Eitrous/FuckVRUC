import {
  fetchJw,
  isNotAuthenticatedError,
  jwAuthErrorMessage,
  resolveJwCredential,
} from "@/services/jwAuth";
import type { LoginStatusQueryResult, UserInfo, UserInfoQueryResult } from "@/types/user";

const USER_INFO_API_URL = "https://jw.ruc.edu.cn/resService/jwxtpt/v1/jczy/userIndex/findUserDetail?resourceCode=GRZX01&apiCode=jwPublic.controller.UserIndexController.findUserDetail";

export async function getLoginStatus(storeId?: string): Promise<LoginStatusQueryResult> {
  try {
    const credential = await resolveJwCredential({ storeId });

    return {
      ok: true,
      isLoggedIn: Boolean(credential),
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

export async function getUserInfo(storeId?: string): Promise<UserInfoQueryResult> {
  try {
    const res = await fetchJw(USER_INFO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({"sctype":"rmdx","userType":"student"}),
    }, storeId);

    const text = await res.text();
    
    if (!res.ok) {
      return {
        ok: false,
        authState: "unknown",
        userInfo: null,
        error: `教务系统请求失败（HTTP ${res.status}），请稍后重试。`,
        fetchedAt: Date.now(),
      };
    }

    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        authState: "unknown",
        userInfo: null,
        error: "教务系统返回了无法识别的数据，请稍后重试。",
        fetchedAt: Date.now(),
      };
    }

    const userInfo = normalizeUserInfo(raw);

    if (!userInfo) {
      return {
        ok: false,
        authState: "unknown",
        userInfo: null,
        error: "教务系统没有返回用户信息，请稍后重试。",
        fetchedAt: Date.now(),
      };
    }

    return {
      ok: true,
      authState: "authenticated",
      raw,
      userInfo,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    if (isNotAuthenticatedError(error)) {
      return {
        ok: true,
        authState: "unauthenticated",
        userInfo: null,
        fetchedAt: Date.now(),
      };
    }

    return {
      ok: false,
      authState: "unknown",
      userInfo: null,
      error: jwAuthErrorMessage(error),
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
