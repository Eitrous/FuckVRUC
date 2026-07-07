<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  DEFAULT_SHOW_DASHBOARD_BUTTON,
  SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
} from '@/utils/settings';

const showDashboardButton = ref(DEFAULT_SHOW_DASHBOARD_BUTTON);
const settingsLoaded = ref(false);

onMounted(async () => {
  const settings = await browser.storage.local.get(
    SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
  );
  const storedValue = settings[SHOW_DASHBOARD_BUTTON_STORAGE_KEY];

  showDashboardButton.value =
    typeof storedValue === 'boolean'
      ? storedValue
      : DEFAULT_SHOW_DASHBOARD_BUTTON;
  settingsLoaded.value = true;
});

function openDashboard() {
  browser.tabs.create({
    url: browser.runtime.getURL('/dashboard.html'),
  })
}

function openPortal() {
  browser.tabs.create({
    url: 'https://v.ruc.edu.cn/',
  })
}

async function saveDashboardButtonVisibility() {
  await browser.storage.local.set({
    [SHOW_DASHBOARD_BUTTON_STORAGE_KEY]: showDashboardButton.value,
  });
}
</script>

<template>
  <main class="popup-panel">
    <h2>微人大 ++</h2>

    <div class="popup-actions">
      <button
        class="popup-button"
        type="button"
        @click="openDashboard"
      >
        打开 Dashboard
      </button>

      <button
        class="popup-button"
        type="button"
        @click="openPortal"
      >
        打开微人大
      </button>
    </div>

    <section class="settings-section" aria-labelledby="settings-title">
      <h3 id="settings-title">设置</h3>

      <label class="switch-row">
        <span class="switch-copy">
          <span class="switch-title">页面入口按钮</span>
          <span class="switch-description">在微人大右下角显示控制台入口</span>
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
    </section>
  </main>
</template>

<style scoped>
.popup-panel {
  width: 288px;
  padding: 16px;
  background: #18181b;
  color: #fafafa;
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

.popup-actions {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.popup-button {
  width: 100%;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #27272a;
  color: #fafafa;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.popup-button:hover {
  background: #3f3f46;
}

.settings-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #3f3f46;
}

.settings-section h3 {
  font-size: 13px;
  font-weight: 650;
  color: #d4d4d8;
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
  gap: 2px;
}

.switch-title {
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.switch-description {
  color: #a1a1aa;
  font-size: 12px;
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
}

.switch-track {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #52525b;
  transition: background-color 160ms ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  transition: transform 160ms ease;
}

.switch-control input:checked + .switch-track {
  background: #901818;
}

.switch-control input:checked + .switch-track::after {
  transform: translateX(18px);
}

.switch-control input:disabled {
  cursor: wait;
}
</style>
