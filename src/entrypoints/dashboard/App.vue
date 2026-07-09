<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import GradesView from "./components/GradesView.vue";
import ScheduleView from "./components/ScheduleView.vue";
import ServicesView from "./components/ServicesView.vue";
import TopBar from "./components/TopBar.vue";
import type {
  DashboardIcon,
  DashboardViewId,
  SemesterOption,
  ToolbarItem,
  WeekOption,
} from "./types";

import { builtinServices, resolveMailUrl } from "@/services/services-index";
import type { CustomPortalServiceInput, PortalService } from "@/types/service";
import { useGrades } from "@/composables/useGrades";
import { useSchedules } from "@/composables/useSchedules";
import { useUserInfo } from "@/composables/useUserInfo";

const {
  checkLoginStatus,
  getUserInfo,
  userInfo,
  user_error,
  user_queryLoading,
} = useUserInfo();

const {
  loading,
  error,
  grades,
  gradeSummaries,
  fetchedAt,
  queryGrades,
} = useGrades();

const {
  schedule_queryLoading,
  schedule_error,
  schedules,
  schedule_fetchedAt,
  loadCachedSchedule,
  querySchedules,
} = useSchedules();

const DEFAULT_SCHEDULE_SEMESTER = "2025-2026-2";
const DEFAULT_SCHEDULE_WEEK = 1;
const SELECTED_SCHEDULE_SEMESTER_STORAGE_KEY = "rucScheduleSelectedSemester";
const SELECTED_SCHEDULE_WEEK_STORAGE_KEY = "rucScheduleSelectedWeek";
const CUSTOM_SERVICES_STORAGE_KEY = "rucCustomServices";

const semesterTerms = [
  { value: 1, label: "秋季学期" },
  { value: 2, label: "春季学期" },
  { value: 3, label: "寒假" },
  { value: 4, label: "国际小学期" },
  { value: 5, label: "暑假" },
] as const;

function currentAcademicYearStart(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();

  return month >= 8 ? year : year - 1;
}

function buildSemesterOptions(): SemesterOption[] {
  const academicYearStart = currentAcademicYearStart();

  return Array.from({ length: 4 }, (_, index) => academicYearStart - index)
    .flatMap((yearStart) => {
      const academicYear = `${yearStart}-${yearStart + 1}`;

      return semesterTerms.map((term) => ({
        value: `${academicYear}-${term.value}`,
        label: `${academicYear} ${term.label}`,
      }));
    });
}

function buildWeekOptions(): WeekOption[] {
  return Array.from({ length: 20 }, (_, index) => {
    const week = index + 1;

    return {
      value: week,
      label: `第 ${week} 周`,
    };
  });
}

const semesterOptions = buildSemesterOptions();
const weekOptions = buildWeekOptions();
const selectedSemester = ref(DEFAULT_SCHEDULE_SEMESTER);
const selectedWeek = ref(DEFAULT_SCHEDULE_WEEK);
const customServices = ref<PortalService[]>([]);
const query = ref("");
const activeView = ref<DashboardViewId>("services");

const toolbarItems: ToolbarItem[] = [
  { id: "services", label: "服务入口" },
  { id: "schedule", label: "课表" },
  { id: "grades", label: "成绩" },
];

const viewComponentMap = {
  services: ServicesView,
  schedule: ScheduleView,
  grades: GradesView,
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
  globe: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
    <path fill="currentColor" d="M128 26a102 102 0 1 0 102 102A102.12 102.12 0 0 0 128 26m81.57 64h-40.38a132.6 132.6 0 0 0-25.73-50.67A90.29 90.29 0 0 1 209.57 90m8.43 38a89.7 89.7 0 0 1-3.83 26h-42.36a155.4 155.4 0 0 0 0-52h42.36a89.7 89.7 0 0 1 3.83 26m-90 87.83a110 110 0 0 1-15.19-19.45A124.2 124.2 0 0 1 99.35 166h57.3a124.2 124.2 0 0 1-13.46 30.38A110 110 0 0 1 128 215.83M96.45 154a139.2 139.2 0 0 1 0-52h63.1a139.2 139.2 0 0 1 0 52ZM38 128a89.7 89.7 0 0 1 3.83-26h42.36a155.4 155.4 0 0 0 0 52H41.83A89.7 89.7 0 0 1 38 128m90-87.83a110 110 0 0 1 15.19 19.45A124.2 124.2 0 0 1 156.65 90h-57.3a124.2 124.2 0 0 1 13.46-30.38A110 110 0 0 1 128 40.17m-15.46-.84A132.6 132.6 0 0 0 86.81 90H46.43a90.29 90.29 0 0 1 66.11-50.67M46.43 166h40.38a132.6 132.6 0 0 0 25.73 50.67A90.29 90.29 0 0 1 46.43 166m97 50.67A132.6 132.6 0 0 0 169.19 166h40.38a90.29 90.29 0 0 1-66.11 50.67Z" />`
  ),
  earth: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 16a87.5 87.5 0 0 1 48 14.28V74l-22.17 25.74l-31.47 4.26l-.31-.22l-19.67-12.86a16 16 0 0 0-22.51 4.18l-20.94 31.3a16 16 0 0 0-2.7 8.81L56 171.44l-3.27 2.15A88 88 0 0 1 128 40M62.29 186.47l2.52-1.65A16 16 0 0 0 72 171.53l.21-36.23L93.17 104a4 4 0 0 0 .32.22l19.67 12.87a15.94 15.94 0 0 0 11.35 2.77l31.49-4.27a16 16 0 0 0 10-5.41l22.17-25.76A16 16 0 0 0 192 74v-6.33A87.87 87.87 0 0 1 211.77 155l-16.14-14.76a16 16 0 0 0-16.93-3l-30.46 12.65a16.08 16.08 0 0 0-9.68 12.45l-2.39 16.19a16 16 0 0 0 11.77 17.81L169.4 202l2.36 2.37a87.88 87.88 0 0 1-109.47-17.9M185 195l-4.3-4.31a16 16 0 0 0-7.26-4.18L152 180.85l2.39-16.19L184.84 152L205 170.48A88.4 88.4 0 0 1 185 195" />`
  )
};

const serviceIcons: Record<string, DashboardIcon> = {
  jw: icons.graduation,
  library: icons.book,
  mail: icons.mail,
  k: icons.classroom,
  iss: icons.earth,
  network: icons.globe,
};

const allServices = computed(() => [
  ...builtinServices,
  ...customServices.value,
]);

const filteredServices = computed(() => {
  const q = query.value.trim().toLowerCase();

  if (!q) return allServices.value;

  return allServices.value.filter((service) => {
    return (
      service.name.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q) ||
      service.keywords.some((keyword) => keyword.toLowerCase().includes(q)) ||
      service.url.toLowerCase().includes(q)
    );
  });
});

function serviceIcon(service: PortalService) {
  return serviceIcons[service.id] ?? icons.squares;
}

const activeViewComponent = computed(() => viewComponentMap[activeView.value]);

const activeViewProps = computed(() => {
  if (activeView.value === "services") {
    return {
      icon: icons.squares,
      query: query.value,
      services: filteredServices.value,
      searchIcon: icons.search,
      serviceIcon,
    };
  }

  if (activeView.value === "schedule") {
    return {
      icon: icons.calendar,
      selectedSemester: selectedSemester.value,
      semesterOptions,
      selectedWeek: selectedWeek.value,
      weekOptions,
      loading: schedule_queryLoading.value,
      error: schedule_error.value,
      fetchedAt: schedule_fetchedAt.value,
      schedules: schedules.value,
    };
  }

  return {
    icon: icons.exam,
    loading: loading.value,
    error: error.value,
    fetchedAt: fetchedAt.value,
    grades: grades.value,
    summaries: gradeSummaries.value,
  };
});

function selectView(viewId: DashboardViewId) {
  activeView.value = viewId;

  if (viewId === "schedule" && schedules.value.length === 0) {
    void loadCachedSchedule(selectedSemester.value);
  }
}

function updateQuery(value: string) {
  query.value = value;
}

function isKnownSemester(value: string) {
  return semesterOptions.some((option) => option.value === value);
}

function isKnownWeek(value: number) {
  return weekOptions.some((option) => option.value === value);
}

async function selectScheduleSemester(semester: string) {
  if (!isKnownSemester(semester)) return;

  selectedSemester.value = semester;

  try {
    await browser.storage.local.set({
      [SELECTED_SCHEDULE_SEMESTER_STORAGE_KEY]: semester,
    });
  } catch (err) {
    console.error("Failed to save selected schedule semester:", err);
  }

  await loadCachedSchedule(semester);
}

async function selectScheduleWeek(week: number) {
  if (!isKnownWeek(week)) return;

  selectedWeek.value = week;

  try {
    await browser.storage.local.set({
      [SELECTED_SCHEDULE_WEEK_STORAGE_KEY]: week,
    });
  } catch (err) {
    console.error("Failed to save selected schedule week:", err);
  }
}

function queryCurrentSemesterSchedule() {
  void querySchedules(selectedSemester.value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCustomServiceUrl(value: string) {
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

function buildCustomServiceKeywords(input: CustomPortalServiceInput) {
  return [input.name, input.description ?? "", input.url]
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function buildCustomService(
  id: string,
  input: CustomPortalServiceInput,
): PortalService {
  const name = input.name.trim();
  const description = input.description?.trim();
  const service: PortalService = {
    id,
    name,
    url: input.url,
    category: "other",
    keywords: buildCustomServiceKeywords({
      name,
      description,
      url: input.url,
    }),
    source: "user",
  };

  if (description) {
    service.description = description;
  }

  return service;
}

function normalizeStoredCustomService(value: unknown) {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const url =
    typeof value.url === "string" ? normalizeCustomServiceUrl(value.url) : null;

  if (!id.startsWith("custom-") || !name || !url) {
    return null;
  }

  return buildCustomService(id, {
    name,
    description,
    url,
  });
}

function createCustomServiceId() {
  return `custom-${crypto.randomUUID()}`;
}

async function saveCustomServices(services: PortalService[]) {
  try {
    await browser.storage.local.set({
      [CUSTOM_SERVICES_STORAGE_KEY]: services,
    });
  } catch (err) {
    console.error("Failed to save custom services:", err);
  }
}

async function createCustomService(input: CustomPortalServiceInput) {
  const normalizedUrl = normalizeCustomServiceUrl(input.url);

  if (!input.name.trim() || !normalizedUrl) return;

  const service = buildCustomService(createCustomServiceId(), {
    ...input,
    url: normalizedUrl,
  });
  const nextServices = [...customServices.value, service];

  customServices.value = nextServices;
  await saveCustomServices(nextServices);
}

async function updateCustomService(
  id: string,
  input: CustomPortalServiceInput,
) {
  const normalizedUrl = normalizeCustomServiceUrl(input.url);

  if (!input.name.trim() || !normalizedUrl) return;

  const serviceIndex = customServices.value.findIndex((service) => {
    return service.id === id && service.source === "user";
  });

  if (serviceIndex === -1) return;

  const nextServices = [...customServices.value];

  nextServices[serviceIndex] = buildCustomService(id, {
    ...input,
    url: normalizedUrl,
  });
  customServices.value = nextServices;
  await saveCustomServices(nextServices);
}

async function deleteCustomService(id: string) {
  const nextServices = customServices.value.filter((service) => {
    return service.id !== id;
  });

  if (nextServices.length === customServices.value.length) return;

  customServices.value = nextServices;
  await saveCustomServices(nextServices);
}

async function openService(service: PortalService) {
  let url = service.url;

  if (service.id === "mail") {
    url = await resolveMailUrl();
  }

  browser.tabs.create({ url });
}

function openLogin() {
  browser.tabs.create({ url: "https://v.ruc.edu.cn/" });
}

let userSyncPromise: Promise<void> | null = null;

async function syncUserInfo(force = false) {
  if (userSyncPromise) return userSyncPromise;

  userSyncPromise = (async () => {
    const loggedIn = await checkLoginStatus();

    if (!loggedIn) {
      userInfo.value = null;
      return;
    }

    if (force || !userInfo.value) {
      await getUserInfo();
    }
  })().finally(() => {
    userSyncPromise = null;
  });

  return userSyncPromise;
}

function syncWhenVisible() {
  if (!document.hidden) {
    void syncUserInfo();
  }
}

async function restoreSelectedScheduleSemester() {
  try {
    const storedSemester = (
      await browser.storage.local.get(SELECTED_SCHEDULE_SEMESTER_STORAGE_KEY)
    )[SELECTED_SCHEDULE_SEMESTER_STORAGE_KEY];

    if (typeof storedSemester === "string" && isKnownSemester(storedSemester)) {
      selectedSemester.value = storedSemester;
    }
  } catch (err) {
    console.error("Failed to restore selected schedule semester:", err);
  }

  await loadCachedSchedule(selectedSemester.value);
}

async function restoreSelectedScheduleWeek() {
  try {
    const storedWeek = (
      await browser.storage.local.get(SELECTED_SCHEDULE_WEEK_STORAGE_KEY)
    )[SELECTED_SCHEDULE_WEEK_STORAGE_KEY];
    const week =
      typeof storedWeek === "number" ? storedWeek : Number(storedWeek);

    if (isKnownWeek(week)) {
      selectedWeek.value = week;
    }
  } catch (err) {
    console.error("Failed to restore selected schedule week:", err);
  }
}

async function restoreCustomServices() {
  try {
    const storedServices = (
      await browser.storage.local.get(CUSTOM_SERVICES_STORAGE_KEY)
    )[CUSTOM_SERVICES_STORAGE_KEY];

    if (!Array.isArray(storedServices)) return;

    const seenIds = new Set<string>();
    const restoredServices = storedServices.flatMap((service) => {
      const normalizedService = normalizeStoredCustomService(service);

      if (!normalizedService || seenIds.has(normalizedService.id)) {
        return [];
      }

      seenIds.add(normalizedService.id);
      return [normalizedService];
    });

    customServices.value = restoredServices;
  } catch (err) {
    console.error("Failed to restore custom services:", err);
  }
}

function retryUserInfo() {
  void syncUserInfo(true);
}

onMounted(() => {
  void syncUserInfo(true);
  void restoreCustomServices();
  void restoreSelectedScheduleSemester();
  void restoreSelectedScheduleWeek();
  window.addEventListener("focus", syncWhenVisible);
  document.addEventListener("visibilitychange", syncWhenVisible);
});

onUnmounted(() => {
  window.removeEventListener("focus", syncWhenVisible);
  document.removeEventListener("visibilitychange", syncWhenVisible);
});
</script>

<template>
  <TopBar
    :active-view="activeView"
    :toolbar-items="toolbarItems"
    :user-info="userInfo"
    :user-error="user_error"
    :user-loading="user_queryLoading"
    @login="openLogin"
    @select-view="selectView"
    @retry-user-info="retryUserInfo"
  />
  <main class="dashboard-page">
    <div class="dashboard-shell">
      <component
        :is="activeViewComponent"
        v-bind="activeViewProps"
        @create-custom-service="createCustomService"
        @delete-custom-service="deleteCustomService"
        @open-service="openService"
        @update-custom-service="updateCustomService"
        @update:query="updateQuery"
        @update:semester="selectScheduleSemester"
        @update:week="selectScheduleWeek"
        @query-schedules="queryCurrentSemesterSchedule"
        @query-grades="queryGrades"
      />
    </div>
  </main>
</template>

<style scoped>
@import "style.css";

.dashboard-page {
  min-height: 100dvh;
  background: var(--bg);
}

.dashboard-shell {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 24px 24px 72px;
}

@media (max-width: 640px) {
  .dashboard-shell {
    padding: 34px 16px 48px;
  }
}
</style>
