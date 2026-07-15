<script setup lang="ts">
import logo from "@/assets/logo.png";
import type { UserPanelStatus } from "@/composables/useUserInfo";
import type { UserInfo } from "@/types/user";
import { Icon } from "@iconify/vue";
import type { DashboardViewId, ToolbarItem } from "../types";

const props = withDefaults(
  defineProps<{
    activeView: DashboardViewId;
    toolbarItems: ToolbarItem[];
    userInfo?: UserInfo | null;
    userError?: string;
    userStatus?: UserPanelStatus;
  }>(),
  {
    userInfo: null,
    userError: undefined,
    userStatus: "checking",
  },
);

const emit = defineEmits<{
  (event: "login"): void;
  (event: "select-view", viewId: DashboardViewId): void;
  (event: "retry-user-info"): void;
}>();

type DashboardIcon = {
  width: number;
  height: number;
  body: string;
};

function icon(body: string): DashboardIcon {
  return {
    width: 256,
    height: 256,
    body,
  };
}

const icons = {
  graduation: icon(
    '<path d="M24 96 128 48l104 48-104 48L24 96zM64 116v48c27 24 101 24 128 0v-48M224 104v58" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  retry: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M238 56v48a6 6 0 0 1-6 6h-48a6 6 0 0 1 0-12h32.55l-30.38-27.8c-.06-.06-.12-.13-.19-.19a82 82 0 1 0-1.7 117.65a6 6 0 0 1 8.24 8.73A93.46 93.46 0 0 1 128 222h-1.28a94 94 0 1 1 67.65-160.6L226 90.35V56a6 6 0 1 1 12 0" />`,
  ),
};

function requestLogin() {
  emit("login");
}

function selectView(viewId: DashboardViewId) {
  emit("select-view", viewId);
}
</script>

<template>
  <header class="top-bar">
    <div class="top-bar-main">
      <div class="top-bar-left">
        <img class="top-bar-logo" :src="logo" alt="微人大 ++" />
        <svg
          class="top-bar-divider"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="30"
          viewBox="0 0 10 28"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="6" y1="0" x2="6" y2="30" />
        </svg>
        <div class="top-bar-title">仪表盘</div>
      </div>
      <nav class="top-toolbar" aria-label="Dashboard views">
        <button
          v-for="item in props.toolbarItems"
          :key="item.id"
          class="toolbar-item"
          :class="{ 'is-active': item.id === props.activeView }"
          type="button"
          :aria-current="item.id === props.activeView ? 'page' : undefined"
          @click="selectView(item.id)"
        >
          {{ item.label }}
        </button>
      </nav>
      <div class="top-bar-right">
        <div class="user-info-field">
          <div v-if="props.userStatus === 'checking'" class="loading-message">
            检查登录状态
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.2em"
              height="1.2em"
              viewBox="0 0 24 24"
            >
              <path d="M0 0h24v24H0z" fill="none" />
              <g
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              >
                <path stroke-dasharray="18" d="M12 3c4.97 0 9 4.03 9 9">
                  <animate
                    fill="freeze"
                    attributeName="stroke-dashoffset"
                    dur="0.3s"
                    values="18;0"
                  />
                  <animateTransform
                    attributeName="transform"
                    dur="1.5s"
                    repeatCount="indefinite"
                    type="rotate"
                    values="0 12 12;360 12 12"
                  />
                </path>
                <path
                  stroke-dasharray="60"
                  d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z"
                  opacity=".3"
                >
                  <animate
                    fill="freeze"
                    attributeName="stroke-dashoffset"
                    dur="1.2s"
                    values="60;0"
                  />
                </path>
              </g>
            </svg>
          </div>
          <div v-else-if="props.userStatus === 'error'" class="error-message">
            加载失败
            <button
              class="retry-button"
              type="button"
              @click="emit('retry-user-info')"
            >
              <Icon class="retry-icon" :icon="icons.retry" aria-hidden="true" />
            </button>
          </div>
          <div
            v-else-if="
              (props.userStatus === 'ready' || props.userStatus === 'stale') &&
              props.userInfo
            "
            class="user-info"
            :class="{ 'is-stale': props.userStatus === 'stale' }"
          >
            <Icon
              class="user-icon"
              :icon="icons.graduation"
              aria-hidden="true"
            />
            {{ props.userInfo.name }}
            <template v-if="props.userStatus === 'stale'">
              <span class="stale-label">状态待确认</span>
              <button
                class="retry-button stale-retry-button"
                type="button"
                :title="props.userError"
                aria-label="重新检查用户状态"
                @click="emit('retry-user-info')"
              >
                <Icon
                  class="retry-icon"
                  :icon="icons.retry"
                  aria-hidden="true"
                />
              </button>
            </template>
          </div>
          <div v-else-if="props.userStatus === 'signed-out'">
            <button class="login-button" type="button" @click="requestLogin">
              登录微人大
            </button>
          </div>
          <div v-else class="error-message">
            用户状态异常
            <button
              class="retry-button"
              type="button"
              @click="emit('retry-user-info')"
            >
              <Icon class="retry-icon" :icon="icons.retry" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
@import "../style.css";

.top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  background: var(--bg);
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.top-bar-main {
  min-height: 64px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-bar-logo {
  height: 22px;
}

.top-bar-divider {
  width: 10px;
  height: 28px;
  color: var(--border);
}

.top-bar-title {
  font-size: 20px;
  font-weight: 300;
  letter-spacing: 0.04em;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 90px;
}

.retry-button {
  display: inline-flex;
  padding: 3px;
  background: var(--red);
  border: 0;
  color: #ffffff;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.retry-icon {
  color: #fff;
}

.top-toolbar {
  width: 100%;
  display: flex;
  flex: 1;
  gap: 16px;
  align-items: center;
  justify-content: flex-end;
  overflow-x: auto;
  padding: 0;
  margin: 0 48px;
}

.toolbar-item {
  width: 80px;
  border: 0;
  background: var(--bg);
  color: var(--text);
  padding: 8px 12px;
  font-size: 16px;
  font-weight: 650;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.08s ease;
}

.toolbar-item:hover,
.toolbar-item.is-active {
  border-bottom: 2px solid var(--red);
}

.toolbar-item:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.login-button {
  flex: 0 0 auto;
  border: 1px solid var(--red);
  background: var(--red);
  color: #ffffff;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease,
    opacity 180ms ease;
}

.login-button:hover:not(:disabled) {
  background: var(--red-dark);
}

.user-info-field {
  display: flex;
  max-width: 100px;
  align-items: center;
  gap: 8px;
}

.user-info {
  color: var(--text);
  font-size: 16px;
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-info.is-stale {
  color: var(--muted);
}

.stale-label {
  color: var(--red);
  font-size: 12px;
  font-weight: 500;
}

.stale-retry-button {
  display: inline-flex;
  padding: 3px;
}

.user-icon {
  width: 24px;
  height: 24px;
  margin-right: 6px;
  color: var(--red);
}

.loading-message {
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-message,
.timestamp,
.empty-state {
  font-size: 13px;
  line-height: 1.6;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--red);
  overflow: scroll;
}

@media (max-width: 640px) {
  .top-bar-main {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 16px;
    gap: 12px;
  }

  .top-toolbar {
    box-sizing: border-box;
    width: calc(100% + 32px);
    flex: 0 0 auto;
    justify-content: flex-start;
    gap: 8px;
    margin: 0 -16px;
    padding: 0 16px 12px;
    overscroll-behavior-inline: contain;
  }

  .toolbar-item {
    flex: 0 0 auto;
  }
}
</style>
