import {
  fetchJw,
  isNotAuthenticatedError,
  jwAuthErrorMessage,
  resolveJwCredential,
} from "@/services/jwAuth";
import type {
  LoginStatusQueryResult,
  UserInfo,
  UserInfoQueryResult,
} from "@/types/user";

const USER_INFO_API_URL =
  "https://jw.ruc.edu.cn/secService/assert.json?resourceCode=resourceCode&apiCode=framework.sign.controller.SignController.asserts&t=" +
  Date.now();

export async function getLoginStatus(
  storeId?: string,
): Promise<LoginStatusQueryResult> {
  try {
    const credential = await resolveJwCredential({ storeId });
    // console.log("Resolved JW credential:", credential);
    return {
      ok: true,
      isLoggedIn: Boolean(credential),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    // console.error("Error resolving JW credential:", error);
    if (isNotAuthenticatedError(error)) {
      return {
        ok: true,
        isLoggedIn: false,
        fetchedAt: Date.now(),
      };
    }

    return {
      ok: false,
      isLoggedIn: false,
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: Date.now(),
    };
  }
}

export async function getUserInfo(
  storeId?: string,
): Promise<UserInfoQueryResult> {
  try {
    const getUserInfoApiUrl = () =>
      "https://jw.ruc.edu.cn/secService/assert.json" +
      "?resourceCode=resourceCode" +
      "&apiCode=framework.sign.controller.SignController.asserts" +
      `&t=${Date.now()}`;
    const res = await fetchJw(
      getUserInfoApiUrl(),
      {
        method: "POST",
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
          app: "PCWEB",
          locale: "zh_CN",
        },
        body: JSON.stringify({ sctype: "rmdx", userType: "student" }),
      },
      storeId,
    );
    // console.log("Fetched user info response:", res);
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
    // console.log("User info response text:", text);
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      // console.error("Failed to parse user info response:", text, err);
      return {
        ok: false,
        authState: "unknown",
        userInfo: null,
        error: "教务系统返回了无法识别的数据，请稍后重试。",
        fetchedAt: Date.now(),
      };
    }
    // console.log("Parsed user info:", raw);
    const userInfo = normalizeUserInfo(raw);
    // console.log("Normalized user info:", userInfo);
    if (!userInfo) {
      // console.error("User info is null or invalid:", raw);
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
      // console.warn("User is not authenticated:", error);
      return {
        ok: true,
        authState: "unauthenticated",
        userInfo: null,
        fetchedAt: Date.now(),
      };
    }
    // console.error("Error fetching user info:", error);
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
  if (!raw || !raw.data || !raw.data.userInfo) {
    return null;
  }

  const info = raw.data.userInfo;

  return {
    name: info.userAlias || "",
    studentId: info.userAccount || "",
    college: "",
    major: "",
    class: "",
  };
}
