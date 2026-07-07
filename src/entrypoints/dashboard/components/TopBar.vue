<script setup lang="ts">
import logo from "@/assets/logo.png";
import type { UserInfo } from "@/types/user";
import { Icon } from "@iconify/vue";
import type { DashboardViewId, ToolbarItem } from "../types";

const props = withDefaults(
  defineProps<{
    activeView: DashboardViewId;
    toolbarItems: ToolbarItem[];
    userInfo?: UserInfo | null;
    userError?: string;
    userLoading?: boolean;
  }>(),
  {
    userInfo: null,
    userError: undefined,
    userLoading: false,
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
    '<path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24Zm0 16v32M128 216v16M40.51 71.49l22.63 22.63M193.86 193.86l22.63 22.63M24 128h32M200 128h32M40.51 184.51l22.63-22.63M193.86 62.14l22.63-22.63" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
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
        <div class="top-bar-title">Dashboard</div>
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
          <div v-if="props.userLoading">加载中...</div>
          <div v-else-if="props.userError" class="error-message">
            {{ props.userError }}
            <Icon
              class="user-icon"
              :icon="icons.retry"
              aria-hidden="true"
              @click="emit('retry-user-info')"
            />
          </div>
          <div v-else-if="props.userInfo" class="user-info">
            <Icon
              class="user-icon"
              :icon="icons.graduation"
              aria-hidden="true"
            />
            {{ props.userInfo.name }}
          </div>
          <div v-else>
            <button class="login-button" type="button" @click="requestLogin">
              登录微人大
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

.top-toolbar {
  width: 100%;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content:flex-end;
  overflow-x: auto;
  padding: 0px auto;
  margin: 0px 48px;
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
  align-items: center;
  gap: 8px;
}

.user-info {
  color: var(--text);
  font-size: 16px;
  font-weight: 650;
  display: flex;
  align-items: center;
}

.user-icon {
  width: 24px;
  height: 24px;
  margin-right: 6px;
  color: var(--red);
}

.error-message,
.timestamp,
.empty-state {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.6;
}

.error-message {
  border-left: 2px solid var(--red);
  color: var(--red);
  padding-left: 10px;
  overflow: scroll;
}

@media (max-width: 640px) {
  .top-bar-main {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 16px;
  }

  .top-toolbar {
    padding: 0 16px 12px;
  }
}
</style>
