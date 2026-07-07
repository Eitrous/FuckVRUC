<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import { builtinServices, resolveMailUrl } from "@/services/services-index";
import type { PortalService } from "@/types/service";
import { useGrades } from "@/composables/useGrades";
import { useSchedules } from "@/composables/useSchedules";

const { loading, error, grades, fetchedAt, queryGrades } = useGrades();

const {
  schedule_queryLoading,
  schedule_error,
  schedules,
  schedule_fetchedAt,
  querySchedules,
} = useSchedules();

const currentSemester = "2025-2026-2";
const query = ref("");

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
  search: icon(
    '<path d="M112 48a64 64 0 1 0 0 128a64 64 0 0 0 0-128zM157.3 157.3 208 208" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  graduation: icon(
    '<path d="M24 96 128 48l104 48-104 48L24 96zM64 116v48c27 24 101 24 128 0v-48M224 104v58" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  book: icon(
    '<path d="M40 64h64c13.3 0 24 10.7 24 24v120c0-13.3-10.7-24-24-24H40V64zM216 64h-64c-13.3 0-24 10.7-24 24v120c0-13.3 10.7-24 24-24h64V64z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  mail: icon(
    '<path d="M32 64h192v128H32V64zM32 72l96 72 96-72" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  classroom: icon(
    '<path d="M40 56h176v112H40V56zM104 200h48M128 168v32M72 96h64M72 128h48" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  squares: icon(
    '<path d="M48 48h64v64H48V48zM144 48h64v64h-64V48zM48 144h64v64H48v-64zM144 144h64v64h-64v-64z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  calendar: icon(
    '<path d="M40 56h176v160H40V56zM40 96h176M80 40v32M176 40v32M80 128h20v20H80v-20zM118 128h20v20h-20v-20zM156 128h20v20h-20v-20zM80 168h20v20H80v-20zM118 168h20v20h-20v-20z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  exam: icon(
    '<path d="M72 32h88l40 40v152H72V32zM160 32v40h40M96 112h64M96 148h64M96 184h40" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
};

const serviceIcons: Record<string, DashboardIcon> = {
  jw: icons.graduation,
  library: icons.book,
  mail: icons.mail,
  k: icons.classroom,
};

const filteredServices = computed(() => {
  const q = query.value.trim().toLowerCase();

  if (!q) return builtinServices;

  return builtinServices.filter((service) => {
    return (
      service.name.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q) ||
      service.keywords.some((keyword) => keyword.toLowerCase().includes(q))
    );
  });
});

function serviceIcon(service: PortalService) {
  return serviceIcons[service.id] ?? icons.squares;
}

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

function formatCell(value: unknown) {
  if (Array.isArray(value)) {
    const text = value.filter(Boolean).join(", ");
    return text || "-";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatScheduleTime(weekday: unknown, time: unknown) {
  const weekdayNames = ["一", "二", "三", "四", "五", "六", "日"];
  const weekdays = Array.isArray(weekday) ? weekday : weekday ? [weekday] : [];
  const times = Array.isArray(time) ? time : time ? [time] : [];
  const weekdayText = weekdays
    .map((item) => {
      const index = Number(item) - 1;
      return weekdayNames[index] ? `周${weekdayNames[index]}` : String(item);
    })
    .join(", ");
  const timeText = times.filter(Boolean).join(", ");

  if (!weekdayText && !timeText) return "-";

  return [weekdayText, timeText ? `${timeText} 节` : ""]
    .filter(Boolean)
    .join(" / ");
}

async function openService(service: PortalService) {
  let url = service.url;

  if (service.id === "mail") {
    url = await resolveMailUrl();
  }

  browser.tabs.create({ url });
}
</script>

<template>
  <main class="dashboard-page">
    <div class="dashboard-shell">
      <header class="hero">
        <p class="eyebrow">RUC Portal</p>
        <h1>微人大 ++</h1>
        <p class="hero-copy">常用服务入口、课表和成绩查询。</p>
      </header>

      <section class="services-section" aria-labelledby="services-title">
        <div class="section-heading">
          <h2 id="services-title">服务入口</h2>
        </div>

        <label class="search-field">
          <Icon class="search-icon" :icon="icons.search" aria-hidden="true" />
          <input
            v-model="query"
            type="search"
            aria-label="搜索服务入口"
            placeholder="搜索：课表、成绩、图书馆、校园卡、网络服务"
          />
        </label>

        <div v-if="filteredServices.length" class="service-grid">
          <button
            v-for="service in filteredServices"
            :key="service.id"
            class="service-card"
            type="button"
            @click="openService(service)"
          >
            <span class="service-icon" aria-hidden="true">
              <Icon :icon="serviceIcon(service)" />
            </span>
            <span class="service-body">
              <span class="service-name">{{ service.name }}</span>
              <span class="service-description">{{ service.description }}</span>
            </span>
            <span class="service-action">打开</span>
          </button>
        </div>

        <p v-else class="empty-state">没有匹配的服务入口。</p>
      </section>

      <section class="data-grid" aria-label="学业信息">
        <article class="data-panel">
          <header class="panel-header">
            <div class="panel-title">
              <Icon :icon="icons.calendar" aria-hidden="true" />
              <div>
                <h2>课表</h2>
                <p>当前学期 {{ currentSemester }}</p>
              </div>
            </div>

            <button
              class="primary-button"
              type="button"
              :disabled="schedule_queryLoading"
              @click="querySchedules(currentSemester)"
            >
              {{ schedule_queryLoading ? "查询中" : "查询课表" }}
            </button>
          </header>

          <p v-if="schedule_error" class="error-message">
            {{ schedule_error }}
          </p>

          <p v-if="schedule_fetchedAt" class="timestamp">
            更新时间：{{ formatDateTime(schedule_fetchedAt) }}
          </p>

          <div
            v-if="schedule_queryLoading"
            class="skeleton-stack"
            aria-label="课表加载中"
          >
            <span class="skeleton-line is-wide"></span>
            <span class="skeleton-line"></span>
            <span class="skeleton-line is-short"></span>
          </div>

          <div v-else-if="schedules.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>课程</th>
                  <th>学分</th>
                  <th>上课时间</th>
                  <th>上课地点</th>
                  <th>教师</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in schedules"
                  :key="`${item.courseCode}-${item.courseName}`"
                >
                  <td>{{ item.courseName }}</td>
                  <td>{{ formatCell(item.credit) }}</td>
                  <td>{{ formatScheduleTime(item.weekday, item.time) }}</td>
                  <td>{{ formatCell(item.location) }}</td>
                  <td>{{ formatCell(item.teacher) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-else class="empty-state">尚未查询课表。</p>
        </article>

        <article class="data-panel">
          <header class="panel-header">
            <div class="panel-title">
              <Icon :icon="icons.exam" aria-hidden="true" />
              <div>
                <h2>成绩</h2>
                <p>仅在本地浏览器中查询和展示。</p>
              </div>
            </div>

            <button
              class="primary-button"
              type="button"
              :disabled="loading"
              @click="queryGrades()"
            >
              {{ loading ? "查询中" : "查询成绩" }}
            </button>
          </header>

          <p v-if="error" class="error-message">
            {{ error }}
          </p>

          <p v-if="fetchedAt" class="timestamp">
            更新时间：{{ formatDateTime(fetchedAt) }}
          </p>

          <div v-if="loading" class="skeleton-stack" aria-label="成绩加载中">
            <span class="skeleton-line is-wide"></span>
            <span class="skeleton-line"></span>
            <span class="skeleton-line is-short"></span>
          </div>

          <div v-else-if="grades.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>课程</th>
                  <th>学分</th>
                  <th>成绩</th>
                  <th>绩点</th>
                  <th>学期</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in grades"
                  :key="`${item.semester}-${item.courseCode}-${item.courseName}`"
                >
                  <td>{{ item.courseName }}</td>
                  <td>{{ formatCell(item.credit) }}</td>
                  <td>{{ formatCell(item.score) }}</td>
                  <td>{{ formatCell(item.gradePoint) }}</td>
                  <td>{{ formatCell(item.semester) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-else class="empty-state">尚未查询成绩。</p>
        </article>
      </section>
    </div>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
  border-radius: 0;
}

:global(html) {
  min-height: 100%;
  background: #fefefe;
  --red: #b91c1c;
  --bg: #fefefe;
  --text: #1f1a1a;
  --accent: #b91c1c;
  --muted: #806969;
  --border: #b91c1c;
}

:global(body) {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family:
    "SF Pro Display",
    "Geist Sans",
    "Helvetica Neue",
    Arial,
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

:global(button),
:global(input) {
  font: inherit;
}

.dashboard-page {
  min-height: 100dvh;
  background: var(--bg);
}

.dashboard-shell {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 56px 24px 72px;
}

.hero {
  max-width: 680px;
  padding-bottom: 36px;
}

.eyebrow {
  margin: 0 0 14px;
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(44px, 8vw, 84px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.95;
}

.hero-copy {
  max-width: 460px;
  margin: 22px 0 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.7;
}

.services-section,
.data-panel {
  background: var(--bg);
  border: 1px solid var(--border);
}

.services-section {
  padding: 28px;
}

.section-heading,
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.section-heading h2,
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

.service-card:focus-visible,
.primary-button:focus-visible {
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

.service-action {
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
  line-height: 1;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 18px;
}

.data-panel {
  min-width: 0;
  padding: 24px;
}

.panel-header {
  align-items: flex-start;
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

.panel-title p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.primary-button {
  flex: 0 0 auto;
  border: 1px solid var(--red);
  background: var(--red);
  color: #ffffff;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease,
    opacity 180ms ease;
}

.primary-button:hover:not(:disabled) {
  border-color: var(--red);
  background: var(--red);
}

.primary-button:active:not(:disabled) {
  transform: translateY(1px);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
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
}

.timestamp,
.empty-state {
  color: var(--muted);
}

.timestamp {
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 20px;
  border: 1px solid var(--border);
}

table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
}

th {
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  font-weight: 650;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.skeleton-stack {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.skeleton-line {
  display: block;
  width: 74%;
  height: 14px;
  background: var(--bg);
  animation: pulse 1.1s ease-in-out infinite alternate;
}

.skeleton-line.is-wide {
  width: 100%;
}

.skeleton-line.is-short {
  width: 46%;
}

@keyframes pulse {
  from {
    opacity: 0.46;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 920px) {
  .service-grid,
  .data-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-shell {
    padding: 34px 16px 48px;
  }

  .hero {
    padding-bottom: 28px;
  }

  .services-section,
  .data-panel {
    padding: 18px;
  }

  .section-heading,
  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .service-grid,
  .data-grid {
    grid-template-columns: 1fr;
  }

  .service-card {
    min-height: 128px;
  }

  .primary-button {
    width: 100%;
  }
}
</style>
