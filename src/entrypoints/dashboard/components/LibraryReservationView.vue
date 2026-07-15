<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Icon } from "@iconify/vue";

import {
  LIBRARY_BUILDINGS,
  type LibraryBuildingId,
  type LibraryFloorId,
  type LibraryQueryErrorCode,
  type LibraryRoom,
  type LibraryRoomPage,
  type LibraryRoomQueryParams,
} from "@/types/library";
import type { DashboardIcon } from "../types";

const DEFAULT_BUILDING_ID = "1875080631899230208" as LibraryBuildingId;
const PAGE_SIZE = 20;

const props = defineProps<{
  icon: DashboardIcon;
  loading: boolean;
  error?: string;
  errorCode?: LibraryQueryErrorCode;
  fetchedAt?: number;
  page?: LibraryRoomPage | null;
}>();

const emit = defineEmits<{
  (event: "query-rooms", params: LibraryRoomQueryParams): void;
  (event: "clear-results"): void;
}>();

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const minimumDate = ref(formatLocalDate());
const filters = reactive({
  buildingId: DEFAULT_BUILDING_ID,
  date: minimumDate.value,
  floorId: 0 as LibraryFloorId,
  startTime: "",
  endTime: "",
  power: false,
  windows: false,
});
const validationError = ref("");
const lastSubmittedParams = ref<LibraryRoomQueryParams | null>(null);

const currentBuilding = computed(() => {
  return (
    LIBRARY_BUILDINGS.find((building) => {
      return building.id === filters.buildingId;
    }) ?? LIBRARY_BUILDINGS[0]
  );
});

const rooms = computed(() => props.page?.items ?? []);
const hasError = computed(() => Boolean(props.error || props.errorCode));
const currentPage = computed(() => props.page?.currentPage ?? 1);
const totalPages = computed(() => Math.max(1, props.page?.totalPage ?? 1));
const canGoPrevious = computed(() => {
  return (
    !props.loading &&
    lastSubmittedParams.value !== null &&
    currentPage.value > 1
  );
});
const canGoNext = computed(() => {
  return (
    !props.loading &&
    lastSubmittedParams.value !== null &&
    currentPage.value < totalPages.value
  );
});

const errorTitle = computed(() => {
  switch (props.errorCode) {
    case "AUTH_PENDING":
      return "正在连接图书馆系统";
    case "AUTH_REQUIRED":
      return "需要登录图书馆系统";
    case "NETWORK":
      return "无法连接图书馆系统";
    case "INVALID_RESPONSE":
      return "图书馆返回了异常数据";
    case "API_ERROR":
      return "余座查询失败";
    default:
      return "查询失败";
  }
});

const errorDetail = computed(() => {
  if (props.error?.trim()) return props.error;

  switch (props.errorCode) {
    case "AUTH_PENDING":
      return "正在通过统一身份认证获取图书馆登录状态。";
    case "AUTH_REQUIRED":
      return "请先在图书馆预约系统完成登录，再回到此处查询。";
    case "NETWORK":
      return "请确认当前网络可访问校内服务，校外使用时请先连接学校 VPN。";
    case "INVALID_RESPONSE":
      return "暂时无法读取余座数据，请稍后重试。";
    case "API_ERROR":
      return "图书馆服务暂时不可用，请稍后重试。";
    default:
      return "暂时无法完成查询，请稍后重试。";
  }
});

function formatDateTime(value?: number) {
  if (!value) return "";

  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function validateFilters() {
  minimumDate.value = formatLocalDate();

  if (!filters.date) {
    return "请选择查询日期。";
  }

  if (filters.date < minimumDate.value) {
    return "查询日期不能早于今天。";
  }

  const startMinute = filters.startTime
    ? parseTime(filters.startTime)
    : null;
  const endMinute = filters.endTime ? parseTime(filters.endTime) : null;

  if (filters.startTime && startMinute === null) {
    return "请选择有效的开始时间。";
  }

  if (filters.endTime && !filters.startTime) {
    return "填写结束时间前，请先选择开始时间。";
  }

  if (filters.endTime && endMinute === null) {
    return "请选择有效的结束时间。";
  }

  if (
    startMinute !== null &&
    endMinute !== null &&
    endMinute <= startMinute
  ) {
    return "结束时间必须晚于开始时间。";
  }

  return "";
}

function markFiltersChanged() {
  validationError.value = "";
  lastSubmittedParams.value = null;
  emit("clear-results");
}

function updateBuilding(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const building = LIBRARY_BUILDINGS.find((item) => item.id === value);

  if (!building || building.id === filters.buildingId) return;

  filters.buildingId = building.id;
  filters.floorId = 0;
  markFiltersChanged();
}

function updateFloor(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  const floor = currentBuilding.value.floors.find((item) => {
    return String(item.id) === value;
  });

  if (!floor || floor.id === filters.floorId) return;

  filters.floorId = floor.id;
  markFiltersChanged();
}

function updateDate(event: Event) {
  const value = (event.target as HTMLInputElement).value;

  if (value === filters.date) return;

  filters.date = value;
  markFiltersChanged();
}

function updateStartTime(event: Event) {
  const value = (event.target as HTMLInputElement).value;

  if (value === filters.startTime) return;

  filters.startTime = value;
  markFiltersChanged();
}

function updateEndTime(event: Event) {
  const value = (event.target as HTMLInputElement).value;

  if (value === filters.endTime) return;

  filters.endTime = value;
  markFiltersChanged();
}

function updatePower(event: Event) {
  filters.power = (event.target as HTMLInputElement).checked;
  markFiltersChanged();
}

function updateWindows(event: Event) {
  filters.windows = (event.target as HTMLInputElement).checked;
  markFiltersChanged();
}

function buildQueryParams(currentPage: number): LibraryRoomQueryParams {
  return {
    buildingId: filters.buildingId,
    date: filters.date,
    floorId: filters.floorId,
    beginMinute: filters.startTime ? (parseTime(filters.startTime) ?? -1) : -1,
    endMinute: filters.endTime ? (parseTime(filters.endTime) ?? 0) : 0,
    power: filters.power,
    windows: filters.windows,
    currentPage,
    pageSize: PAGE_SIZE,
  };
}

function queryRooms() {
  if (props.loading) return;

  validationError.value = validateFilters();

  if (validationError.value) return;

  const params = buildQueryParams(1);

  lastSubmittedParams.value = params;
  emit("query-rooms", { ...params });
}

function queryPage(pageNumber: number) {
  if (
    props.loading ||
    !lastSubmittedParams.value ||
    pageNumber < 1 ||
    pageNumber > totalPages.value
  ) {
    return;
  }

  const params = {
    ...lastSubmittedParams.value,
    currentPage: pageNumber,
  };

  lastSubmittedParams.value = params;
  emit("query-rooms", { ...params });
}

function formatCount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("zh-CN") : "-";
}

function availabilityLabel(room: LibraryRoom) {
  return room.seatFree > 0 ? "有余座" : "暂无余座";
}
</script>

<template>
  <article class="data-panel" :aria-busy="props.loading">
    <header class="panel-header">
      <div class="panel-title">
        <Icon :icon="props.icon" aria-hidden="true" />
        <div>
          <h2>图书馆余座</h2>
          <p v-if="props.fetchedAt" class="timestamp">
            更新时间：{{ formatDateTime(props.fetchedAt) }}
          </p>
        </div>
      </div>
    </header>

    <form
      class="filter-panel"
      aria-label="余座查询条件"
      novalidate
      @submit.prevent="queryRooms"
    >
      <div class="filter-grid">
        <label class="filter-field">
          <span>馆舍</span>
          <select
            :value="filters.buildingId"
            :disabled="props.loading"
            @change="updateBuilding"
          >
            <option
              v-for="building in LIBRARY_BUILDINGS"
              :key="building.id"
              :value="building.id"
            >
              {{ building.name }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>日期</span>
          <input
            :value="filters.date"
            :min="minimumDate"
            :disabled="props.loading"
            type="date"
            required
            @change="updateDate"
          />
        </label>

        <label class="filter-field">
          <span>楼层</span>
          <select
            :value="filters.floorId"
            :disabled="props.loading"
            @change="updateFloor"
          >
            <option
              v-for="floor in currentBuilding.floors"
              :key="floor.id"
              :value="floor.id"
            >
              {{ floor.name }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>开始时间（可选）</span>
          <input
            :value="filters.startTime"
            :disabled="props.loading"
            type="time"
            @change="updateStartTime"
          />
        </label>

        <label class="filter-field">
          <span>结束时间（可选）</span>
          <input
            :value="filters.endTime"
            :disabled="props.loading"
            type="time"
            @change="updateEndTime"
          />
        </label>

        <fieldset class="facility-field">
          <legend>设施</legend>
          <div class="facility-options">
            <label class="check-field">
              <input
                :checked="filters.power"
                :disabled="props.loading"
                type="checkbox"
                @change="updatePower"
              />
              <span>有电源</span>
            </label>
            <label class="check-field">
              <input
                :checked="filters.windows"
                :disabled="props.loading"
                type="checkbox"
                @change="updateWindows"
              />
              <span>靠窗</span>
            </label>
          </div>
        </fieldset>

        <div class="query-action">
          <button
            class="primary-button"
            type="submit"
            :disabled="props.loading"
          >
            {{ props.loading ? "正在查询" : "查询余座" }}
          </button>
        </div>
      </div>

      <p
        v-if="validationError"
        id="library-filter-error"
        class="validation-error"
        role="alert"
      >
        {{ validationError }}
      </p>
    </form>

    <section class="results-section" aria-live="polite">
      <div
        v-if="props.loading"
        class="room-grid"
        aria-label="正在连接图书馆并查询余座"
      >
        <article
          v-for="index in 6"
          :key="index"
          class="room-card skeleton-card"
          aria-hidden="true"
        >
          <span class="skeleton-line is-title"></span>
          <span class="skeleton-line"></span>
          <span class="skeleton-line is-number"></span>
        </article>
      </div>

      <div v-else-if="hasError" class="state-panel error-state" role="alert">
        <h3>{{ errorTitle }}</h3>
        <p>{{ errorDetail }}</p>
      </div>

      <template v-else-if="props.page && rooms.length">
        <div class="results-summary">
          <span>共 {{ props.page.totalCount }} 个区域</span>
          <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        </div>

        <div class="room-grid">
          <article
            v-for="room in rooms"
            :key="room.id"
            class="room-card"
          >
            <header class="room-card-header">
              <div>
                <h3>{{ room.name }}</h3>
                <p>{{ room.buildingName }}，{{ room.floorName }}</p>
              </div>
              <span
                class="availability-label"
                :class="{ 'is-empty': room.seatFree <= 0 }"
              >
                {{ availabilityLabel(room) }}
              </span>
            </header>

            <div class="seat-counts" aria-label="座位数量">
              <div class="free-count">
                <strong>{{ formatCount(room.seatFree) }}</strong>
                <span>空闲座位</span>
              </div>
              <div class="total-count">
                <strong>{{ formatCount(room.seatTotal) }}</strong>
                <span>总座位</span>
              </div>
            </div>
          </article>
        </div>

        <nav v-if="totalPages > 1" class="pagination" aria-label="余座查询分页">
          <button
            class="page-button"
            type="button"
            :disabled="!canGoPrevious"
            @click="queryPage(currentPage - 1)"
          >
            上一页
          </button>
          <span aria-current="page">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="page-button"
            type="button"
            :disabled="!canGoNext"
            @click="queryPage(currentPage + 1)"
          >
            下一页
          </button>
        </nav>
      </template>

      <div v-else-if="props.page" class="state-panel empty-state">
        <h3>没有符合条件的区域</h3>
        <p>请调整楼层、时间或设施条件后重新查询。</p>
      </div>

      <div v-else class="state-panel initial-state">
        <h3>查询馆内余座</h3>
        <p>选择馆舍和日期，可按楼层、时间及设施进一步筛选。</p>
      </div>
    </section>
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

.panel-title {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.panel-title svg {
  width: 24px;
  height: 24px;
  color: var(--red);
}

.panel-title h2,
.state-panel h3,
.room-card h3 {
  margin: 0;
  color: var(--text);
}

.panel-title h2 {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.timestamp {
  margin: 6px 0 0;
  color: var(--muted);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
}

.filter-panel {
  margin-top: 22px;
  border: 1px solid var(--border);
  padding: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
}

.filter-field,
.facility-field {
  min-width: 0;
}

.filter-field {
  display: grid;
  gap: 7px;
}

.filter-field > span,
.facility-field legend {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
}

.filter-field select,
.filter-field input {
  width: 100%;
  min-width: 0;
  height: 39px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  color-scheme: light;
}

.filter-field select:focus-visible,
.filter-field input:focus-visible,
.check-field input:focus-visible,
.primary-button:focus-visible,
.page-button:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.filter-field select:disabled,
.filter-field input:disabled,
.check-field input:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.facility-field {
  margin: 0;
  border: 0;
  padding: 0;
}

.facility-field legend {
  margin-bottom: 7px;
  padding: 0;
}

.facility-options {
  display: flex;
  min-height: 39px;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border);
  padding: 8px 10px;
}

.check-field {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}

.check-field input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--red);
}

.query-action {
  display: flex;
  justify-content: flex-end;
}

.primary-button,
.page-button {
  border: 1px solid var(--red);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease,
    opacity 180ms ease;
}

.primary-button {
  min-height: 39px;
  background: var(--red);
  color: #ffffff;
}

.page-button {
  background: var(--bg);
  color: var(--red);
}

.primary-button:hover:not(:disabled),
.page-button:hover:not(:disabled) {
  background: var(--red-dark);
  color: #ffffff;
}

.primary-button:active:not(:disabled),
.page-button:active:not(:disabled) {
  transform: translateY(1px);
}

.primary-button:disabled,
.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.validation-error {
  margin: 14px 0 0;
  border-left: 2px solid var(--red);
  color: var(--red);
  padding-left: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.results-section {
  margin-top: 20px;
}

.results-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.results-summary span:last-child,
.pagination > span {
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.room-card {
  min-width: 0;
  min-height: 166px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 17px;
}

.room-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.room-card-header > div {
  min-width: 0;
}

.room-card h3 {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.room-card-header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.availability-label {
  flex: 0 0 auto;
  border: 1px solid var(--red);
  color: var(--red);
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}

.availability-label.is-empty {
  border-color: color-mix(in srgb, var(--muted) 64%, var(--bg));
  color: var(--muted);
}

.seat-counts {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.72fr);
  gap: 14px;
  align-items: end;
  margin-top: 24px;
}

.seat-counts > div {
  display: grid;
  gap: 5px;
}

.seat-counts strong {
  color: var(--text);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.seat-counts .free-count strong {
  color: var(--red);
  font-size: 30px;
}

.seat-counts span {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.state-panel {
  min-height: 150px;
  border: 1px solid var(--border);
  padding: 24px;
}

.state-panel h3 {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
}

.state-panel p {
  max-width: 62ch;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}

.error-state {
  border-left-width: 3px;
}

.error-state h3,
.error-state p {
  color: var(--red);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}

.pagination > span {
  min-width: 72px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.skeleton-card {
  display: grid;
  align-content: start;
  gap: 13px;
}

.skeleton-line {
  display: block;
  width: 68%;
  height: 12px;
  background: color-mix(in srgb, var(--red) 11%, var(--bg));
  animation: pulse 1.1s ease-in-out infinite alternate;
}

.skeleton-line.is-title {
  width: 82%;
  height: 18px;
}

.skeleton-line.is-number {
  width: 42%;
  height: 34px;
  margin-top: 22px;
}

@keyframes pulse {
  from {
    opacity: 0.4;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 920px) {
  .filter-grid,
  .room-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .data-panel {
    padding: 18px;
  }

  .filter-grid,
  .room-grid {
    grid-template-columns: 1fr;
  }

  .query-action,
  .primary-button {
    width: 100%;
  }

  .room-card {
    min-height: 154px;
  }

  .results-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}

@media (max-width: 380px) {
  .facility-options {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .pagination {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
  }

  .page-button {
    padding-inline: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .primary-button,
  .page-button,
  .skeleton-line {
    animation: none;
    transition: none;
  }
}
</style>
