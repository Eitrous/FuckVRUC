import { ref } from "vue";
import type { LoginStatusQueryResult, UserInfo, UserInfoQueryResult } from "@/types/user";


export function useUserInfo() {
    const isLoggedIn = ref(false);
    const userInfo = ref<UserInfo | null>(null);
    const user_error = ref<string>();
    const user_fetchedAt = ref<number>();
    const user_queryLoading = ref(false);

    async function checkLoginStatus() {
        user_error.value = undefined;

        try {
            const result = await browser.runtime.sendMessage({
                type: "RUC_LOGIN_STATUS_QUERY",
            }) as LoginStatusQueryResult;

            if (!result.ok) {
                user_error.value = result.error ?? "登录状态检查失败";
                isLoggedIn.value = false;
                return false;
            }

            isLoggedIn.value = result.isLoggedIn;
            return result.isLoggedIn;
        } catch (err) {
            console.error("Error checking login status:", err);
            user_error.value = err instanceof Error ? err.message : String(err);
            isLoggedIn.value = false;
            return false;
        }
    }

    async function getUserInfo() {
        user_queryLoading.value = true;
        try {
            const result: UserInfoQueryResult = await browser.runtime.sendMessage({
                type: "RUC_USER_INFO_QUERY",
            }) as UserInfoQueryResult;

            if (!result.ok) {
                user_error.value = result.error ?? "查询失败";
                userInfo.value = null;
                return;
            }
            console.log("getUserInfo result:", result);
            userInfo.value = result.userInfo;
            user_fetchedAt.value = result.fetchedAt;
        } catch (error) {
            console.error("Error fetching user info:", error);
            user_error.value = "Failed to fetch user info.";
            userInfo.value = null;
        } finally {
            user_queryLoading.value = false;
        }
    } 

    return {
        isLoggedIn,
        checkLoginStatus,
        getUserInfo,
        userInfo,
        user_error,
        user_fetchedAt,
        user_queryLoading,
    };
}
