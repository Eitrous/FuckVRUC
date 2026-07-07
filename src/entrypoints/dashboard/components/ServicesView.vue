<script setup lang="ts">
import { Icon } from "@iconify/vue";

import type { PortalService } from "@/types/service";
import type { DashboardIcon } from "../types";

const props = defineProps<{
  icon: DashboardIcon;
  query: string;
  services: PortalService[];
  searchIcon: DashboardIcon;
  serviceIcon: (service: PortalService) => DashboardIcon;
}>();

const emit = defineEmits<{
  (event: "update:query", value: string): void;
  (event: "open-service", service: PortalService): void;
}>();

function icon(body: string): DashboardIcon {
  return {
    width: 256,
    height: 256,
    body,
  };
}

const icons = {
  enter: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
    <path fill="currentColor" d="M188.24 123.76a6 6 0 0 1 0 8.48l-72 72a6 6 0 0 1-8.48-8.48L169.51 134H32a6 6 0 0 1 0-12h137.51l-61.75-61.76a6 6 0 0 1 8.48-8.48ZM216 34a6 6 0 0 0-6 6v176a6 6 0 0 0 12 0V40a6 6 0 0 0-6-6" />`
  ),
}

function updateQuery(event: Event) {
  emit("update:query", (event.target as HTMLInputElement).value);
}

function openService(service: PortalService) {
  emit("open-service", service);
}
</script>

<template>
  <article class="data-panel">
    <header class="panel-header">
      <div class="panel-title">
      <Icon :icon="props.icon" aria-hidden="true" />
      <h2>服务入口</h2>
    </div>
    </header>

    <label class="search-field">
      <Icon class="search-icon" :icon="props.searchIcon" aria-hidden="true" />
      <input
        :value="props.query"
        type="search"
        aria-label="搜索服务入口"
        placeholder="搜索：课表、成绩、图书馆、校园卡、网络服务"
        @input="updateQuery"
      />
    </label>
    

    <div v-if="props.services.length" class="service-grid">
      <button
        v-for="service in props.services"
        :key="service.id"
        class="service-card"
        type="button"
        @click="openService(service)"
      >
        <span class="service-icon" aria-hidden="true">
          <Icon :icon="props.serviceIcon(service)" />
        </span>
        <span class="service-body">
          <span class="service-name">{{ service.name }}</span>
          <span class="service-description">{{ service.description }}</span>
        </span>
        <span class="service-action">
          <Icon :icon="icons.enter" aria-hidden="true" />
        </span>
      </button>
    </div>

    <p v-else class="empty-state">没有匹配的服务入口。</p>
  </article>
</template>

<style scoped>
@import "../style.css";

.data-panel {
  min-width: 0;
  background: var(--bg);
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.services-section {
  background: var(--bg);
  padding: 28px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-title svg {
  width: 24px;
  height: 24px;
  color: var(--red);
}

.panel-title h2 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.search-field {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 12px;
  align-items: center;
  margin-top: 22px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--red);
  padding: 14px 16px;
  transition:
    border-color 180ms ease,
    background-color 180ms ease;
}

.search-field:focus-within {
  border-color: var(--red);
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.search-icon {
  width: 20px;
  height: 20px;
}

.search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 15px;
}

.search-field input::placeholder {
  color: var(--muted);
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
  margin-top: 24px;
}

.service-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  min-height: 148px;
  border: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 20px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.service-card:hover {
  background: var(--bg);
}

.service-card:active {
  transform: translateY(1px);
}

.service-card:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.service-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  color: var(--red);
}

.service-icon svg {
  width: 19px;
  height: 19px;
}

.service-body {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.service-name {
  color: var(--text);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.25;
}

.service-description {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.service-action svg{
  color: var(--red);
  width: 20px;
  height: 20px;
}

.empty-state {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 920px) {
  .service-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .services-section {
    padding: 18px;
  }

  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .service-grid {
    grid-template-columns: 1fr;
  }

  .service-card {
    min-height: 128px;
  }
}
</style>
