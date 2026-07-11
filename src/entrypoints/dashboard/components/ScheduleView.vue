<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import type { ScheduleItem } from "@/types/schedule";
import type { DashboardIcon, SemesterOption, WeekOption } from "../types";

const props = defineProps<{
  icon: DashboardIcon;
  selectedSemester: string;
  semesterOptions: SemesterOption[];
  selectedWeek: number;
  weekOptions: WeekOption[];
  loading: boolean;
  error?: string;
  fetchedAt?: number;
  schedules: ScheduleItem[];
}>();

const emit = defineEmits<{
  (event: "query-schedules"): void;
  (event: "update:semester", semester: string): void;
  (event: "update:week", week: number): void;
}>();

const weekdays = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

const lessons = Array.from({ length: 14 }, (_, index) => index + 1);

// const selectedSemesterLabel = computed(() => {
//   return (
//     props.semesterOptions.find((option) => {
//       return option.value === props.selectedSemester;
//     })?.label ?? props.selectedSemester
//   );
// });

// const selectedWeekLabel = computed(() => {
//   return (
//     props.weekOptions.find((option) => {
//       return option.value === props.selectedWeek;
//     })?.label ?? `第 ${props.selectedWeek} 周`
//   );
// });

type CourseBlock = {
  id: string;
  item: ScheduleItem;
  weekday: number;
  startLesson: number;
  endLesson: number;
  lessonCount: number;
};

type CourseBlockGroup = {
  id: string;
  weekday: number;
  startLesson: number;
  lessonCount: number;
  blocks: CourseBlock[];
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

// function slotKey(weekday: number, lesson: number) {
//   return `${weekday}-${lesson}`;
// }

function isValidWeekday(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

function isValidLesson(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 14;
}

function timeNoteLabel(value: ScheduleItem["time_note"]) {
  if (value === 0) return "单双周";
  if (value === 1) return "单周";
  if (value === 2) return "双周";
  return "";
}

function isScheduleVisibleInSelectedWeek(item: ScheduleItem) {
  if (Array.isArray(item.weeks) && item.weeks.length > 0) {
    return item.weeks.includes(props.selectedWeek);
  }

  if (item.time_note === 1) {
    return props.selectedWeek % 2 === 1;
  }

  if (item.time_note === 2) {
    return props.selectedWeek % 2 === 0;
  }

  return true;
}

function lessonRangeLabel(startLesson: number, endLesson: number) {
  if (startLesson === endLesson) return `第 ${startLesson} 节`;

  return `第 ${startLesson}-${endLesson} 节`;
}

function splitContinuousLessons(lessons: number[]) {
  const sortedLessons = Array.from(new Set(lessons)).sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];

  sortedLessons.forEach((lesson) => {
    const previousRange = ranges[ranges.length - 1];

    if (previousRange && lesson === previousRange.end + 1) {
      previousRange.end = lesson;
      return;
    }

    ranges.push({ start: lesson, end: lesson });
  });

  return ranges;
}

const visibleSchedules = computed(() => {
  return props.schedules.filter(isScheduleVisibleInSelectedWeek);
});

const courseBlocks = computed(() => {
  const blocks: CourseBlock[] = [];

  visibleSchedules.value.forEach((item, itemIndex) => {
    const itemWeekdays = item.weekday ?? [];
    const itemLessons = item.time ?? [];
    const fallbackWeekday = itemWeekdays[0];
    const lessonsByWeekday = new Map<number, number[]>();

    itemLessons.forEach((lesson, index) => {
      const weekday = itemWeekdays[index] ?? fallbackWeekday;

      if (!isValidWeekday(weekday) || !isValidLesson(lesson)) {
        return;
      }

      const weekdayLessons = lessonsByWeekday.get(weekday) ?? [];

      weekdayLessons.push(lesson);
      lessonsByWeekday.set(weekday, weekdayLessons);
    });

    lessonsByWeekday.forEach((weekdayLessons, weekday) => {
      splitContinuousLessons(weekdayLessons).forEach((range) => {
        blocks.push({
          id: `${itemIndex}-${weekday}-${range.start}-${range.end}`,
          item,
          weekday,
          startLesson: range.start,
          endLesson: range.end,
          lessonCount: range.end - range.start + 1,
        });
      });
    });
  });

  return blocks;
});

const courseBlockGroups = computed(() => {
  const groups = new Map<string, CourseBlockGroup>();

  courseBlocks.value.forEach((block) => {
    const key = `${block.weekday}-${block.startLesson}-${block.lessonCount}`;
    const group = groups.get(key) ?? {
      id: key,
      weekday: block.weekday,
      startLesson: block.startLesson,
      lessonCount: block.lessonCount,
      blocks: [],
    };

    group.blocks.push(block);
    groups.set(key, group);
  });

  return Array.from(groups.values());
});

function gridColumnForWeekday(weekday: number) {
  return String(weekday + 1);
}

function gridRowForLesson(lesson: number) {
  return String(lesson + 1);
}

function gridRowForCourseBlock(startLesson: number, lessonCount: number) {
  return `${startLesson + 1} / span ${lessonCount}`;
}

function querySchedules() {
  emit("query-schedules");
}

function updateSemester(event: Event) {
  emit("update:semester", (event.target as HTMLSelectElement).value);
}

function updateWeek(event: Event) {
  const week = Number((event.target as HTMLSelectElement).value);

  if (Number.isInteger(week)) {
    emit("update:week", week);
  }
}
</script>

<template>
  <article class="data-panel">
    <header class="panel-header">
      <div class="panel-title">
        <Icon :icon="props.icon" aria-hidden="true" />
        <div>
          <h2>课表</h2>
          <p v-if="props.fetchedAt" class="timestamp">
            更新时间：{{ formatDateTime(props.fetchedAt) }}
          </p>
        </div>
      </div>

      <div class="schedule-actions">
        <label class="schedule-select-field semester-select-field">
          <span>学期</span>
          <select
            :value="props.selectedSemester"
            :disabled="props.loading"
            @change="updateSemester"
          >
            <option
              v-for="option in props.semesterOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="schedule-select-field week-select-field">
          <span>周次</span>
          <select
            :value="props.selectedWeek"
            :disabled="props.loading"
            @change="updateWeek"
          >
            <option
              v-for="option in props.weekOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          class="primary-button"
          type="button"
          :disabled="props.loading"
          @click="querySchedules"
        >
          {{ props.loading ? "查询中" : "查询课表" }}
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
      </div>
    </header>

    <div v-if="props.loading" class="skeleton-stack" aria-label="课表加载中">
      <span class="skeleton-line is-wide"></span>
      <span class="skeleton-line"></span>
      <span class="skeleton-line is-short"></span>
    </div>

    <div
      v-else-if="props.schedules.length"
      class="schedule-grid-wrap"
      aria-label="课表"
    >
      <div class="schedule-grid">
        <div class="schedule-corner" style="grid-column: 1; grid-row: 1">
          节次
        </div>
        <div
          v-for="weekday in weekdays"
          :key="weekday.value"
          class="schedule-weekday"
          :style="{
            gridColumn: gridColumnForWeekday(weekday.value),
            gridRow: '1',
          }"
        >
          {{ weekday.label }}
        </div>

        <template v-for="lesson in lessons" :key="lesson">
          <div
            class="schedule-lesson"
            :style="{ gridColumn: '1', gridRow: gridRowForLesson(lesson) }"
          >
            第 {{ lesson }} 节
          </div>
          <div
            v-for="weekday in weekdays"
            :key="`${weekday.value}-${lesson}`"
            class="schedule-slot"
            :style="{
              gridColumn: gridColumnForWeekday(weekday.value),
              gridRow: gridRowForLesson(lesson),
            }"
          ></div>
        </template>

        <div
          v-for="group in courseBlockGroups"
          :key="group.id"
          class="course-block-group"
          :style="{
            gridColumn: gridColumnForWeekday(group.weekday),
            gridRow: gridRowForCourseBlock(
              group.startLesson,
              group.lessonCount,
            ),
          }"
        >
          <article
            v-for="block in group.blocks"
            :key="block.id"
            class="course-card"
          >
            <div class="course-range">
              {{ lessonRangeLabel(block.startLesson, block.endLesson) }}
            </div>
            <div class="course-name">{{ block.item.courseName }}</div>
            <div v-if="block.item.location" class="course-meta">
              {{ block.item.location }}
            </div>
            <div v-if="block.item.teacher" class="course-meta">
              {{ block.item.teacher }}
            </div>
            <div
              v-if="timeNoteLabel(block.item.time_note) || block.item.note"
              class="course-note"
            >
              {{
                [timeNoteLabel(block.item.time_note), block.item.note]
                  .filter(Boolean)
                  .join(" / ")
              }}
            </div>
          </article>
        </div>
      </div>
    </div>

    <p v-else class="empty-state">尚未查询课表。</p>
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

.schedule-actions {
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 10px;
  flex: 0 0 auto;
  flex-wrap: wrap;
}

.schedule-select-field {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
}

.schedule-select-field select {
  min-width: 184px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 9px 10px;
  font: inherit;
  line-height: 1.2;
}

.week-select-field select {
  min-width: 104px;
}

.schedule-select-field select:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.schedule-select-field select:focus-visible {
  background: color-mix(in srgb, var(--red) 10%, var(--bg));
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
  background: color-mix(in srgb, var(--red) 10%, var(--bg));
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

.timestamp,
.empty-state {
  color: var(--muted);
}

.timestamp {
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 12px;
}

.schedule-grid-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 20px;
  border: 1px solid var(--border);
}

.schedule-grid {
  display: grid;
  min-width: 1040px;
  grid-template-columns: 72px repeat(7, minmax(132px, 1fr));
  grid-template-rows: 44px repeat(14, minmax(112px, auto));
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
}

.schedule-corner,
.schedule-weekday,
.schedule-lesson,
.schedule-slot,
.course-block-group {
  min-width: 0;
}

.schedule-corner,
.schedule-weekday,
.schedule-lesson,
.schedule-slot {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.schedule-corner,
.schedule-weekday,
.schedule-lesson {
  background: var(--bg);
}

.schedule-corner,
.schedule-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 650;
}

.schedule-lesson {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12px 8px;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.schedule-slot {
  background: var(--bg);
}

.schedule-slot {
  background: var(--bg);
}

.course-block-group {
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.course-card {
  min-width: 0;
  flex: 1 1 auto;
  border-left: 3px solid var(--red);
  background: var(--bg);
  padding: 8px 9px;
}

.course-range {
  margin-bottom: 5px;
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
}

.course-name {
  color: var(--text);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.course-meta {
  margin-top: 5px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.course-note {
  margin-top: 7px;
  color: var(--red);
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
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

@media (max-width: 640px) {
  .data-panel {
    padding: 18px;
  }

  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .schedule-actions {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }

  .schedule-select-field select {
    width: 100%;
    min-width: 0;
  }

  .primary-button {
    width: 100%;
  }

  .schedule-grid {
    min-width: 980px;
    grid-template-columns: 64px repeat(7, minmax(124px, 1fr));
    grid-template-rows: 44px repeat(14, minmax(108px, auto));
  }
}
</style>
