<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Icon } from "@iconify/vue";

import type { CustomPortalServiceInput, PortalService } from "@/types/service";
import type { DashboardIcon } from "../types";

const props = defineProps<{
  icon: DashboardIcon;
  query: string;
  services: PortalService[];
  searchIcon: DashboardIcon;
  serviceIcon: (service: PortalService) => DashboardIcon;
}>();

const emit = defineEmits<{
  (event: "create-custom-service", input: CustomPortalServiceInput): void;
  (event: "delete-custom-service", id: string): void;
  (event: "update:query", value: string): void;
  (
    event: "update-custom-service",
    id: string,
    input: CustomPortalServiceInput,
  ): void;
  (event: "open-service", service: PortalService): void;
}>();

type ServiceFormMode = "create" | "edit";

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
  plus: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M220 128a4 4 0 0 1-4 4h-84v84a4 4 0 0 1-8 0v-84H40a4 4 0 0 1 0-8h84V40a4 4 0 0 1 8 0v84h84a4 4 0 0 1 4 4" />`
  ),
  close: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128L47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z" />`
  ),
  edit: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="m229.66 58.34l-32-32a8 8 0 0 0-11.32 0l-96 96A8 8 0 0 0 88 128v32a8 8 0 0 0 8 8h32a8 8 0 0 0 5.66-2.34l96-96a8 8 0 0 0 0-11.32M124.69 152H104v-20.69l64-64L188.69 88ZM200 76.69L179.31 56L192 43.31L212.69 64ZM224 128v80a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h80a8 8 0 0 1 0 16H48v160h160v-80a8 8 0 0 1 16 0" />`
  ),
  delete: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />`
  ),
};

const isServiceModalOpen = ref(false);
const isEidtingService = ref(false);
const serviceFormMode = ref<ServiceFormMode>("create");
const editingServiceId = ref<string | null>(null);
const serviceFormError = ref("");
const serviceForm = reactive({
  name: "",
  url: "",
  description: "",
});

const serviceModalTitle = computed(() => {
  return serviceFormMode.value === "edit"
    ? "编辑自定义服务"
    : "添加自定义服务";
});

function isCustomService(service: PortalService) {
  return service.source === "user";
}

function updateQuery(event: Event) {
  emit("update:query", (event.target as HTMLInputElement).value);
}

function openService(service: PortalService) {
  emit("open-service", service);
}

function resetServiceForm() {
  serviceForm.name = "";
  serviceForm.url = "";
  serviceForm.description = "";
  serviceFormError.value = "";
  editingServiceId.value = null;
}

function openCreateModal() {
  resetServiceForm();
  serviceFormMode.value = "create";
  isServiceModalOpen.value = true;
}

function openEditModal(service: PortalService) {
  if (!isCustomService(service)) return;

  serviceForm.name = service.name;
  serviceForm.url = service.url;
  serviceForm.description = service.description ?? "";
  serviceFormError.value = "";
  editingServiceId.value = service.id;
  serviceFormMode.value = "edit";
  isServiceModalOpen.value = true;
}

function closeServiceModal() {
  isServiceModalOpen.value = false;
  resetServiceForm();
}

function normalizeServiceUrl(value: string) {
  const trimmedUrl = value.trim();

  if (!trimmedUrl) return null;

  const urlWithProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  try {
    const url = new URL(urlWithProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function validateServiceForm() {
  const name = serviceForm.name.trim();
  const description = serviceForm.description.trim();
  const url = normalizeServiceUrl(serviceForm.url);

  if (!name) {
    serviceFormError.value = "请输入服务名称。";
    return null;
  }

  if (!url) {
    serviceFormError.value = "请输入有效的 http 或 https 链接。";
    return null;
  }

  serviceFormError.value = "";

  return {
    name,
    url,
    description: description || undefined,
  };
}

function submitServiceForm() {
  const input = validateServiceForm();

  if (!input) return;

  if (serviceFormMode.value === "edit" && editingServiceId.value) {
    emit("update-custom-service", editingServiceId.value, input);
  } else {
    emit("create-custom-service", input);
  }

  closeServiceModal();
}

function deleteCustomService(service: PortalService) {
  if (!isCustomService(service)) return;

  if (window.confirm(`删除自定义服务“${service.name}”？`)) {
    emit("delete-custom-service", service.id);
  }
}
</script>

<template>
  <article class="data-panel">
    <header class="panel-header">
      <div class="panel-title">
        <Icon :icon="props.icon" aria-hidden="true" />
        <h2>服务入口</h2>
      </div>

      <button class="primary-button" type="button" @click="() => { isEidtingService = !isEidtingService }">
        {{ isEidtingService ? "完成" : "编辑服务" }}
      </button>
    </header>

    <label class="search-field">
      <Icon class="search-icon" :icon="props.searchIcon" aria-hidden="true" />
      <input
        :value="props.query"
        type="search"
        aria-label="搜索服务入口"
        placeholder="搜索："
        @input="updateQuery"
      />
    </label>

    <div v-if="props.services.length" class="service-grid">
      <article
        v-for="service in props.services"
        :key="service.id"
        class="service-card"
      >
        <button
          class="service-open-button"
          type="button"
          :disabled="isEidtingService"
          @click="openService(service)"
        >
          <span class="service-icon" aria-hidden="true">
            <Icon :icon="props.serviceIcon(service)" />
          </span>
          <span class="service-body">
            <span class="service-name">{{ service.name }}</span>
            <span v-if="service.description" class="service-description">
              {{ service.description }}
            </span>
            <span
              v-else-if="isCustomService(service)"
              class="service-description"
            >
              自定义服务
            </span>
          </span>
          <span v-if="!isEidtingService" class="service-action">
            <Icon :icon="icons.enter" aria-hidden="true" />
          </span>
        </button>

        <div v-if="isCustomService(service) && isEidtingService" class="service-management">
          <button
            class="service-manage-button"
            type="button"
            @click="openEditModal(service)"
          >
            <Icon :icon="icons.edit" aria-hidden="true" />
          </button>
          <button
            class="service-manage-button is-danger"
            type="button"
            @click="deleteCustomService(service)"
          >
            <Icon :icon="icons.delete" aria-hidden="true" />
          </button>
        </div>
      </article>
      <article
        v-if="isEidtingService"
        class="service-card service-adding-card"
      >
        <button
          class="service-adding-button"
          type="button"
          @click="openCreateModal"
        >
          <Icon :icon="icons.plus" class="service-adding-icon"/>
        </button>
      </article>
    </div>

    <p v-else class="empty-state">没有匹配的服务入口。</p>

    <div
      v-if="isServiceModalOpen"
      class="modal-backdrop"
      @click.self="closeServiceModal"
    >
      <section
        class="service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
      >
        <header class="modal-header">
          <h3 id="service-modal-title">{{ serviceModalTitle }}</h3>
          <button
            class="modal-close-button"
            type="button"
            aria-label="关闭"
            @click="closeServiceModal"
          >
            <Icon :icon="icons.close" aria-hidden="true" />
          </button>
        </header>

        <form class="service-form" @submit.prevent="submitServiceForm">
          <label class="form-field">
            <span>服务名称</span>
            <input
              v-model="serviceForm.name"
              type="text"
              autocomplete="off"
              placeholder="例如：RUCourse"
            />
          </label>

          <label class="form-field">
            <span>链接</span>
            <input
              v-model="serviceForm.url"
              type="text"
              inputmode="url"
              autocomplete="off"
              placeholder="例如：http://10.97.25.119"
            />
          </label>

          <label class="form-field">
            <span>描述</span>
            <textarea
              v-model="serviceForm.description"
              rows="3"
              placeholder="可选，显示在服务卡片上"
            ></textarea>
          </label>

          <p v-if="serviceFormError" class="form-error">
            {{ serviceFormError }}
          </p>

          <div class="form-actions">
            <button
              class="secondary-button"
              type="button"
              @click="closeServiceModal"
            >
              取消
            </button>
            <button class="primary-button" type="submit">
              {{ serviceFormMode === "edit" ? "保存" : "添加" }}
            </button>
          </div>
        </form>
      </section>
    </div>
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

.primary-button,
.secondary-button {
  flex: 0 0 auto;
  border: 1px solid var(--red);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    transform 180ms ease,
    opacity 180ms ease;
}

.primary-button {
  background: var(--red);
  color: #ffffff;
}

.secondary-button {
  background: var(--bg);
  color: var(--red);
}

.primary-button:hover,
.secondary-button:hover {
  background: var(--red-dark);
  color: #ffffff;
}

.primary-button:active,
.secondary-button:active {
  transform: translateY(1px);
}

.primary-button:focus-visible,
.secondary-button:focus-visible {
  outline: 2px solid var(--red);
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
  background: color-mix(in srgb, var(--red) 10%, var(--bg));
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
  gap: 16px;
  margin-top: 24px;
}

.service-card {
  display: flex;
  flex-direction: column;
  min-height: 148px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.service-card:hover {
  background: color-mix(in srgb, var(--red) 10%, var(--bg));
}

.service-adding-card {
  border: 1px dashed var(--border);
}

.service-open-button {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  width: 100%;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 20px;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease;
}

.service-open-button:active {
  transform: translateY(1px);
}

.service-open-button:focus-visible {
  outline: 2px solid var(--red);
}

.service-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: none;
  color: var(--red);
}

.service-icon svg {
  width: 42px;
  height: 42px;
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

.service-action svg {
  color: var(--red);
  width: 20px;
  height: 20px;
}

.service-adding-button {
  display: grid;
  place-items: center;
  width: 100%;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: var(--red);
  padding: 20px;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.service-adding-button svg {
  width: 60px;
  height: 60px;
}

.service-management {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 18px 68px;
}

.service-manage-button {
  border: 0;
  background: transparent;
  color: var(--red);
  padding: 6px 9px;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.service-manage-button:hover {
  background: var(--red);
  color: #ffffff;
}

.service-manage-button:active {
  transform: translateY(1px);
}

.service-manage-button:focus-visible {
  outline: 2px solid var(--red);
}

.service-manage-button svg {
  width: 20px;
  height: 20px;
}

.empty-state {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(31, 26, 26, 0.42);
}

.service-modal {
  width: min(100%, 520px);
  max-height: min(720px, calc(100dvh - 48px));
  overflow: auto;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  padding: 18px 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
}

.modal-close-button {
  border: 0;
  background: var(--bg);
  color: var(--red);
  padding: 6px 9px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.modal-close-button:hover {
  background: var(--red);
  color: #ffffff;
}

.modal-close-button:focus-visible {
  outline: 2px solid var(--red);
}

.modal-close-button svg {
  width: 16px;
  height: 16px;
}

.service-form {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.form-field {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
}

.form-field input,
.form-field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 10px 11px;
  font: inherit;
  line-height: 1.4;
}

.form-field textarea {
  min-height: 86px;
  resize: vertical;
}

.form-field input:focus-visible,
.form-field textarea:focus-visible {
  outline: 2px solid var(--red);
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: var(--muted);
}

.form-error {
  margin: 0;
  border-left: 2px solid var(--red);
  color: var(--red);
  padding-left: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 920px) {
  .service-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .data-panel {
    padding: 18px;
  }

  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

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

  .service-open-button {
    padding: 18px;
  }

  .service-management {
    padding: 0 18px 16px;
  }

  .modal-backdrop {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .primary-button,
  .form-actions .secondary-button {
    width: 100%;
  }
}
</style>
