<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

import type {
  LibraryQueryErrorCode,
  LibraryReservationRecord,
  LibraryReservationRecordCategory,
  LibraryReservationRecordPage,
  LibraryReservationRecordsQueryParams,
  LibraryReservationRecordStatus,
} from "@/types/library";

const PAGE_SIZE = 10 as const;

const props = defineProps<{
  loading: boolean;
  error?: string;
  errorCode?: LibraryQueryErrorCode;
  page?: LibraryReservationRecordPage | null;
  fetchedAt?: number;
}>();

const emit = defineEmits<{
  (event: "query-records", params: LibraryReservationRecordsQueryParams): void;
  (event: "clear-records"): void;
}>();

const categories: Array<{
  id: LibraryReservationRecordCategory;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}> = [
  {
    id: "today",
    label: "今日预约",
    emptyTitle: "今天还没有预约",
    emptyDescription: "当天的有效预约和已取消记录会显示在这里。",
  },
  {
    id: "history",
    label: "历史预约",
    emptyTitle: "暂无历史预约",
    emptyDescription: "完成、取消或失效的预约会按图书馆系统顺序显示。",
  },
  {
    id: "breach",
    label: "违约记录",
    emptyTitle: "暂无违约记录",
    emptyDescription: "当前账号没有可展示的违约记录。",
  },
];

const statusLabels: Record<LibraryReservationRecordStatus, string> = {
  CHECK_IN: "履约中",
  LEAVE_EARLY: "早退",
  AWAY: "暂离",
  RESERVE: "预约",
  STOP: "已结束",
  MISS: "失约",
  CANCEL: "已取消",
  NO_STOP: "未签退",
  UNKNOWN: "未知状态",
};

const activeCategory = ref<LibraryReservationRecordCategory>("today");
const requestedPage = ref(1);

const activeCategoryInfo = computed(() => {
  return categories.find((category) => category.id === activeCategory.value)!;
});

const records = computed(() => props.page?.items ?? []);
const currentPage = computed(
  () => props.page?.currentPage ?? requestedPage.value,
);
const totalPages = computed(() => Math.max(1, props.page?.totalPage ?? 1));

const errorTitle = computed(() => {
  switch (props.errorCode) {
    case "AUTH_PENDING":
      return "正在连接图书馆";
    case "AUTH_REQUIRED":
      return "需要登录图书馆系统";
    case "NETWORK":
      return "无法连接图书馆系统";
    case "INVALID_RESPONSE":
      return "图书馆返回了异常数据";
    default:
      return "预约记录查询失败";
  }
});

const fetchedAtLabel = computed(() => {
  if (!props.fetchedAt) return "";

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(props.fetchedAt));
});

function queryRecords(page = 1) {
  requestedPage.value = page;
  emit("query-records", {
    category: activeCategory.value,
    currentPage: page,
    pageSize: PAGE_SIZE,
  });
}

function selectCategory(category: LibraryReservationRecordCategory) {
  if (category === activeCategory.value) return;

  activeCategory.value = category;
  queryRecords(1);
}

function handleCategoryKeydown(
  event: KeyboardEvent,
  category: LibraryReservationRecordCategory,
) {
  const currentIndex = categories.findIndex((item) => item.id === category);
  let targetIndex: number | undefined;

  if (event.key === "ArrowRight") {
    targetIndex = (currentIndex + 1) % categories.length;
  } else if (event.key === "ArrowLeft") {
    targetIndex = (currentIndex - 1 + categories.length) % categories.length;
  } else if (event.key === "Home") {
    targetIndex = 0;
  } else if (event.key === "End") {
    targetIndex = categories.length - 1;
  }

  if (targetIndex === undefined) return;

  event.preventDefault();
  const target = categories[targetIndex];
  selectCategory(target.id);
  void nextTick(() => {
    document.getElementById(`records-tab-${target.id}`)?.focus();
  });
}

function previousPage() {
  if (props.loading || !props.page?.hasPrevious) return;
  queryRecords(currentPage.value - 1);
}

function nextPage() {
  if (props.loading || !props.page?.hasNext) return;
  queryRecords(currentPage.value + 1);
}

function statusLabel(record: LibraryReservationRecord) {
  const label = statusLabels[record.status];
  return record.status === "UNKNOWN" && record.rawStatus
    ? `${label}（${record.rawStatus}）`
    : label;
}

function displayRange(value: string) {
  return value.replaceAll("_", " – ");
}

function recordLocation(record: LibraryReservationRecord) {
  if (record.location) return record.location.replaceAll("|", " · ");

  return [record.buildingName, record.floorName, record.roomName]
    .filter(Boolean)
    .join(" · ");
}

onMounted(() => {
  queryRecords(1);
});

onUnmounted(() => {
  emit("clear-records");
});
</script>

<template>
  <section
    class="records-panel"
    aria-labelledby="library-records-heading"
    :aria-busy="loading"
  >
    <div class="records-toolbar">
      <div class="records-categories" role="tablist" aria-label="预约记录分类">
        <button
          v-for="category in categories"
          :id="`records-tab-${category.id}`"
          :key="category.id"
          class="category-button"
          :class="{ active: activeCategory === category.id }"
          type="button"
          role="tab"
          :aria-selected="activeCategory === category.id"
          :aria-controls="`records-panel-${category.id}`"
          :tabindex="activeCategory === category.id ? 0 : -1"
          @click="selectCategory(category.id)"
          @keydown="handleCategoryKeydown($event, category.id)"
        >
          {{ category.label }}
        </button>
      </div>

      <div>
        <!-- <p v-if="!page">
          共 {{ page.totalCount }} 条
          <span v-if="fetchedAtLabel"> · 更新于 {{ fetchedAtLabel }}</span>
        </p> -->

        <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          @click="queryRecords(currentPage)"
        >
          {{ loading ? "" : "刷新" }}
          <svg
            v-if="loading"
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
        </button>
      </div>
    </div>

    <div
      :id="`records-panel-${activeCategory}`"
      class="records-content"
      role="tabpanel"
      :aria-labelledby="`records-tab-${activeCategory}`"
      tabindex="0"
    >
      <div
        v-if="loading"
        class="records-skeleton"
        aria-label="正在连接图书馆并加载预约记录"
        role="status"
      >
        <p class="loading-label">正在连接图书馆并读取预约记录…</p>
        <div v-for="index in 4" :key="index" class="skeleton-row">
          <span class="skeleton-block skeleton-title" />
          <span class="skeleton-block skeleton-location" />
          <div class="skeleton-details">
            <span v-for="detail in 4" :key="detail" class="skeleton-block" />
          </div>
        </div>
      </div>

      <div
        v-else-if="error || errorCode"
        class="records-state error-state"
        role="alert"
      >
        <p class="state-kicker">查询未完成</p>
        <h3>{{ errorTitle }}</h3>
        <p>{{ error || "请稍后重试。" }}</p>
        <button
          class="state-action"
          type="button"
          @click="queryRecords(currentPage)"
        >
          重新查询
        </button>
      </div>

      <div v-else-if="page && records.length === 0" class="records-state">
        <p class="state-kicker">{{ activeCategoryInfo.label }}</p>
        <h3>{{ activeCategoryInfo.emptyTitle }}</h3>
        <p>{{ activeCategoryInfo.emptyDescription }}</p>
        <button
          class="state-action secondary"
          type="button"
          @click="queryRecords(1)"
        >
          刷新记录
        </button>
      </div>

      <ul v-else-if="records.length" class="records-list">
        <li v-for="record in records" :key="record.id" class="record-row">
          <div class="record-heading">
            <div>
              <p class="record-seat">座位 {{ record.seatLabel }}</p>
              <p v-if="recordLocation(record)" class="record-location">
                {{ recordLocation(record) }}
              </p>
            </div>
            <span
              class="status-badge"
              :class="`status-${record.status.toLowerCase().replace('_', '-')}`"
            >
              {{ statusLabel(record) }}
            </span>
          </div>

          <dl class="record-details">
            <div>
              <dt>预约日期</dt>
              <dd>{{ record.date }}</dd>
            </div>
            <div>
              <dt>计划时段</dt>
              <dd>{{ record.beginLabel }} – {{ record.endLabel }}</dd>
            </div>
            <div v-if="record.actualTimeLabel">
              <dt>实际使用</dt>
              <dd>{{ displayRange(record.actualTimeLabel) }}</dd>
            </div>
            <div v-if="record.awayRange">
              <dt>暂离区间</dt>
              <dd>{{ displayRange(record.awayRange) }}</dd>
            </div>
            <div v-if="record.useMinute > 0">
              <dt>使用分钟</dt>
              <dd>{{ record.useMinute }} 分钟</dd>
            </div>
            <div v-if="record.receipt">
              <dt>预约凭证</dt>
              <dd class="receipt-value">{{ record.receipt }}</dd>
            </div>
          </dl>

          <p v-if="record.message" class="record-message">
            {{ record.message }}
          </p>
        </li>
      </ul>

      <div v-else class="records-state first-state">
        <p class="state-kicker">预约记录</p>
        <h3>选择一个分类查看记录</h3>
        <p>进入本分栏后会自动查询今天的预约。</p>
      </div>
    </div>

    <nav
      v-if="
        activeCategory !== 'today' &&
        page &&
        (page.totalCount > 0 || page.currentPage > 1)
      "
      class="records-pagination"
      aria-label="预约记录分页"
    >
      <button
        type="button"
        :disabled="loading || !page.hasPrevious"
        @click="previousPage"
      >
        上一页
      </button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button
        type="button"
        :disabled="loading || !page.hasNext"
        @click="nextPage"
      >
        下一页
      </button>
    </nav>
  </section>
</template>

<style scoped>
.records-panel {
  display: grid;
  gap: 18px;
}

.records-toolbar,
.records-summary,
.record-heading,
.records-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.records-categories {
  display: flex;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.category-button,
.state-action,
.records-pagination button {
  border: none;
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
}

.category-button {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 9px 18px;
  font-weight: 700;
  font-size: 14px;
}

.category-button:hover:not(.active) {
  color: var(--muted);
}

.category-button:hover {
  background: var(--bg);
}

.category-button.active {
  color: var(--red);
}

.state-action,
.records-pagination button {
  min-height: 38px;
  padding: 8px 16px;
  font-weight: 700;
}

.refresh-button {
  background: var(--red);
  color: var(--bg);
  border: none;
  cursor: pointer;
  min-height: 36px;
  min-width: 60px;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button:hover {
  background: var(--red-dark);
}

button:focus-visible,
.records-content:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 38%, transparent);
  outline-offset: 3px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.records-summary {
  align-items: flex-end;
}

.records-summary h2,
.records-summary p,
.records-state h3,
.records-state p,
.record-heading p,
.record-message {
  margin: 0;
}

.records-summary h2 {
  font-size: 20px;
}

.records-summary p {
  color: var(--muted);
  font-size: 13px;
}

.records-content {
  min-width: 0;
}

.records-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.record-row,
.skeleton-row,
.records-state {
  border: 1px solid var(--border);
  background: var(--bg);
}

.record-row {
  padding: 18px 20px;
  border-left-width: 4px;
}

.record-heading {
  align-items: flex-start;
}

.record-seat {
  color: var(--text);
  font-size: 17px;
  font-weight: 800;
}

.record-location {
  margin-top: 5px !important;
  color: var(--muted);
  font-size: 13px;
}

.status-badge {
  flex: 0 0 auto;
  border: 1px solid currentColor;
  padding: 4px 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}

.status-stop,
.status-cancel,
.status-unknown {
  color: var(--muted);
}

.status-miss,
.status-leave-early,
.status-no-stop {
  background: color-mix(in srgb, var(--red) 9%, var(--bg));
  color: var(--red-dark);
}

.record-details {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 22px;
  margin: 17px 0 0;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--muted) 38%, var(--bg));
}

.record-details div {
  min-width: 0;
}

.record-details dt {
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 12px;
}

.record-details dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text);
  font-size: 14px;
  font-weight: 650;
}

.receipt-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.record-message {
  margin-top: 14px;
  padding: 10px 12px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--red) 5%, var(--bg));
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.records-state {
  min-height: 230px;
  padding: 36px;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 10px;
}

.records-state h3 {
  font-size: 22px;
}

.records-state > p:not(.state-kicker) {
  max-width: 620px;
  color: var(--muted);
  line-height: 1.7;
}

.state-kicker {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.state-action {
  margin-top: 8px;
  background: var(--accent);
  color: var(--bg);
}

.state-action.secondary {
  background: var(--bg);
  color: var(--text);
}

.records-skeleton {
  display: grid;
  gap: 12px;
}

.loading-label {
  margin: 0 0 2px;
  color: var(--muted);
  font-size: 13px;
}

.skeleton-row {
  display: grid;
  gap: 10px;
  min-height: 160px;
  padding: 20px;
}

.skeleton-block {
  display: block;
  height: 15px;
  background: color-mix(in srgb, var(--muted) 17%, var(--bg));
  animation: skeleton-pulse 1.2s ease-in-out infinite alternate;
}

.skeleton-title {
  width: min(180px, 48%);
  height: 21px;
}

.skeleton-location {
  width: min(420px, 76%);
}

.skeleton-details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--muted) 24%, var(--bg));
}

.records-pagination {
  justify-content: center;
  padding-top: 4px;
}

.records-pagination span {
  min-width: 110px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

@keyframes skeleton-pulse {
  from {
    opacity: 0.46;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 920px) {
  .record-details,
  .skeleton-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .records-panel {
    gap: 14px;
  }

  .records-toolbar {
    align-items: stretch;
    gap: 8px;
  }

  .records-categories {
    flex: 1 1 auto;
  }

  .category-button {
    min-height: 40px;
    padding-inline: 13px;
    font-size: 13px;
  }

  .refresh-button {
    flex: 0 0 auto;
    min-height: 40px;
    padding-inline: 12px;
  }

  .records-summary {
    display: block;
  }

  .records-summary p {
    margin-top: 5px;
  }

  .record-row {
    padding: 16px;
  }

  .record-heading {
    gap: 10px;
  }

  .status-badge {
    max-width: 46%;
    text-align: right;
  }

  .record-details,
  .skeleton-details {
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .records-state {
    min-height: 210px;
    padding: 26px 20px;
  }

  .records-pagination {
    gap: 9px;
  }

  .records-pagination button {
    padding-inline: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
  }
}
</style>
