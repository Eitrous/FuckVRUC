<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import GradesView from "./components/GradesView.vue";
import LibraryReservationView from "./components/LibraryReservationView.vue";
import ScheduleView from "./components/ScheduleView.vue";
import ServicesView from "./components/ServicesView.vue";
import TopBar from "./components/TopBar.vue";
import type {
  DashboardIcon,
  DashboardViewId,
  LibraryDashboardSection,
  SemesterOption,
  ToolbarItem,
  WeekOption,
} from "./types";

import { builtinServices, resolveMailUrl } from "@/services/services-index";
import type { CustomPortalServiceInput, PortalService } from "@/types/service";
import { useGrades } from "@/composables/useGrades";
import { useLibraryRooms } from "@/composables/useLibraryRooms";
import { useLibraryReservationRecords } from "@/composables/useLibraryReservationRecords";
import { useSchedules } from "@/composables/useSchedules";
import { useUserInfo } from "@/composables/useUserInfo";
import DashboardMessage  from "./components/DashboardMessage.vue";

type DashboardMessageType = "info" | "warning";

const dashboardMessage = ref({
  visible: false,
  text: "",
  type: "info" as DashboardMessageType,
});

let dashboardMessageTimer: number | undefined;

function clearDashboardMessageTimer() {
  if (dashboardMessageTimer !== undefined) {
    window.clearTimeout(dashboardMessageTimer);
    dashboardMessageTimer = undefined;
  }
}

function hideDashboardMessage() {
  clearDashboardMessageTimer();
  dashboardMessage.value.visible = false;
}

function showDashboardMessage(
  text: string,
  type: DashboardMessageType = "info",
  duration = 3200,
) {
  clearDashboardMessageTimer();

  dashboardMessage.value = {
    visible: true,
    text,
    type,
  };

  if (duration > 0) {
    dashboardMessageTimer = window.setTimeout(() => {
      dashboardMessage.value.visible = false;
      dashboardMessageTimer = undefined;
    }, duration);
  }
}

const {
  getUserInfo,
  userInfo,
  user_error,
  user_status,
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

const {
  loading: libraryLoading,
  error: libraryError,
  errorCode: libraryErrorCode,
  page: libraryPage,
  fetchedAt: libraryFetchedAt,
  seatLoading: librarySeatLoading,
  seatError: librarySeatError,
  seatErrorCode: librarySeatErrorCode,
  seatList: librarySeatList,
  seatFetchedAt: librarySeatFetchedAt,
  reservationDetailsLoading: libraryReservationDetailsLoading,
  reservationDetailsError: libraryReservationDetailsError,
  reservationDetailsErrorCode: libraryReservationDetailsErrorCode,
  reservationDetails: libraryReservationDetails,
  reservationDetailsFetchedAt: libraryReservationDetailsFetchedAt,
  reservationEndTimesLoading: libraryReservationEndTimesLoading,
  reservationEndTimesError: libraryReservationEndTimesError,
  reservationEndTimesErrorCode: libraryReservationEndTimesErrorCode,
  reservationEndTimes: libraryReservationEndTimes,
  reservationEndTimesFetchedAt: libraryReservationEndTimesFetchedAt,
  reservationSubmitting: libraryReservationSubmitting,
  reservationError: libraryReservationError,
  reservationErrorCode: libraryReservationErrorCode,
  reservationReceipt: libraryReservationReceipt,
  reservationFetchedAt: libraryReservationFetchedAt,
  queryLibraryRooms,
  clearLibraryRooms,
  queryLibrarySeats,
  clearLibrarySeats,
  queryLibrarySeatReservationDetails,
  queryLibrarySeatEndTimes,
  submitLibraryReservation,
  clearLibraryReservation,
} = useLibraryRooms();

const {
  loading: libraryRecordsLoading,
  error: libraryRecordsError,
  errorCode: libraryRecordsErrorCode,
  page: libraryRecordsPage,
  fetchedAt: libraryRecordsFetchedAt,
  queryLibraryReservationRecords,
  clearLibraryReservationRecords,
} = useLibraryReservationRecords();

const DEFAULT_SCHEDULE_SEMESTER = "2025-2026-2";
const DEFAULT_SCHEDULE_WEEK = 1;
const SELECTED_SCHEDULE_SEMESTER_STORAGE_KEY = "rucScheduleSelectedSemester";
const SELECTED_SCHEDULE_WEEK_STORAGE_KEY = "rucScheduleSelectedWeek";
const CUSTOM_SERVICES_STORAGE_KEY = "rucCustomServices";

const semesterTerms = [
  { value: 5, label: "暑假" },
  { value: 4, label: "国际小学期" },
  { value: 2, label: "春季学期" },
  { value: 3, label: "寒假" },
  { value: 1, label: "秋季学期" },
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
const activeLibrarySection = ref<LibraryDashboardSection>("search");

const toolbarItems: ToolbarItem[] = [
  { id: "services", label: "服务入口" },
  { id: "schedule", label: "课表查询" },
  { id: "grades", label: "成绩查询" },
  { id: "library", label: "图书馆" },
];

const viewComponentMap = {
  services: ServicesView,
  schedule: ScheduleView,
  grades: GradesView,
  library: LibraryReservationView,
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
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="m250.82 90.71l-120-64a5.94 5.94 0 0 0-5.64 0l-120 64a6 6 0 0 0 0 10.58L34 116.67v49.62a14 14 0 0 0 3.55 9.32C50.42 189.94 79.29 214 128 214a127.2 127.2 0 0 0 50-9.73V240a6 6 0 0 0 12 0v-41.65a113.2 113.2 0 0 0 28.45-22.75a13.9 13.9 0 0 0 3.55-9.31v-49.62l28.82-15.38a6 6 0 0 0 0-10.58M128 202c-44 0-70-21.56-81.52-34.41a2 2 0 0 1-.48-1.3v-43.22l79.18 42.22a6 6 0 0 0 5.64 0L178 140.13v51c-13 6.22-29.55 10.87-50 10.87m82-35.71a2 2 0 0 1-.48 1.3A100.3 100.3 0 0 1 190 184.3v-50.57l20-10.66Zm-22.15-45a6.3 6.3 0 0 0-1-.71l-56-29.86a6 6 0 0 0-5.64 10.58l50.04 26.7L128 153.2L20.75 96L128 38.8L235.25 96Z" />`,
  ),
  book: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M232 50h-72a38 38 0 0 0-32 17.55A38 38 0 0 0 96 50H24a6 6 0 0 0-6 6v144a6 6 0 0 0 6 6h72a26 26 0 0 1 26 26a6 6 0 0 0 12 0a26 26 0 0 1 26-26h72a6 6 0 0 0 6-6V56a6 6 0 0 0-6-6M96 194H30V62h66a26 26 0 0 1 26 26v116.31A37.86 37.86 0 0 0 96 194m130 0h-66a37.87 37.87 0 0 0-26 10.32V88a26 26 0 0 1 26-26h66ZM160 90h40a6 6 0 0 1 0 12h-40a6 6 0 0 1 0-12m46 38a6 6 0 0 1-6 6h-40a6 6 0 0 1 0-12h40a6 6 0 0 1 6 6m0 32a6 6 0 0 1-6 6h-40a6 6 0 0 1 0-12h40a6 6 0 0 1 6 6" />`,
  ),
  mail: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M224 50H32a6 6 0 0 0-6 6v136a14 14 0 0 0 14 14h176a14 14 0 0 0 14-14V56a6 6 0 0 0-6-6m-96 85.86L47.42 62h161.16ZM101.67 128L38 186.36V69.64Zm8.88 8.14L124 148.42a6 6 0 0 0 8.1 0l13.4-12.28L208.58 194H47.43Zm43.78-8.14L218 69.64v116.72Z" />`,
  ),
  classroom: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M208 42H48a22 22 0 0 0-22 22v112a22 22 0 0 0 22 22h160a22 22 0 0 0 22-22V64a22 22 0 0 0-22-22m10 134a10 10 0 0 1-10 10H48a10 10 0 0 1-10-10V64a10 10 0 0 1 10-10h160a10 10 0 0 1 10 10Zm-52 48a6 6 0 0 1-6 6H96a6 6 0 0 1 0-12h64a6 6 0 0 1 6 6" />`,
  ),
  squares: icon(
    '<path d="M48 48h64v64H48V48zM144 48h64v64h-64V48zM48 144h64v64H48v-64zM144 144h64v64h-64v-64z" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round" stroke-width="16"/>',
  ),
  link: icon(
    `<path d="M0 0h256v256H0z" fill="none" />
  <path fill="currentColor" d="M164.25 91.75a6 6 0 0 1 0 8.49l-64 64a6 6 0 0 1-8.49-8.48l64-64a6 6 0 0 1 8.49-.01M214.2 41.8a54.07 54.07 0 0 0-76.38 0l-30.07 30.05a6 6 0 0 0 8.49 8.49l30.07-30.06a42 42 0 0 1 59.41 59.41l-30.08 30.07a6 6 0 1 0 8.49 8.49l30.07-30.07a54 54 0 0 0 0-76.38m-74.44 133.84l-30.07 30.08a42 42 0 0 1-59.41-59.41l30.06-30.07a6 6 0 0 0-8.49-8.49l-30 30.07a54 54 0 0 0 76.38 76.39l30.07-30.08a6 6 0 0 0-8.49-8.49Z" />`
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
  <path fill="currentColor" d="M128 26a102 102 0 1 0 102 102A102.12 102.12 0 0 0 128 26m0 12a89.53 89.53 0 0 1 50 15.2V74a2 2 0 0 1-.48 1.31L155.35 101a2 2 0 0 1-1.25.68L122.63 106a2 2 0 0 1-1.44-.36l-.24-.16l-19.7-12.89a14 14 0 0 0-19.71 3.64l-21 31.3a13.94 13.94 0 0 0-2.36 7.71L58 171.45a2 2 0 0 1-.9 1.66l-5 3.27A90 90 0 0 1 128 38M59.28 186.05l4.43-2.9A14 14 0 0 0 70 171.52l.21-36.23a2.05 2.05 0 0 1 .33-1.1l21-31.3a2 2 0 0 1 1.31-.86a2 2 0 0 1 1.52.35l.24.16l19.7 12.89a13.93 13.93 0 0 0 10 2.44l31.47-4.26a14 14 0 0 0 8.73-4.74l22.17-25.76A14 14 0 0 0 190 74V62.82a89.91 89.91 0 0 1 22.68 95.67l-18.4-16.82a14 14 0 0 0-14.82-2.6L149 151.73a14.11 14.11 0 0 0-8.48 10.89l-2.38 16.19a14 14 0 0 0 10.3 15.58L169.9 200a2.1 2.1 0 0 1 .91.53l4.18 4.18a89.86 89.86 0 0 1-115.71-18.66m125.62 11.63l-5.59-5.61a14 14 0 0 0-6.36-3.65l-21.46-5.63a2 2 0 0 1-1.47-2.23l2.39-16.19a2 2 0 0 1 1.21-1.56l30.45-12.66a2 2 0 0 1 2.12.37l21.36 19.54a90.8 90.8 0 0 1-22.65 27.62" />`
  ),
  loading: icon(
    `<path d="M0 0h24v24H0z" fill="none" />
  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path stroke-dasharray="18" d="M12 3c4.97 0 9 4.03 9 9">
      <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="18;0" />
      <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
    </path>
    <path stroke-dasharray="60" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z" opacity=".3">
      <animate fill="freeze" attributeName="stroke-dashoffset" dur="1.2s" values="60;0" />
    </path>
  </g>`
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
  return serviceIcons[service.id] ?? icons.link;
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

  if (activeView.value === "library") {
    return {
      icon: icons.book,
      section: activeLibrarySection.value,
      loading: libraryLoading.value,
      error: libraryError.value,
      errorCode: libraryErrorCode.value,
      fetchedAt: libraryFetchedAt.value,
      page: libraryPage.value,
      seatLoading: librarySeatLoading.value,
      seatError: librarySeatError.value,
      seatErrorCode: librarySeatErrorCode.value,
      seatList: librarySeatList.value,
      seatFetchedAt: librarySeatFetchedAt.value,
      reservationDetailsLoading: libraryReservationDetailsLoading.value,
      reservationDetailsError: libraryReservationDetailsError.value,
      reservationDetailsErrorCode: libraryReservationDetailsErrorCode.value,
      reservationDetails: libraryReservationDetails.value,
      reservationDetailsFetchedAt: libraryReservationDetailsFetchedAt.value,
      reservationEndTimesLoading: libraryReservationEndTimesLoading.value,
      reservationEndTimesError: libraryReservationEndTimesError.value,
      reservationEndTimesErrorCode: libraryReservationEndTimesErrorCode.value,
      reservationEndTimes: libraryReservationEndTimes.value,
      reservationEndTimesFetchedAt: libraryReservationEndTimesFetchedAt.value,
      reservationSubmitting: libraryReservationSubmitting.value,
      reservationError: libraryReservationError.value,
      reservationErrorCode: libraryReservationErrorCode.value,
      reservationReceipt: libraryReservationReceipt.value,
      reservationFetchedAt: libraryReservationFetchedAt.value,
      recordsLoading: libraryRecordsLoading.value,
      recordsError: libraryRecordsError.value,
      recordsErrorCode: libraryRecordsErrorCode.value,
      recordsPage: libraryRecordsPage.value,
      recordsFetchedAt: libraryRecordsFetchedAt.value,
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
  if (
    activeView.value === "library" &&
    viewId !== "library" &&
    libraryReservationSubmitting.value
  ) {
    showDashboardMessage(
      "预约正在提交，请等待结果确认后再离开。",
      "warning",
      5000,
    );
    return;
  }

  if (activeView.value === "library" && viewId !== "library") {
    clearLibraryRooms();
    clearLibraryReservationRecords();
  }

  activeView.value = viewId;

  if (viewId === "schedule" && schedules.value.length === 0) {
    void loadCachedSchedule(selectedSemester.value);
  }
}

function selectLibrarySection(section: LibraryDashboardSection) {
  if (
    activeView.value === "library" &&
    section !== activeLibrarySection.value &&
    libraryReservationSubmitting.value
  ) {
    showDashboardMessage(
      "预约正在提交，请等待结果确认后再切换。",
      "warning",
      5000,
    );
    return;
  }

  activeLibrarySection.value = section;
  selectView("library");
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
    // console.error("Failed to save selected schedule semester:", err);
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
    // console.error("Failed to save selected schedule week:", err);
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
    // console.error("Failed to save custom services:", err);
    showDashboardMessage("保存自定义服务失败", "warning", 5000);
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
  if (url === '') {
    showDashboardMessage("无法打开邮箱服务，请手动打开一次邮箱", "warning", 5000);
  } else {
    browser.tabs.create({ url });
  }
}

function openLogin() {
  browser.tabs.create({ url: "https://jw.ruc.edu.cn/" });
}

let userSyncPromise: Promise<void> | null = null;
let userSyncPending = false;
let userSyncDisposed = false;
let lastUserSyncAt = 0;
let userSyncTimer: number | undefined;
const USER_SYNC_MIN_INTERVAL_MS = 2_000;

async function syncUserInfo(force = false) {
  if (force && userSyncTimer !== undefined) {
    window.clearTimeout(userSyncTimer);
    userSyncTimer = undefined;
  }

  if (userSyncPromise) {
    userSyncPending = true;
    return userSyncPromise;
  }

  const elapsed = Date.now() - lastUserSyncAt;
  if (!force && elapsed < USER_SYNC_MIN_INTERVAL_MS) {
    if (userSyncTimer === undefined) {
      userSyncTimer = window.setTimeout(() => {
        userSyncTimer = undefined;
        void syncUserInfo(true);
      }, USER_SYNC_MIN_INTERVAL_MS - elapsed);
    }
    return;
  }

  userSyncPromise = (async () => {
    await getUserInfo();
  })().finally(() => {
    lastUserSyncAt = Date.now();
    userSyncPromise = null;

    if (userSyncPending && !userSyncDisposed) {
      userSyncPending = false;
      void syncUserInfo(true);
    }
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
    // console.error("Failed to restore selected schedule semester:", err);
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
    // console.error("Failed to restore selected schedule week:", err);
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
    // console.error("Failed to restore custom services:", err);
  }
}

function retryUserInfo() {
  void syncUserInfo(true);
}

watch(
  error,
  (message) => {
    if (message) {
      showDashboardMessage("查询失败，请先登录教务系统", "warning", 5000);
    }
  },
);

watch(
  schedule_error,
  (message) => {
    if (message) {
      showDashboardMessage("查询失败，请先登录教务系统", "warning", 5000);
    }
  },
);

watch(
  libraryError,
  (message) => {
    if (message) {
      showDashboardMessage("图书馆余座查询失败，请检查登录状态或网络连接", "warning", 5000);
    }
  },
);

watch(
  libraryReservationReceipt,
  (receipt) => {
    if (receipt) {
      clearLibraryReservationRecords();
    }
  },
);

onMounted(() => {
  void syncUserInfo(true);
  void restoreCustomServices();
  void restoreSelectedScheduleSemester();
  void restoreSelectedScheduleWeek();
  window.addEventListener("focus", syncWhenVisible);
  document.addEventListener("visibilitychange", syncWhenVisible);
});

onUnmounted(() => {
  clearDashboardMessageTimer();
  clearLibraryReservationRecords();
  userSyncDisposed = true;
  userSyncPending = false;
  if (userSyncTimer !== undefined) {
    window.clearTimeout(userSyncTimer);
  }
  window.removeEventListener("focus", syncWhenVisible);
  document.removeEventListener("visibilitychange", syncWhenVisible);
});
</script>

<template>
  <TopBar
    :active-view="activeView"
    :active-library-section="activeLibrarySection"
    :library-navigation-disabled="libraryReservationSubmitting"
    :toolbar-items="toolbarItems"
    :user-info="userInfo"
    :user-error="user_error"
    :user-status="user_status"
    @login="openLogin"
    @select-view="selectView"
    @select-library-section="selectLibrarySection"
    @retry-user-info="retryUserInfo"
    @show-dashboard-message="showDashboardMessage"
  />
  <DashboardMessage
    :visible="dashboardMessage.visible"
    :text="dashboardMessage.text"
    :type="dashboardMessage.type"
    @close="hideDashboardMessage"
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
        @query-rooms="queryLibraryRooms"
        @clear-results="clearLibraryRooms"
        @query-seats="queryLibrarySeats"
        @clear-seats="clearLibrarySeats"
        @query-reservation-details="queryLibrarySeatReservationDetails"
        @query-reservation-end-times="queryLibrarySeatEndTimes"
        @submit-reservation="submitLibraryReservation"
        @clear-reservation="clearLibraryReservation"
        @query-reservation-records="queryLibraryReservationRecords"
        @clear-reservation-records="clearLibraryReservationRecords"
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
