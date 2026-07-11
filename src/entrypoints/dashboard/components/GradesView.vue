<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import type { GradeItem, GradeSemesterSummary } from "@/types/grade";
import type { DashboardIcon } from "../types";

const props = defineProps<{
  icon: DashboardIcon;
  loading: boolean;
  error?: string;
  fetchedAt?: number;
  grades: GradeItem[];
  summaries: GradeSemesterSummary[];
}>();

const emit = defineEmits<{
  (event: "query-grades"): void;
}>();

type GradeSemesterGroup = {
  semester: string;
  courses: GradeItem[];
  summary?: GradeSemesterSummary;
};

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value?: number, minimumFractionDigits = 0) {
  if (!isFiniteNumber(value)) return "-";

  return value.toLocaleString("zh-CN", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
}

function formatGradePoint(value?: number) {
  if (!isFiniteNumber(value)) return "-";

  return value.toFixed(2);
}

function semesterLabel(value?: string) {
  return value || "未知学期";
}

function ensureSemesterGroup(
  groups: Map<string, GradeSemesterGroup>,
  semester: string,
) {
  const existingGroup = groups.get(semester);

  if (existingGroup) return existingGroup;

  const group: GradeSemesterGroup = {
    semester,
    courses: [],
  };

  groups.set(semester, group);
  return group;
}

const semesterGroups = computed(() => {
  const groups = new Map<string, GradeSemesterGroup>();

  props.grades.forEach((grade) => {
    const group = ensureSemesterGroup(groups, semesterLabel(grade.semester));

    group.courses.push(grade);
  });

  props.summaries.forEach((summary) => {
    const group = ensureSemesterGroup(groups, semesterLabel(summary.semester));

    group.summary = summary;
  });

  return Array.from(groups.values());
});

const hasGradeData = computed(() => {
  return props.grades.length > 0 || props.summaries.length > 0;
});

const overallSummary = computed(() => {
  let totalCredit = 0;
  let totalWeightedGradePoint = 0;
  let hasTotalCredit = false;
  let hasTotalWeightedGradePoint = false;

  props.summaries.forEach((summary) => {
    if (isFiniteNumber(summary.totalCredit)) {
      totalCredit += summary.totalCredit;
      hasTotalCredit = true;
    }

    if (isFiniteNumber(summary.totalWeightedGradePoint)) {
      totalWeightedGradePoint += summary.totalWeightedGradePoint;
      hasTotalWeightedGradePoint = true;
    }
  });

  const averageGradePoint =
    hasTotalCredit && totalCredit > 0 && hasTotalWeightedGradePoint
      ? totalWeightedGradePoint / totalCredit
      : undefined;

  return {
    totalCredit: hasTotalCredit ? totalCredit : undefined,
    totalWeightedGradePoint: hasTotalWeightedGradePoint
      ? totalWeightedGradePoint
      : undefined,
    averageGradePoint,
    semesterCount: semesterGroups.value.length,
  };
});

const overviewMetrics = computed(() => [
  {
    label: "总学分",
    value: formatNumber(overallSummary.value.totalCredit),
  },
  {
    label: "总学分绩点",
    value: formatNumber(overallSummary.value.totalWeightedGradePoint, 2),
  },
  {
    label: "综合平均学分绩点",
    value: formatGradePoint(overallSummary.value.averageGradePoint),
  },
  {
    label: "已展示学期数",
    value: String(overallSummary.value.semesterCount),
  },
]);

function queryGrades() {
  emit("query-grades");
}

</script>

<template>
  <article class="data-panel">
    <header class="panel-header">
      <div class="panel-title">
        <Icon :icon="props.icon" aria-hidden="true" />
        <div>
          <h2>成绩</h2>
          <p v-if="props.fetchedAt" class="timestamp">
            更新时间：{{ formatDateTime(props.fetchedAt) }}
          </p>
        </div>
      </div>

      <button
        class="primary-button"
        type="button"
        :disabled="props.loading"
        @click="queryGrades"
      >
        {{ props.loading ? "查询中" : "查询成绩" }}
        <svg
            v-if="props.loading"
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
    </header>

    <div v-if="props.loading" class="skeleton-stack" aria-label="成绩加载中">
      <span class="skeleton-line is-wide"></span>
      <span class="skeleton-line"></span>
      <span class="skeleton-line is-short"></span>
    </div>

    <div v-else-if="hasGradeData" class="grades-content">
      <section class="overview-section" aria-label="成绩总览">
        <div
          v-for="metric in overviewMetrics"
          :key="metric.label"
          class="overview-metric"
        >
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-value">{{ metric.value }}</span>
        </div>
      </section>

      <section
        v-for="group in semesterGroups"
        :key="group.semester"
        class="semester-section"
      >
        <header class="semester-header">
          <div>
            <h3>{{ group.semester }}</h3>
            <p>{{ group.courses.length }} 门课程</p>
          </div>

          <div class="semester-metrics" aria-label="学期汇总">
            <span>
              <strong>{{ formatNumber(group.summary?.totalCredit) }}</strong>
              学分
            </span>
            <span>
              <strong>{{
                formatNumber(group.summary?.totalWeightedGradePoint, 2)
              }}</strong>
              学分绩点
            </span>
            <span>
              <strong>{{
                formatGradePoint(group.summary?.averageGradePoint)
              }}</strong>
              平均绩点
            </span>
          </div>
        </header>

        <div v-if="group.courses.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>课程</th>
                <th>课程类型</th>
                <th>学分</th>
                <th>成绩</th>
                <th>绩点</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in group.courses"
                :key="`${group.semester}-${item.courseCode ?? index}-${item.courseName}`"
              >
                <td>
                  <span class="course-name">{{ item.courseName }}</span>
                  <span v-if="item.courseCode" class="course-code">
                    {{ item.courseCode }}
                  </span>
                </td>
                <td>{{ formatCell(item.courseType) }}</td>
                <td>{{ formatNumber(item.credit) }}</td>
                <td class="score-cell">{{ formatCell(item.score) }}</td>
                <td class="grade-point-cell">
                  {{ formatGradePoint(item.gradePoint) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="semester-empty">该学期没有单科成绩记录。</p>
      </section>
    </div>

    <p v-else class="empty-state">尚未查询成绩。</p>
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

.panel-title h2 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.panel-title p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.primary-button {
  flex: 0 0 auto;
  align-items: center;
  display: inline-flex;
  gap: 6px;
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
  background: var(--red-dark);
}

.primary-button:active:not(:disabled) {
  transform: translateY(1px);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.primary-button:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.error-message,
.timestamp,
.empty-state,
.semester-empty {
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

.timestamp,
.empty-state,
.semester-empty {
  color: var(--muted);
}

.timestamp {
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
}

.grades-content {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}

.overview-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.overview-metric {
  min-width: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 14px;
}

.metric-label {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.3;
}

.metric-value {
  display: block;
  margin-top: 8px;
  color: var(--text);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.semester-section {
  border: 1px solid var(--border);
}

.semester-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--border);
  padding: 16px;
}

.semester-header h3 {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 650;
}

.semester-header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.semester-metrics {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
}

.semester-metrics span {
  white-space: nowrap;
}

.semester-metrics strong {
  margin-right: 4px;
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 14px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 720px;
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
  color: var(--text);
  font-size: 12px;
  font-weight: 650;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.course-name,
.course-code {
  display: block;
}

.course-name {
  color: var(--text);
  font-weight: 650;
}

.course-code {
  margin-top: 4px;
  color: var(--muted);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 11px;
}

.score-cell {
  font-weight: 650;
}

.grade-point-cell {
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
}

.semester-empty {
  margin: 0;
  padding: 16px;
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

@media (max-width: 760px) {
  .overview-section {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .semester-header {
    align-items: stretch;
    flex-direction: column;
  }

  .semester-metrics {
    justify-content: flex-start;
    text-align: left;
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

  .primary-button {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .overview-section {
    grid-template-columns: 1fr;
  }
}
</style>
