import { ref } from "vue";
import type { UserInfo, UserInfoQueryResult } from "@/types/user";

export type UserPanelStatus =
    | "checking"
    | "signed-out"
    | "ready"
    | "stale"
    | "error";

export function useUserInfo() {
    const isLoggedIn = ref(false);
    const userInfo = ref<UserInfo | null>(null);
    const user_error = ref<string>();
    const user_fetchedAt = ref<number>();
    const user_queryLoading = ref(false);
    const user_status = ref<UserPanelStatus>("checking");
    let latestRequest = 0;

    async function getUserInfo() {
        const requestId = ++latestRequest;
        const hadUserInfo = Boolean(userInfo.value);

        user_queryLoading.value = true;
        if (!hadUserInfo) user_status.value = "checking";

        try {
            const result: UserInfoQueryResult = await browser.runtime.sendMessage({
                type: "RUC_USER_INFO_QUERY",
            }) as UserInfoQueryResult;

            if (requestId !== latestRequest) return false;

            if (result.authState === "unauthenticated") {
                isLoggedIn.value = false;
                userInfo.value = null;
                user_error.value = undefined;
                user_status.value = "signed-out";
                return false;
            }

            if (!result.ok || !result.userInfo) {
                if (userInfo.value) {
                    user_error.value = result.error ?? "用户状态暂时无法确认。";
                    user_status.value = "stale";
                } else {
                    user_error.value = result.error ?? "用户信息查询失败，请重试。";
                    user_status.value = "error";
                }
                return false;
            }

            isLoggedIn.value = true;
            userInfo.value = result.userInfo;
            user_fetchedAt.value = result.fetchedAt;
            user_error.value = undefined;
            user_status.value = "ready";
            return true;
        } catch (error) {
            console.error("Error fetching user info:", error);

            if (requestId !== latestRequest) return false;

            if (userInfo.value) {
                user_error.value = "用户状态暂时无法确认。";
                user_status.value = "stale";
            } else {
                user_error.value = "暂时无法连接插件后台，请重试。";
                user_status.value = "error";
            }
            return false;
        } finally {
            if (requestId === latestRequest) {
                user_queryLoading.value = false;
            }
        }
    }

    return {
        isLoggedIn,
        getUserInfo,
        userInfo,
        user_error,
        user_fetchedAt,
        user_queryLoading,
        user_status,
    };
}
