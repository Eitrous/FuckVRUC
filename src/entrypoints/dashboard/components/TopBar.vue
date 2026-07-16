<script setup lang="ts">
import { nextTick, ref } from "vue";

import logo from "@/assets/logo.png";
import type { UserPanelStatus } from "@/composables/useUserInfo";
import type { UserInfo } from "@/types/user";
import { Icon } from "@iconify/vue";
import type {
  DashboardViewId,
  LibraryDashboardSection,
  ToolbarItem,
} from "../types";

const props = withDefaults(
  defineProps<{
    activeView: DashboardViewId;
    activeLibrarySection: LibraryDashboardSection;
    libraryNavigationDisabled?: boolean;
    toolbarItems: ToolbarItem[];
    userInfo?: UserInfo | null;
    userError?: string;
    userStatus?: UserPanelStatus;
  }>(),
  {
    userInfo: null,
    userError: undefined,
    userStatus: "checking",
    libraryNavigationDisabled: false,
  },
);

const emit = defineEmits<{
  (event: "login"): void;
  (event: "select-view", viewId: DashboardViewId): void;
  (
    event: "select-library-section",
    section: LibraryDashboardSection,
  ): void;
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

const libraryButton = ref<HTMLButtonElement | null>(null);
const libraryDropdown = ref<HTMLElement | null>(null);
const firstLibrarySectionButton = ref<HTMLButtonElement | null>(null);
const libraryMenuOpen = ref(false);
const libraryDropdownStyle = ref({
  top: "0px",
  left: "0px",
});

function requestLogin() {
  emit("login");
}

function selectView(viewId: DashboardViewId) {
  emit("select-view", viewId);
}

function openLibraryMenu(focusFirst = false) {
  libraryMenuOpen.value = true;
  void nextTick(() => {
    updateLibraryDropdownPosition();
    if (focusFirst) firstLibrarySectionButton.value?.focus();
  });
}

function setLibraryButton(element: unknown) {
  libraryButton.value = element instanceof HTMLButtonElement ? element : null;
}

function setLibraryDropdown(element: unknown) {
  libraryDropdown.value = element instanceof HTMLElement ? element : null;
}

function updateLibraryDropdownPosition() {
  const button = libraryButton.value;
  const dropdown = libraryDropdown.value;
  if (!button || !dropdown) return;

  const buttonRect = button.getBoundingClientRect();
  const viewportMargin = 10;
  const dropdownWidth = dropdown.offsetWidth;
  const left = Math.min(
    Math.max(viewportMargin, buttonRect.left),
    Math.max(viewportMargin, window.innerWidth - dropdownWidth - viewportMargin),
  );

  libraryDropdownStyle.value = {
    top: `${buttonRect.bottom}px`,
    left: `${left}px`,
  };
}

function closeLibraryMenu() {
  libraryMenuOpen.value = false;
}

function selectLibrarySection(section: LibraryDashboardSection) {
  if (props.libraryNavigationDisabled) return;

  libraryMenuOpen.value = false;
  emit("select-library-section", section);
}

function handleLibraryButtonKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowDown") return;

  event.preventDefault();
  openLibraryMenu(true);
}

function handleSubmenuEscape() {
  libraryButton.value?.focus();
  closeLibraryMenu();
}

function handleLibraryGroupFocusOut(event: FocusEvent) {
  const group = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (
    group instanceof HTMLElement &&
    nextTarget instanceof Node &&
    group.contains(nextTarget)
  ) {
    return;
  }

  closeLibraryMenu();
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
        <template
          v-for="item in props.toolbarItems"
          :key="item.id"
        >
          <button
            v-if="item.id !== 'library'"
            class="toolbar-item"
            :class="{ 'is-active': item.id === props.activeView }"
            type="button"
            :aria-current="item.id === props.activeView ? 'page' : undefined"
            @click="selectView(item.id)"
          >
            {{ item.label }}
          </button>
          <div
            v-else
            class="library-toolbar-group"
            @mouseenter="openLibraryMenu()"
            @mouseleave="closeLibraryMenu"
            @focusin="openLibraryMenu()"
            @focusout="handleLibraryGroupFocusOut"
          >
            <button
              :ref="setLibraryButton"
              class="toolbar-item library-toolbar-item"
              :class="{ 'is-active': item.id === props.activeView }"
              type="button"
              aria-haspopup="true"
              aria-controls="library-secondary-navigation"
              :aria-expanded="libraryMenuOpen"
              :aria-current="item.id === props.activeView ? 'page' : undefined"
              @keydown="handleLibraryButtonKeydown"
            >
              {{ item.label }}

            </button>

            <nav
              v-if="libraryMenuOpen"
              id="library-secondary-navigation"
              :ref="setLibraryDropdown"
              class="library-dropdown-overlay"
              :style="libraryDropdownStyle"
              aria-label="座位查询"
              @keydown.esc.stop.prevent="handleSubmenuEscape"
            >
            <div class="library-dropdown" role="menu">
              <button
                ref="firstLibrarySectionButton"
                type="button"
                :class="{ active: props.activeView === 'library' && props.activeLibrarySection === 'search' }"
                :aria-current="
                  props.activeView === 'library' && props.activeLibrarySection === 'search'
                    ? 'page'
                    : undefined
                "
                :disabled="props.libraryNavigationDisabled"
                @click="selectLibrarySection('search')"
              >
                座位预约
              </button>
              <button
                type="button"
                :class="{ active: props.activeView === 'library' && props.activeLibrarySection === 'records' }"
                :aria-current="
                  props.activeView === 'library' && props.activeLibrarySection === 'records'
                    ? 'page'
                    : undefined
                "
                :disabled="props.libraryNavigationDisabled"
                @click="selectLibrarySection('records')"
              >
                预约记录
              </button>
              <span
                v-if="props.libraryNavigationDisabled"
                class="submenu-status"
                role="status"
              >
                预约提交期间暂不能切换
              </span>
              </div>
            </nav>
          </div>
        </template>
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

.library-toolbar-group {
  position: relative;
  flex: 0 0 auto;
}

.library-toolbar-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.toolbar-item:hover,
.toolbar-item.is-active {
  border-bottom: 2px solid var(--red);
}

.toolbar-item:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.library-dropdown-overlay {
  position: fixed;
  z-index: 20;
  border: none;
  background: transparent;
}

.library-dropdown {
  display: grid;
  margin-top: 13px;
  width: 80px;
  border: 1px solid var(--border);
  border-top: none;
}

.library-dropdown button {
  width: 100%;
  min-height: 38px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--muted) 34%, var(--bg));
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.library-dropdown button:last-of-type {
  border-bottom: 0;
}

.library-dropdown button:hover:not(:disabled):not(.active) {
  background: color-mix(in srgb, var(--red) 9%, var(--bg));
}

.library-dropdown button.active {
  background: var(--accent);
  color: var(--bg);
}

.library-dropdown button:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--red-dark);
  outline-offset: -3px;
}

.library-dropdown button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.submenu-status {
  display: block;
  max-width: 190px;
  padding: 8px 12px;
  border-top: 1px solid color-mix(in srgb, var(--muted) 34%, var(--bg));
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
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
