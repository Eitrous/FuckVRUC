<script setup lang="ts">
import {
  DEFAULT_SIMPLIFY_MY_RUC,
  DEFAULT_SHOW_DASHBOARD_BUTTON,
  SIMPLIFY_MY_RUC_STORAGE_KEY,
  SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
} from '@/utils/settings';
import { onMounted, ref } from 'vue';

type LoginStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

const showDashboardButton = ref(DEFAULT_SHOW_DASHBOARD_BUTTON);
const simplifyMyRuc = ref(DEFAULT_SIMPLIFY_MY_RUC);
const settingsLoaded = ref(false);


function openDashboard() {
  browser.tabs.create({
    url: browser.runtime.getURL('/dashboard.html'),
  });
}

function openVRUC() {
  browser.tabs.create({
    url: 'https://v.ruc.edu.cn/',
  });
}

function openMyRUC() {
  browser.tabs.create({
    url: 'https://my.ruc.edu.cn/',
  });
}

async function loadSettings() {
  try {
    const settings = await browser.storage.local.get([
      SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
      SIMPLIFY_MY_RUC_STORAGE_KEY,
    ]);
    const storedDashboardButton =
      settings[SHOW_DASHBOARD_BUTTON_STORAGE_KEY];
    const storedSimplifyMyRuc = settings[SIMPLIFY_MY_RUC_STORAGE_KEY];

    showDashboardButton.value =
      typeof storedDashboardButton === 'boolean'
        ? storedDashboardButton
        : DEFAULT_SHOW_DASHBOARD_BUTTON;
    simplifyMyRuc.value =
      typeof storedSimplifyMyRuc === 'boolean'
        ? storedSimplifyMyRuc
        : DEFAULT_SIMPLIFY_MY_RUC;
  } catch (error) {
    console.error('Failed to load popup settings:', error);
  } finally {
    settingsLoaded.value = true;
  }
}

async function saveDashboardButtonVisibility() {
  try {
    await browser.storage.local.set({
      [SHOW_DASHBOARD_BUTTON_STORAGE_KEY]: showDashboardButton.value,
    });
  } catch (error) {
    console.error('Failed to save dashboard button visibility:', error);
  }
}

async function saveSimplifyMyRuc() {
  try {
    await browser.storage.local.set({
      [SIMPLIFY_MY_RUC_STORAGE_KEY]: simplifyMyRuc.value,
    });
  } catch (error) {
    console.error('Failed to save my.ruc simplification setting:', error);
  }
}

onMounted(() => {
  void Promise.all([loadSettings()]);
});
</script>

<template>
  <main class="popup-panel">
    <div class="popup-header">
      <h2>微人大 ++</h2>
      <button
        class="popup-header-button"
        type="button"
        @click="openDashboard"
      >
        打开仪表盘
      </button>
    </div>

    <section class="section" aria-labelledby="actions-title">
      <h3 id="actions-title">打开</h3>
      <div class="popup-actions">
        <button
          class="popup-button"
          type="button"
          @click="openVRUC"
        >
          微人大
        </button>

        <button
          class="popup-button"
          type="button"
          @click="openMyRUC"
        >
          数智人大
        </button>
      </div>
    </section>

    <section class="section" aria-labelledby="settings-title">
      <h3 id="settings-title">设置</h3>

      <label class="switch-row">
        <span class="switch-copy">
          <span class="switch-title">页面入口按钮</span>
        </span>

        <span class="switch-control">
          <input
            v-model="showDashboardButton"
            type="checkbox"
            :disabled="!settingsLoaded"
            @change="saveDashboardButtonVisibility"
          />
          <span class="switch-track" aria-hidden="true"></span>
        </span>
      </label>

      <label class="switch-row">
        <span class="switch-copy">
          <span class="switch-title">简化数智人大</span>
        </span>

        <span class="switch-control">
          <input
            v-model="simplifyMyRuc"
            type="checkbox"
            :disabled="!settingsLoaded"
            @change="saveSimplifyMyRuc"
          />
          <span class="switch-track" aria-hidden="true"></span>
        </span>
      </label>
    </section>
  </main>
</template>

<style scoped>
.popup-panel {
  width: 288px;
  padding: 16px;
  background: var(--bg);
  text-align: left;
}

.popup-panel h2,
.popup-panel h3 {
  margin: 0;
}

.popup-panel h2 {
  font-size: 18px;
  font-weight: 650;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.popup-header-button {
  border: none;
  background: none;
  margin: 0;
  padding: 0;
  color: var(--accent);
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
}

.popup-header-button:hover {
  text-decoration: underline;
}

.popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 14px;
}

.popup-button {
  width: 100%;
  border: none;
  background: var(--accent);
  color: var(--bg);
  font-size: 14px;
  font-weight: 650;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-button:hover {
  background: var(--muted);
}

.popup-button:active {
  transform: scale(0.98);
}

.popup-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.section h3 {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-secondary);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  cursor: pointer;
}

.switch-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.switch-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.switch-control {
  position: relative;
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
}

.switch-control input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  border-radius: 0;
}

.switch-track {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 0;
  background: var(--switch-off);
  transition: background-color 160ms ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 0;
  background: var(--switch-thumb);
  transition: transform 160ms ease;
}

.switch-control input:checked + .switch-track {
  background: var(--accent);
}

.switch-control input:checked + .switch-track::after {
  transform: translateX(18px);
}

.switch-control input:disabled {
  cursor: wait;
}

.switch-control input:disabled + .switch-track {
  opacity: 0.55;
}

.switch-control input:focus-visible + .switch-track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .switch-track,
  .switch-track::after {
    transition: none;
  }
}
</style>
