<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import { Icon } from "@iconify/vue";

import {
  LIBRARY_BUILDINGS,
  type LibraryBuildingId,
  type LibraryFloorId,
  type LibraryQueryErrorCode,
  type LibraryReservationErrorCode,
  type LibraryReservationRecordPage,
  type LibraryReservationRecordsQueryParams,
  type LibraryReservationReceipt,
  type LibraryReservationStartValue,
  type LibraryReservationSubmitParams,
  type LibraryRoom,
  type LibraryRoomPage,
  type LibraryRoomQueryParams,
  type LibrarySeat,
  type LibrarySeatEndTimesQueryParams,
  type LibrarySeatList,
  type LibrarySeatQueryParams,
  type LibrarySeatReservationDetails,
  type LibrarySeatReservationDetailsQueryParams,
  type LibrarySeatStatus,
  type LibraryTimeOption,
} from "@/types/library";
import type { DashboardIcon, LibraryDashboardSection } from "../types";
import LibraryReservationRecordsPanel from "./LibraryReservationRecordsPanel.vue";

const DEFAULT_BUILDING_ID = "1875080631899230208" as LibraryBuildingId;
const PAGE_SIZE = 20;

const props = defineProps<{
  icon: DashboardIcon;
  section: LibraryDashboardSection;
  loading: boolean;
  error?: string;
  errorCode?: LibraryQueryErrorCode;
  fetchedAt?: number;
  page?: LibraryRoomPage | null;
  seatLoading: boolean;
  seatError?: string;
  seatErrorCode?: LibraryQueryErrorCode;
  seatFetchedAt?: number;
  seatList?: LibrarySeatList | null;
  reservationDetailsLoading: boolean;
  reservationDetailsError?: string;
  reservationDetailsErrorCode?: LibraryQueryErrorCode;
  reservationDetails?: LibrarySeatReservationDetails | null;
  reservationDetailsFetchedAt?: number;
  reservationEndTimesLoading: boolean;
  reservationEndTimesError?: string;
  reservationEndTimesErrorCode?: LibraryQueryErrorCode;
  reservationEndTimes?: LibraryTimeOption<number>[] | null;
  reservationEndTimesFetchedAt?: number;
  reservationSubmitting: boolean;
  reservationError?: string;
  reservationErrorCode?: LibraryReservationErrorCode;
  reservationReceipt?: LibraryReservationReceipt | null;
  reservationFetchedAt?: number;
  recordsLoading: boolean;
  recordsError?: string;
  recordsErrorCode?: LibraryQueryErrorCode;
  recordsPage?: LibraryReservationRecordPage | null;
  recordsFetchedAt?: number;
}>();

const emit = defineEmits<{
  (event: "query-rooms", params: LibraryRoomQueryParams): void;
  (event: "clear-results"): void;
  (event: "query-seats", params: LibrarySeatQueryParams): void;
  (event: "clear-seats"): void;
  (
    event: "query-reservation-details",
    params: LibrarySeatReservationDetailsQueryParams,
  ): void;
  (
    event: "query-reservation-end-times",
    params: LibrarySeatEndTimesQueryParams,
  ): void;
  (event: "submit-reservation", params: LibraryReservationSubmitParams): void;
  (event: "clear-reservation"): void;
  (
    event: "query-reservation-records",
    params: LibraryReservationRecordsQueryParams,
  ): void;
  (event: "clear-reservation-records"): void;
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
const isSeatModalOpen = ref(false);
const selectedRoom = ref<LibraryRoom | null>(null);
const selectedSeatParams = ref<LibrarySeatQueryParams | null>(null);
const reservationStage = ref<"seats" | "booking" | "success">("seats");
const selectedSeat = ref<LibrarySeat | null>(null);
const selectedStartTime = ref<LibraryReservationStartValue | null>(null);
const selectedEndTime = ref<number | null>(null);
const seatModal = ref<HTMLElement | null>(null);
const seatModalCloseButton = ref<HTMLButtonElement | null>(null);
const bookingHeading = ref<HTMLHeadingElement | null>(null);
const successHeading = ref<HTMLHeadingElement | null>(null);
let seatModalTrigger: HTMLButtonElement | null = null;
let pendingSeatFocusId: string | null = null;
let bodyOverflowBeforeModal: string | null = null;

type ReservationPrefillCandidate = {
  session: number;
  startTime: LibraryReservationStartValue;
  endTime: number;
  phase: "details" | "end-times";
  endTimesRequestStarted: boolean;
};

let reservationSession = 0;
let reservationPrefillCandidate: ReservationPrefillCandidate | null = null;
let reservationAttemptKey: string | null = null;

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
const seats = computed(() => props.seatList?.items ?? []);
const selectedStartOption = computed(() => {
  const selectedValue = selectedStartTime.value;

  if (selectedValue === null) return null;

  return (
    props.reservationDetails?.startTimes.find((option) => {
      return sameStartValue(option.value, selectedValue);
    }) ?? null
  );
});
const selectedEndOption = computed(() => {
  if (selectedEndTime.value === null) return null;

  return (
    props.reservationEndTimes?.find((option) => {
      return option.value === selectedEndTime.value;
    }) ?? null
  );
});
const reservationLocation = computed(() => {
  if (!selectedRoom.value) return "";

  return [
    selectedRoom.value.buildingName,
    selectedRoom.value.floorName,
    selectedRoom.value.name,
  ]
    .filter(Boolean)
    .join(" · ");
});
const currentReservationSelectionKey = computed(() => {
  if (
    !selectedSeat.value ||
    !selectedSeatParams.value ||
    selectedStartTime.value === null ||
    selectedEndTime.value === null
  ) {
    return null;
  }

  return [
    selectedSeat.value.id,
    selectedSeatParams.value.date,
    encodeStartValue(selectedStartTime.value),
    selectedEndTime.value,
  ].join("::");
});
const hasCurrentReservationError = computed(() => {
  return Boolean(
    (props.reservationError || props.reservationErrorCode) &&
    reservationAttemptKey &&
    reservationAttemptKey === currentReservationSelectionKey.value,
  );
});
const isReservationResultUncertain = computed(() => {
  return props.reservationErrorCode === "RESULT_UNCERTAIN";
});
const canSubmitReservation = computed(() => {
  return (
    reservationStage.value === "booking" &&
    selectedSeat.value !== null &&
    selectedStartOption.value !== null &&
    selectedEndOption.value !== null &&
    !props.reservationDetailsLoading &&
    !props.reservationEndTimesLoading &&
    !props.reservationSubmitting &&
    !props.reservationReceipt &&
    !isReservationResultUncertain.value
  );
});
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

const seatErrorTitle = computed(() => {
  switch (props.seatErrorCode) {
    case "AUTH_PENDING":
      return "正在连接图书馆系统";
    case "AUTH_REQUIRED":
      return "需要登录图书馆系统";
    case "NETWORK":
      return "无法连接图书馆系统";
    case "INVALID_RESPONSE":
      return "图书馆返回了异常座位数据";
    case "API_ERROR":
      return "座位详情查询失败";
    default:
      return "座位详情查询失败";
  }
});

const seatErrorDetail = computed(() => {
  if (props.seatError?.trim()) return props.seatError;

  switch (props.seatErrorCode) {
    case "AUTH_PENDING":
      return "正在通过统一身份认证获取图书馆登录状态。";
    case "AUTH_REQUIRED":
      return "请完成图书馆统一身份认证后重试。";
    case "NETWORK":
      return "请确认当前网络可访问校内服务，校外使用时请先连接学校 VPN。";
    case "INVALID_RESPONSE":
      return "暂时无法读取该区域的座位数据，请稍后重试。";
    case "API_ERROR":
      return "图书馆服务暂时不可用，请稍后重试。";
    default:
      return "暂时无法完成查询，请稍后重试。";
  }
});

function libraryErrorTitle(
  errorCode: LibraryQueryErrorCode | undefined,
  fallback: string,
) {
  switch (errorCode) {
    case "AUTH_PENDING":
      return "正在连接图书馆系统";
    case "AUTH_REQUIRED":
      return "需要登录图书馆系统";
    case "NETWORK":
      return "无法连接图书馆系统";
    case "INVALID_RESPONSE":
      return "图书馆返回了异常数据";
    case "API_ERROR":
      return fallback;
    default:
      return fallback;
  }
}

function libraryErrorDetail(
  error: string | undefined,
  errorCode: LibraryQueryErrorCode | undefined,
  fallback: string,
) {
  if (error?.trim()) return error;

  switch (errorCode) {
    case "AUTH_PENDING":
      return "正在通过统一身份认证获取图书馆登录状态。";
    case "AUTH_REQUIRED":
      return "请完成图书馆统一身份认证后重试。";
    case "NETWORK":
      return "请确认当前网络可访问校内服务，校外使用时请先连接学校 VPN。";
    case "INVALID_RESPONSE":
      return "图书馆返回的数据无法识别，请稍后重试。";
    case "API_ERROR":
      return "图书馆服务暂时不可用，请稍后重试。";
    default:
      return fallback;
  }
}

const reservationDetailsErrorTitle = computed(() => {
  return libraryErrorTitle(
    props.reservationDetailsErrorCode,
    "预约时间查询失败",
  );
});

const reservationDetailsErrorDetail = computed(() => {
  return libraryErrorDetail(
    props.reservationDetailsError,
    props.reservationDetailsErrorCode,
    "暂时无法读取该座位的可预约时间，请稍后重试。",
  );
});

const reservationEndTimesErrorTitle = computed(() => {
  return libraryErrorTitle(
    props.reservationEndTimesErrorCode,
    "结束时间查询失败",
  );
});

const reservationEndTimesErrorDetail = computed(() => {
  return libraryErrorDetail(
    props.reservationEndTimesError,
    props.reservationEndTimesErrorCode,
    "暂时无法读取可选结束时间，请重新选择开始时间后重试。",
  );
});

const reservationErrorTitle = computed(() => {
  switch (props.reservationErrorCode) {
    case "CAPTCHA_REQUIRED":
      return "当前预约需要验证码";
    case "RESERVATION_REJECTED":
      return "图书馆未接受预约";
    case "RESULT_UNCERTAIN":
      return "预约结果暂时无法确认";
    default:
      return libraryErrorTitle(props.reservationErrorCode, "预约提交失败");
  }
});

const reservationErrorDetail = computed(() => {
  switch (props.reservationErrorCode) {
    case "CAPTCHA_REQUIRED":
      return props.reservationError?.trim()
        ? `${props.reservationError} 本面板暂不支持完成此类验证码。`
        : "该预约触发了图书馆验证码，本面板暂不支持完成此类验证。";
    case "RESERVATION_REJECTED":
      return (
        props.reservationError?.trim() ||
        "所选时段可能已被占用或不符合预约规则，请核对后再试。"
      );
    case "RESULT_UNCERTAIN":
      return "请求可能已经到达图书馆。为避免重复预约，请先到图书馆预约系统核对预约记录。";
    default:
      return libraryErrorDetail(
        props.reservationError,
        props.reservationErrorCode,
        "暂时无法提交预约，请稍后重试。",
      );
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

function formatMinute(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatSeatQueryTime(params: LibrarySeatQueryParams | null) {
  if (!params || params.beginMinute < 0) return "时间不限";
  if (params.endMinute === 0) return `${formatMinute(params.beginMinute)} 起`;

  return `${formatMinute(params.beginMinute)}–${formatMinute(params.endMinute)}`;
}

function sameStartValue(
  first: LibraryReservationStartValue,
  second: LibraryReservationStartValue,
) {
  return first === second;
}

function encodeStartValue(value: LibraryReservationStartValue) {
  return value === "now" ? "now" : String(value);
}

function parseStartValue(value: string): LibraryReservationStartValue | null {
  if (value === "now") return "now";
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 && parsed < 24 * 60
    ? parsed
    : null;
}

function parseEndValue(value: string) {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 && parsed <= 24 * 60
    ? parsed
    : null;
}

function timelineLeft(value: number) {
  return `${Math.min(100, Math.max(0, value))}%`;
}

function timelineWidth(left: number, width: number) {
  const safeLeft = Math.min(100, Math.max(0, left));

  return `${Math.min(100 - safeLeft, Math.max(0, width))}%`;
}

function receiptLocation(receipt: LibraryReservationReceipt) {
  if (receipt.location.trim()) return receipt.location;

  return [receipt.buildingName, receipt.floorName, receipt.roomName]
    .filter(Boolean)
    .join(" · ");
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

  const startMinute = filters.startTime ? parseTime(filters.startTime) : null;
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

  if (startMinute !== null && endMinute !== null && endMinute <= startMinute) {
    return "结束时间必须晚于开始时间。";
  }

  return "";
}

function markFiltersChanged() {
  if (isSeatModalOpen.value) closeSeatModal();
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

  if (isSeatModalOpen.value) closeSeatModal();
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

  if (isSeatModalOpen.value) closeSeatModal();
  lastSubmittedParams.value = params;
  emit("query-rooms", { ...params });
}

function formatCount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("zh-CN") : "-";
}

function availabilityLabel(room: LibraryRoom) {
  return room.seatFree > 0 ? "有余座" : "暂无余座";
}

function lockBodyScroll() {
  if (bodyOverflowBeforeModal !== null) return;

  bodyOverflowBeforeModal = document.body.style.overflow;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  if (bodyOverflowBeforeModal === null) return;

  document.body.style.overflow = bodyOverflowBeforeModal;
  bodyOverflowBeforeModal = null;
}

function openSeatModal(room: LibraryRoom, event: MouseEvent) {
  const submitted = lastSubmittedParams.value;
  const trigger = event.currentTarget;

  if (!submitted || !(trigger instanceof HTMLButtonElement)) return;

  const params: LibrarySeatQueryParams = {
    roomId: room.id,
    date: submitted.date,
    beginMinute: submitted.beginMinute,
    endMinute: submitted.endMinute,
  };

  selectedRoom.value = room;
  selectedSeatParams.value = params;
  reservationStage.value = "seats";
  selectedSeat.value = null;
  selectedStartTime.value = null;
  selectedEndTime.value = null;
  reservationSession += 1;
  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  pendingSeatFocusId = null;
  seatModalTrigger = trigger;
  isSeatModalOpen.value = true;
  lockBodyScroll();
  emit("clear-reservation");
  emit("query-seats", { ...params });

  void nextTick(() => seatModalCloseButton.value?.focus());
}

function closeSeatModal() {
  if (!isSeatModalOpen.value || props.reservationSubmitting) return;

  const trigger = seatModalTrigger;

  isSeatModalOpen.value = false;
  reservationStage.value = "seats";
  selectedRoom.value = null;
  selectedSeatParams.value = null;
  selectedSeat.value = null;
  selectedStartTime.value = null;
  selectedEndTime.value = null;
  reservationSession += 1;
  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  pendingSeatFocusId = null;
  seatModalTrigger = null;
  emit("clear-reservation");
  emit("clear-seats");
  unlockBodyScroll();

  void nextTick(() => {
    if (trigger?.isConnected) trigger.focus();
  });
}

function retrySeatQuery() {
  if (props.seatLoading || !selectedSeatParams.value) return;

  emit("query-seats", { ...selectedSeatParams.value });
}

function createPrefillCandidate() {
  const params = selectedSeatParams.value;

  if (!params || params.endMinute <= 0) return null;

  if (params.beginMinute >= 0) {
    return {
      session: reservationSession,
      startTime: params.beginMinute,
      endTime: params.endMinute,
      phase: "details" as const,
      endTimesRequestStarted: false,
    };
  }

  if (params.beginMinute === -1) {
    return {
      session: reservationSession,
      startTime: "now" as const,
      endTime: params.endMinute,
      phase: "details" as const,
      endTimesRequestStarted: false,
    };
  }

  return null;
}

function openSeatBooking(seat: LibrarySeat, event: MouseEvent) {
  const params = selectedSeatParams.value;
  const trigger = event.currentTarget;

  if (
    !params ||
    props.reservationSubmitting ||
    !(trigger instanceof HTMLButtonElement)
  ) {
    return;
  }

  reservationSession += 1;
  selectedSeat.value = seat;
  selectedStartTime.value = null;
  selectedEndTime.value = null;
  pendingSeatFocusId = seat.id;
  reservationPrefillCandidate = createPrefillCandidate();
  reservationAttemptKey = null;
  reservationStage.value = "booking";
  emit("clear-reservation");
  emit("query-reservation-details", {
    seatId: seat.id,
    date: params.date,
  });

  void nextTick(() => bookingHeading.value?.focus());
}

function findSeatButton(seatId: string) {
  if (!seatModal.value) return null;

  return (
    Array.from(
      seatModal.value.querySelectorAll<HTMLButtonElement>(
        ".seat-item-button[data-seat-id]",
      ),
    ).find((button) => button.dataset.seatId === seatId) ?? null
  );
}

function focusReturnedSeat(seatId: string) {
  void nextTick(() => {
    const seatButton = findSeatButton(seatId);

    if (seatButton) {
      seatButton.focus();
      pendingSeatFocusId = null;
      return;
    }

    seatModalCloseButton.value?.focus();
  });
}

function returnToSeatList(options: { refresh: boolean }) {
  if (props.reservationSubmitting) return;

  const seatId = selectedSeat.value?.id ?? pendingSeatFocusId;
  const params = selectedSeatParams.value;

  reservationSession += 1;
  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  selectedStartTime.value = null;
  selectedEndTime.value = null;
  selectedSeat.value = null;
  reservationStage.value = "seats";
  emit("clear-reservation");

  if (options.refresh && params) {
    pendingSeatFocusId = seatId;
    emit("query-seats", { ...params });
    void nextTick(() => seatModalCloseButton.value?.focus());
    return;
  }

  if (seatId) focusReturnedSeat(seatId);
}

function retryReservationDetails() {
  const seat = selectedSeat.value;
  const params = selectedSeatParams.value;

  if (!seat || !params || props.reservationDetailsLoading) return;

  emit("query-reservation-details", {
    seatId: seat.id,
    date: params.date,
  });
}

function queryReservationEndTimes(startTime: LibraryReservationStartValue) {
  const seat = selectedSeat.value;
  const params = selectedSeatParams.value;

  if (!seat || !params) return;

  emit("query-reservation-end-times", {
    seatId: seat.id,
    date: params.date,
    startTime,
  });
}

function updateReservationStart(event: Event) {
  if (props.reservationSubmitting) return;

  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  selectedEndTime.value = null;
  const value = parseStartValue((event.target as HTMLSelectElement).value);
  selectedStartTime.value = value;

  if (value !== null) queryReservationEndTimes(value);
}

function updateReservationEnd(event: Event) {
  if (props.reservationSubmitting) return;

  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  selectedEndTime.value = parseEndValue(
    (event.target as HTMLSelectElement).value,
  );
}

function retryReservationEndTimes() {
  if (selectedStartTime.value === null || props.reservationEndTimesLoading) {
    return;
  }

  reservationPrefillCandidate = null;
  reservationAttemptKey = null;
  selectedEndTime.value = null;
  queryReservationEndTimes(selectedStartTime.value);
}

function submitReservation() {
  const seat = selectedSeat.value;
  const params = selectedSeatParams.value;
  const startTime = selectedStartOption.value?.value;
  const endTime = selectedEndOption.value?.value;

  if (
    !canSubmitReservation.value ||
    !seat ||
    !params ||
    startTime === undefined ||
    endTime === undefined
  ) {
    return;
  }

  reservationAttemptKey = currentReservationSelectionKey.value;

  emit("submit-reservation", {
    seatId: seat.id,
    date: params.date,
    startTime,
    endTime,
  });
}

function seatStatusLabel(status: LibrarySeatStatus) {
  switch (status) {
    case "FREE":
      return "空闲";
    case "IN_USE":
      return "使用中";
    case "AWAY":
      return "暂离";
    default:
      return "状态未知";
  }
}

function seatStatusClass(status: LibrarySeatStatus) {
  return `is-${status.toLowerCase().replace("_", "-")}`;
}

function modalFocusableElements() {
  if (!seatModal.value) return [];

  const selector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(
    seatModal.value.querySelectorAll<HTMLElement>(selector),
  ).filter(
    (element) =>
      !element.hasAttribute("hidden") && element.offsetParent !== null,
  );
}

function handleSeatModalKeydown(event: KeyboardEvent) {
  if (!isSeatModalOpen.value) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeSeatModal();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = modalFocusableElements();
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = document.activeElement;

  if (!first || !last) {
    event.preventDefault();
    seatModal.value?.focus();
    return;
  }

  if (
    event.shiftKey &&
    (activeElement === first || !seatModal.value?.contains(activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (activeElement === last || !seatModal.value?.contains(activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => props.reservationDetails,
  (details) => {
    const candidate = reservationPrefillCandidate;

    if (
      !details ||
      !candidate ||
      candidate.phase !== "details" ||
      candidate.session !== reservationSession ||
      reservationStage.value !== "booking"
    ) {
      return;
    }

    const hasStartTime = details.startTimes.some((option) => {
      return sameStartValue(option.value, candidate.startTime);
    });

    if (!hasStartTime) {
      reservationPrefillCandidate = null;
      return;
    }

    candidate.phase = "end-times";
    queryReservationEndTimes(candidate.startTime);
  },
);

watch(
  () => props.reservationEndTimesLoading,
  (loading) => {
    if (
      loading &&
      reservationPrefillCandidate?.phase === "end-times" &&
      reservationPrefillCandidate.session === reservationSession
    ) {
      reservationPrefillCandidate.endTimesRequestStarted = true;
    }
  },
);

watch(
  () => props.reservationEndTimes,
  (endTimes) => {
    const candidate = reservationPrefillCandidate;

    if (
      !endTimes ||
      !candidate ||
      candidate.phase !== "end-times" ||
      !candidate.endTimesRequestStarted ||
      props.reservationEndTimesLoading ||
      candidate.session !== reservationSession ||
      reservationStage.value !== "booking"
    ) {
      return;
    }

    const hasEndTime = endTimes.some((option) => {
      return option.value === candidate.endTime;
    });

    if (hasEndTime) {
      selectedStartTime.value = candidate.startTime;
      selectedEndTime.value = candidate.endTime;
    }

    reservationPrefillCandidate = null;
  },
);

watch(
  () => [props.reservationEndTimesError, props.reservationEndTimesErrorCode],
  ([error, errorCode]) => {
    if (
      (error || errorCode) &&
      reservationPrefillCandidate?.phase === "end-times"
    ) {
      reservationPrefillCandidate = null;
    }
  },
);

watch(
  () => props.reservationReceipt,
  (receipt) => {
    if (!receipt || !isSeatModalOpen.value || !selectedSeat.value) return;

    reservationPrefillCandidate = null;
    reservationStage.value = "success";
    void nextTick(() => successHeading.value?.focus());
  },
);

watch(
  () => props.seatLoading,
  (loading) => {
    if (loading || reservationStage.value !== "seats" || !pendingSeatFocusId) {
      return;
    }

    focusReturnedSeat(pendingSeatFocusId);
  },
);

watch(
  () => props.section,
  (section) => {
    if (section === "records" && isSeatModalOpen.value) {
      closeSeatModal();
    }
  },
);

onMounted(() => window.addEventListener("keydown", handleSeatModalKeydown));

onUnmounted(() => {
  window.removeEventListener("keydown", handleSeatModalKeydown);
  emit("clear-reservation");
  emit("clear-seats");
  emit("clear-reservation-records");
  unlockBodyScroll();
});
</script>

<template>
  <article
    class="data-panel"
    :aria-busy="
      props.section === 'search' ? props.loading : props.recordsLoading
    "
  >
    <header class="panel-header">
      <div class="panel-title">
        <Icon :icon="props.icon" aria-hidden="true" />
        <div>
          <h2>
            {{ props.section === "search" ? "图书馆座位预约" : "预约记录" }}
          </h2>
          <!-- <p
            v-if="
              props.section === 'search'
                ? props.fetchedAt
                : props.recordsFetchedAt
            "
            class="timestamp"
          >
            更新时间：{{
              formatDateTime(
                props.section === "search"
                  ? props.fetchedAt!
                  : props.recordsFetchedAt!,
              )
            }}
          </p> -->
        </div>
      </div>
    </header>

    <template v-if="props.section === 'search'">
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
        </div>

        <div class="query-action">
          <button
            class="primary-button"
            type="submit"
            :disabled="props.loading"
          >
            {{ props.loading ? "正在查询" : "查询余座" }}
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
            <button
              v-for="room in rooms"
              :key="room.id"
              class="room-card room-card-button"
              type="button"
              aria-haspopup="dialog"
              :aria-label="`${room.name}，${room.buildingName}，${room.floorName}，空闲 ${room.seatFree} 个，共 ${room.seatTotal} 个座位，查看座位详情`"
              @click="openSeatModal(room, $event)"
            >
              <span class="room-card-header">
                <span class="room-title-group">
                  <span class="room-card-title">{{ room.name }}</span>
                  <span class="room-card-location">
                    {{ room.buildingName }}，{{ room.floorName }}
                  </span>
                </span>
                <span
                  class="availability-label"
                  :class="{ 'is-empty': room.seatFree <= 0 }"
                >
                  {{ availabilityLabel(room) }}
                </span>
              </span>

              <span class="seat-counts" aria-label="座位数量">
                <span class="free-count">
                  <strong>{{ formatCount(room.seatFree) }}</strong>
                  <span class="count-label">空闲座位</span>
                </span>
                <span class="total-count">
                  <strong>{{ formatCount(room.seatTotal) }}</strong>
                  <span class="count-label">总座位</span>
                </span>
              </span>
            </button>
          </div>

          <nav
            v-if="totalPages > 1"
            class="pagination"
            aria-label="余座查询分页"
          >
            <button
              class="page-button"
              type="button"
              :disabled="!canGoPrevious"
              @click="queryPage(currentPage - 1)"
            >
              上一页
            </button>
            <span aria-current="page"
              >{{ currentPage }} / {{ totalPages }}</span
            >
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

      <div
        v-if="isSeatModalOpen && selectedRoom"
        class="seat-modal-backdrop"
        @click.self="closeSeatModal"
      >
        <section
          ref="seatModal"
          class="seat-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seat-modal-title"
          aria-describedby="seat-modal-context"
          tabindex="-1"
        >
          <header class="seat-modal-header">
            <div>
              <span class="seat-modal-eyebrow">
                {{
                  reservationStage === "seats"
                    ? "区域座位"
                    : reservationStage === "booking"
                      ? "座位预约"
                      : "预约回执"
                }}
              </span>
              <h3 v-if="reservationStage === 'seats'" id="seat-modal-title">
                {{ selectedRoom.name }}
              </h3>
              <h3
                v-else-if="reservationStage === 'booking'"
                id="seat-modal-title"
                ref="bookingHeading"
                tabindex="-1"
              >
                {{ selectedSeat?.label }} 座位预约
              </h3>
              <h3
                v-else
                id="seat-modal-title"
                ref="successHeading"
                tabindex="-1"
              >
                预约成功
              </h3>
              <p id="seat-modal-context">
                {{ reservationLocation }} · {{ selectedSeatParams?.date }}
                <template v-if="reservationStage === 'seats'">
                  · {{ formatSeatQueryTime(selectedSeatParams) }}
                </template>
              </p>
              <p
                v-if="reservationStage === 'seats' && props.seatFetchedAt"
                class="seat-modal-timestamp"
              >
                更新时间：{{ formatDateTime(props.seatFetchedAt) }}
              </p>
              <p
                v-else-if="
                  reservationStage === 'booking' &&
                  props.reservationDetailsFetchedAt
                "
                class="seat-modal-timestamp"
              >
                可预约时间更新于：{{
                  formatDateTime(props.reservationDetailsFetchedAt)
                }}
              </p>
            </div>
            <div class="seat-modal-actions">
              <button
                v-if="reservationStage === 'booking'"
                class="seat-modal-back"
                type="button"
                :disabled="props.reservationSubmitting"
                @click="returnToSeatList({ refresh: false })"
              >
                返回座位
              </button>
              <button
                ref="seatModalCloseButton"
                class="seat-modal-close"
                type="button"
                aria-label="关闭座位详情"
                :disabled="props.reservationSubmitting"
                @click="closeSeatModal"
              >
                关闭
              </button>
            </div>
          </header>

          <div
            class="seat-modal-body"
            :aria-busy="
              props.seatLoading ||
              props.reservationDetailsLoading ||
              props.reservationEndTimesLoading ||
              props.reservationSubmitting
            "
          >
            <template v-if="reservationStage === 'seats'">
              <div
                v-if="props.seatList"
                class="seat-summary"
                role="status"
                aria-live="polite"
              >
                <span
                  >共 {{ formatCount(props.seatList.totalCount) }} 个座位</span
                >
                <span>
                  空闲 {{ formatCount(props.seatList.freeCount) }} 个
                </span>
              </div>

              <div
                v-if="
                  props.seatLoading ||
                  (!props.seatList && !props.seatError && !props.seatErrorCode)
                "
                class="seat-grid seat-skeleton-grid"
                aria-label="正在查询区域座位"
                role="status"
                aria-live="polite"
              >
                <div
                  v-for="index in 12"
                  :key="index"
                  class="seat-item seat-skeleton-item"
                  aria-hidden="true"
                >
                  <span class="seat-skeleton-line is-label"></span>
                  <span class="seat-skeleton-line"></span>
                </div>
              </div>

              <div
                v-else-if="props.seatError || props.seatErrorCode"
                class="seat-state seat-error-state"
                role="alert"
              >
                <h4>{{ seatErrorTitle }}</h4>
                <p>{{ seatErrorDetail }}</p>
                <button
                  class="seat-retry-button"
                  type="button"
                  :disabled="props.seatLoading"
                  @click="retrySeatQuery"
                >
                  重新加载
                </button>
              </div>

              <ul v-else-if="props.seatList && seats.length" class="seat-grid">
                <li v-for="seat in seats" :key="seat.id">
                  <button
                    class="seat-item seat-item-button"
                    :class="seatStatusClass(seat.status)"
                    :data-seat-id="seat.id"
                    type="button"
                    :aria-label="`${seat.label}，${seat.name || '位置未标注'}，${seatStatusLabel(seat.status)}，查看可预约时间`"
                    @click="openSeatBooking(seat, $event)"
                  >
                    <span class="seat-item-header">
                      <strong>{{ seat.label }}</strong>
                      <span class="seat-status">
                        {{ seatStatusLabel(seat.status) }}
                      </span>
                    </span>
                    <span class="seat-item-name">
                      {{ seat.name || "位置未标注" }}
                    </span>
                    <span v-if="seat.status === 'UNKNOWN'" class="raw-status">
                      原始状态：{{ seat.rawStatus }}
                    </span>
                  </button>
                </li>
              </ul>

              <div
                v-else-if="props.seatList"
                class="seat-state"
                role="status"
                aria-live="polite"
              >
                <h4>该区域没有座位数据</h4>
                <p>图书馆当前未返回该区域的座位列表。</p>
              </div>
            </template>

            <template
              v-else-if="reservationStage === 'booking' && selectedSeat"
            >
              <div
                v-if="isReservationResultUncertain"
                class="seat-state reservation-uncertain-state"
                role="alert"
              >
                <span class="reservation-state-code">RESULT_UNCERTAIN</span>
                <h4>{{ reservationErrorTitle }}</h4>
                <p>{{ reservationErrorDetail }}</p>
                <p>此状态下不会再次提交当前预约。</p>
              </div>

              <div
                v-else-if="
                  props.reservationDetailsLoading ||
                  (!props.reservationDetails &&
                    !props.reservationDetailsError &&
                    !props.reservationDetailsErrorCode)
                "
                class="booking-skeleton"
                role="status"
                aria-live="polite"
                aria-label="正在查询可预约时间"
              >
                <span class="booking-skeleton-line is-wide"></span>
                <span class="booking-skeleton-line"></span>
                <span class="booking-skeleton-timeline"></span>
                <span class="booking-skeleton-line is-short"></span>
              </div>

              <div
                v-else-if="
                  props.reservationDetailsError ||
                  props.reservationDetailsErrorCode
                "
                class="seat-state seat-error-state"
                role="alert"
              >
                <h4>{{ reservationDetailsErrorTitle }}</h4>
                <p>{{ reservationDetailsErrorDetail }}</p>
                <button
                  class="seat-retry-button"
                  type="button"
                  :disabled="props.reservationDetailsLoading"
                  @click="retryReservationDetails"
                >
                  重新加载
                </button>
              </div>

              <div v-else-if="props.reservationDetails" class="booking-panel">
                <section class="booking-seat-summary" aria-label="当前座位">
                  <div>
                    <span>座位</span>
                    <strong>{{ selectedSeat.label }}</strong>
                  </div>
                  <div>
                    <span>位置</span>
                    <strong>{{ selectedSeat.name || "位置未标注" }}</strong>
                  </div>
                  <div>
                    <span>当前状态</span>
                    <strong>{{ seatStatusLabel(selectedSeat.status) }}</strong>
                  </div>
                </section>

                <section
                  class="timeline-section"
                  aria-labelledby="timeline-title"
                >
                  <div class="booking-section-heading">
                    <div>
                      <span>当日占用情况</span>
                      <h4 id="timeline-title">座位时间线</h4>
                    </div>
                    <p>红色时段可预约</p>
                  </div>

                  <div
                    v-if="
                      props.reservationDetails.timeline.marks.length ||
                      props.reservationDetails.timeline.freePeriods.length
                    "
                    class="seat-timeline"
                    aria-hidden="true"
                  >
                    <div class="seat-timeline-track">
                      <span
                        v-for="(period, index) in props.reservationDetails
                          .timeline.freePeriods"
                        :key="`${period.label}-${index}`"
                        class="seat-timeline-free"
                        :style="{
                          left: timelineLeft(period.left),
                          width: timelineWidth(period.left, period.width),
                        }"
                      ></span>
                    </div>
                    <span
                      v-for="(mark, index) in props.reservationDetails.timeline
                        .marks"
                      :key="`${mark.label}-${index}`"
                      class="seat-timeline-mark"
                      :style="{ left: timelineLeft(mark.left) }"
                    >
                      <i></i>
                      <small>{{ mark.label }}</small>
                    </span>
                  </div>

                  <div class="free-periods" aria-label="可预约时段">
                    <span class="free-periods-label">可预约时段</span>
                    <ul
                      v-if="
                        props.reservationDetails.timeline.freePeriods.length
                      "
                    >
                      <li
                        v-for="(period, index) in props.reservationDetails
                          .timeline.freePeriods"
                        :key="`${period.label}-text-${index}`"
                      >
                        {{ period.label }}
                      </li>
                    </ul>
                    <p v-else>图书馆未返回可预约时段。</p>
                  </div>
                </section>

                <form
                  class="reservation-form"
                  @submit.prevent="submitReservation"
                >
                  <div class="reservation-time-grid">
                    <label class="reservation-field">
                      <span>开始时间</span>
                      <select
                        :value="
                          selectedStartTime === null
                            ? ''
                            : encodeStartValue(selectedStartTime)
                        "
                        :disabled="
                          props.reservationSubmitting ||
                          !props.reservationDetails.startTimes.length
                        "
                        @change="updateReservationStart"
                      >
                        <option value="">请选择开始时间</option>
                        <option
                          v-for="option in props.reservationDetails.startTimes"
                          :key="encodeStartValue(option.value)"
                          :value="encodeStartValue(option.value)"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </label>

                    <label class="reservation-field">
                      <span>结束时间</span>
                      <select
                        :value="
                          selectedEndTime === null
                            ? ''
                            : String(selectedEndTime)
                        "
                        :disabled="
                          props.reservationSubmitting ||
                          selectedStartTime === null ||
                          props.reservationEndTimesLoading ||
                          !props.reservationEndTimes?.length
                        "
                        @change="updateReservationEnd"
                      >
                        <option value="">
                          {{
                            selectedStartTime === null
                              ? "请先选择开始时间"
                              : props.reservationEndTimesLoading
                                ? "正在读取结束时间"
                                : "请选择结束时间"
                          }}
                        </option>
                        <option
                          v-for="option in props.reservationEndTimes ?? []"
                          :key="option.value"
                          :value="String(option.value)"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                    </label>
                  </div>

                  <p
                    v-if="!props.reservationDetails.startTimes.length"
                    class="reservation-form-hint"
                    role="status"
                  >
                    该座位当前没有可选的预约开始时间。
                  </p>

                  <div
                    v-if="props.reservationEndTimesLoading"
                    class="reservation-inline-state"
                    role="status"
                    aria-live="polite"
                  >
                    正在读取结束时间…
                  </div>

                  <div
                    v-else-if="
                      selectedStartTime !== null &&
                      (props.reservationEndTimesError ||
                        props.reservationEndTimesErrorCode)
                    "
                    class="reservation-inline-error"
                    role="alert"
                  >
                    <div>
                      <strong>{{ reservationEndTimesErrorTitle }}</strong>
                      <p>{{ reservationEndTimesErrorDetail }}</p>
                    </div>
                    <button
                      class="seat-retry-button"
                      type="button"
                      :disabled="props.reservationEndTimesLoading"
                      @click="retryReservationEndTimes"
                    >
                      重试
                    </button>
                  </div>

                  <section
                    v-if="selectedStartOption && selectedEndOption"
                    class="reservation-summary"
                    aria-labelledby="reservation-summary-title"
                  >
                    <span>提交前核对</span>
                    <h4 id="reservation-summary-title">预约摘要</h4>
                    <dl>
                      <div>
                        <dt>地点</dt>
                        <dd>{{ reservationLocation }}</dd>
                      </div>
                      <div>
                        <dt>座位</dt>
                        <dd>{{ selectedSeat.label }}</dd>
                      </div>
                      <div>
                        <dt>日期</dt>
                        <dd>{{ selectedSeatParams?.date }}</dd>
                      </div>
                      <div>
                        <dt>时间</dt>
                        <dd>
                          {{ selectedStartOption.label }}–{{
                            selectedEndOption.label
                          }}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <div
                    v-if="hasCurrentReservationError"
                    class="reservation-submit-error"
                    role="alert"
                  >
                    <strong>{{ reservationErrorTitle }}</strong>
                    <p>{{ reservationErrorDetail }}</p>
                  </div>

                  <div
                    v-if="props.reservationSubmitting"
                    class="reservation-submitting"
                    role="status"
                    aria-live="assertive"
                  >
                    正在提交预约，请保持此窗口开启，不要重复操作。
                  </div>

                  <button
                    class="reservation-submit-button"
                    type="submit"
                    :disabled="!canSubmitReservation"
                  >
                    {{
                      props.reservationSubmitting
                        ? "正在提交预约"
                        : hasCurrentReservationError
                          ? "重新确认预约"
                          : "确认预约"
                    }}
                  </button>
                </form>
              </div>
            </template>

            <section
              v-else-if="
                reservationStage === 'success' && props.reservationReceipt
              "
              class="reservation-success"
              aria-labelledby="reservation-success-title"
            >
              <div class="reservation-success-mark" aria-hidden="true">✓</div>
              <span>图书馆已接受本次预约</span>
              <h4 id="reservation-success-title">
                {{ props.reservationReceipt.seatLabel }} 预约成功
              </h4>

              <dl>
                <div>
                  <dt>回执</dt>
                  <dd>{{ props.reservationReceipt.receipt || "—" }}</dd>
                </div>
                <div>
                  <dt>地点</dt>
                  <dd>{{ receiptLocation(props.reservationReceipt) }}</dd>
                </div>
                <div>
                  <dt>日期</dt>
                  <dd>{{ props.reservationReceipt.date }}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>
                    {{ props.reservationReceipt.beginLabel }}–{{
                      props.reservationReceipt.endLabel
                    }}
                  </dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{{ props.reservationReceipt.status }}</dd>
                </div>
              </dl>

              <p
                v-if="props.reservationReceipt.message"
                class="receipt-message"
              >
                {{ props.reservationReceipt.message }}
              </p>
              <p v-if="props.reservationFetchedAt" class="receipt-timestamp">
                提交时间：{{ formatDateTime(props.reservationFetchedAt) }}
              </p>

              <button
                class="reservation-return-button"
                type="button"
                @click="returnToSeatList({ refresh: true })"
              >
                返回座位列表
              </button>
            </section>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="library-records-section">
      <LibraryReservationRecordsPanel
        :loading="props.recordsLoading"
        :error="props.recordsError"
        :error-code="props.recordsErrorCode"
        :page="props.recordsPage"
        :fetched-at="props.recordsFetchedAt"
        @query-records="emit('query-reservation-records', $event)"
        @clear-records="emit('clear-reservation-records')"
      />
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
.state-panel h3 {
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
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 16px;
}

.library-records-section {
  margin-top: 22px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
.page-button:focus-visible,
.room-card-button:focus-visible,
.seat-item-button:focus-visible,
.seat-modal-close:focus-visible,
.seat-modal-back:focus-visible,
.seat-retry-button:focus-visible,
.reservation-field select:focus-visible,
.reservation-submit-button:focus-visible,
.reservation-return-button:focus-visible {
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
  align-items: center;
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

.room-card-button {
  width: 100%;
  appearance: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    transform 180ms ease;
}

.room-card-button:hover {
  border-color: var(--red);
}

.room-card-button:active {
  transform: translateY(1px);
}

.room-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.room-title-group {
  display: block;
  min-width: 0;
}

.room-card-title {
  display: block;
  margin: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.room-card-location {
  display: block;
  margin-top: 6px;
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

.seat-counts > span {
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

.seat-counts .count-label {
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

.seat-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(31 26 26 / 48%);
}

.seat-modal {
  display: flex;
  width: min(960px, 100%);
  max-height: min(820px, calc(100dvh - 48px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.seat-modal-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--border);
  padding: 20px 22px;
}

.seat-modal-header > div {
  min-width: 0;
}

.seat-modal-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--red);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.seat-modal-header h3,
.seat-state h4 {
  margin: 0;
  color: var(--text);
}

.seat-modal-header h3 {
  font-size: 19px;
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.seat-modal-header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.seat-modal-header .seat-modal-timestamp {
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.seat-modal-header h3:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 4px;
}

.seat-modal-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.seat-modal-close,
.seat-modal-back,
.seat-retry-button {
  border: 1px solid var(--red);
  background: var(--bg);
  color: var(--red);
  padding: 9px 13px;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.seat-modal-close {
  flex: 0 0 auto;
}

.seat-modal-close:hover:not(:disabled),
.seat-modal-back:hover:not(:disabled),
.seat-retry-button:hover:not(:disabled) {
  background: var(--red);
  color: #ffffff;
}

.seat-modal-close:active:not(:disabled),
.seat-modal-back:active:not(:disabled),
.seat-retry-button:active:not(:disabled) {
  transform: translateY(1px);
}

.seat-modal-close:disabled,
.seat-modal-back:disabled,
.seat-retry-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.seat-modal-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 20px 22px 24px;
  overscroll-behavior: contain;
}

.seat-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.seat-summary span:last-child {
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.seat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.seat-grid > li {
  min-width: 0;
}

.seat-item {
  min-width: 0;
  min-height: 92px;
  border: 1px solid var(--border);
  border-left-width: 3px;
  background: var(--bg);
  padding: 12px;
}

.seat-item-button {
  display: block;
  width: 100%;
  appearance: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    background-color 180ms ease;
}

.seat-item-button:hover {
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 3%, var(--bg));
}

.seat-item-button:active {
  transform: translateY(1px);
}

.seat-item.is-free {
  border-left-color: var(--red);
}

.seat-item.is-in-use {
  border-left-color: color-mix(in srgb, var(--muted) 68%, var(--bg));
}

.seat-item.is-away {
  border-left-color: color-mix(in srgb, var(--red) 42%, var(--muted));
}

.seat-item.is-unknown {
  border-left-color: var(--muted);
  border-style: dashed;
}

.seat-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.seat-item-header strong {
  min-width: 0;
  color: var(--text);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.seat-status {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 10px;
  font-weight: 650;
  line-height: 1.4;
  white-space: nowrap;
}

.seat-item.is-free .seat-status {
  color: var(--red);
}

.seat-item-name,
.seat-item .raw-status {
  display: block;
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.seat-item .raw-status {
  margin-top: 5px;
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 10px;
}

.seat-state {
  min-height: 190px;
  border: 1px solid var(--border);
  padding: 24px;
}

.seat-state h4 {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
}

.seat-state p {
  max-width: 62ch;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}

.seat-error-state {
  border-left: 3px solid var(--red);
}

.seat-error-state h4,
.seat-error-state p {
  color: var(--red);
}

.seat-retry-button {
  margin-top: 18px;
}

.seat-skeleton-item {
  display: grid;
  align-content: start;
  gap: 12px;
  border-left-width: 1px;
}

.seat-skeleton-line {
  display: block;
  width: 72%;
  height: 10px;
  background: color-mix(in srgb, var(--red) 11%, var(--bg));
  animation: pulse 1.1s ease-in-out infinite alternate;
}

.seat-skeleton-line.is-label {
  width: 48%;
  height: 15px;
}

.booking-skeleton {
  display: grid;
  min-height: 340px;
  align-content: start;
  gap: 15px;
  border: 1px solid var(--border);
  padding: 22px;
}

.booking-skeleton-line,
.booking-skeleton-timeline {
  display: block;
  width: 44%;
  height: 13px;
  background: color-mix(in srgb, var(--red) 11%, var(--bg));
  animation: pulse 1.1s ease-in-out infinite alternate;
}

.booking-skeleton-line.is-wide {
  width: 72%;
  height: 19px;
}

.booking-skeleton-line.is-short {
  width: 28%;
}

.booking-skeleton-timeline {
  width: 100%;
  height: 86px;
  margin: 18px 0;
}

.booking-panel {
  display: grid;
  gap: 18px;
}

.booking-seat-summary {
  display: grid;
  grid-template-columns: 0.65fr 1.5fr 0.75fr;
  gap: 1px;
  border: 1px solid var(--border);
  background: var(--border);
}

.booking-seat-summary > div {
  min-width: 0;
  background: var(--bg);
  padding: 14px 16px;
}

.booking-seat-summary span,
.reservation-summary > span,
.reservation-success > span,
.booking-section-heading span,
.free-periods-label {
  display: block;
  color: var(--muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.07em;
  line-height: 1.3;
  text-transform: uppercase;
}

.booking-seat-summary strong {
  display: block;
  margin-top: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.booking-seat-summary > div:first-child strong {
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 18px;
}

.timeline-section,
.reservation-form {
  border: 1px solid var(--border);
  padding: 18px;
}

.booking-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.booking-section-heading h4,
.reservation-summary h4,
.reservation-success h4 {
  margin: 4px 0 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
}

.booking-section-heading p {
  margin: 0;
  color: var(--red);
  font-size: 11px;
  line-height: 1.4;
}

.seat-timeline {
  position: relative;
  height: 76px;
  margin: 22px 8px 4px;
}

.seat-timeline-track {
  position: absolute;
  top: 18px;
  right: 0;
  left: 0;
  height: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--muted) 8%, var(--bg));
  overflow: hidden;
}

.seat-timeline-free {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--red);
}

.seat-timeline-mark {
  position: absolute;
  top: 12px;
  display: grid;
  justify-items: center;
  transform: translateX(-50%);
}

.seat-timeline-mark i {
  width: 1px;
  height: 25px;
  background: color-mix(in srgb, var(--muted) 58%, var(--bg));
}

.seat-timeline-mark small {
  margin-top: 4px;
  color: var(--muted);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 9px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.free-periods {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.free-periods ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.free-periods li {
  border: 1px solid color-mix(in srgb, var(--red) 45%, var(--border));
  color: var(--red);
  padding: 5px 7px;
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.free-periods p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.reservation-time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.reservation-field {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.reservation-field > span {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.reservation-field select {
  width: 100%;
  min-width: 0;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 0;
  background: var(--bg);
  color: var(--text);
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
}

.reservation-field select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.reservation-form-hint,
.reservation-inline-state {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.reservation-inline-error,
.reservation-submit-error,
.reservation-submitting {
  margin-top: 14px;
  border-left: 3px solid var(--red);
  background: color-mix(in srgb, var(--red) 4%, var(--bg));
  padding: 12px 14px;
}

.reservation-inline-error {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.reservation-inline-error strong,
.reservation-submit-error strong {
  color: var(--red);
  font-size: 12px;
  line-height: 1.4;
}

.reservation-inline-error p,
.reservation-submit-error p {
  margin: 5px 0 0;
  color: var(--red);
  font-size: 11px;
  line-height: 1.55;
}

.reservation-inline-error .seat-retry-button {
  flex: 0 0 auto;
  margin-top: 0;
}

.reservation-submitting {
  color: var(--red);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.55;
}

.reservation-summary {
  margin-top: 18px;
  border: 1px solid var(--border);
  padding: 15px;
}

.reservation-summary dl,
.reservation-success dl {
  display: grid;
  gap: 0;
  margin: 12px 0 0;
}

.reservation-summary dl > div,
.reservation-success dl > div {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  border-top: 1px solid var(--border);
  padding: 9px 0;
}

.reservation-summary dt,
.reservation-success dt {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.reservation-summary dd,
.reservation-success dd {
  margin: 0;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.reservation-submit-button,
.reservation-return-button {
  width: 100%;
  min-height: 44px;
  margin-top: 18px;
  border: 1px solid var(--red);
  border-radius: 0;
  background: var(--red);
  color: #ffffff;
  padding: 10px 16px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    transform 180ms ease,
    opacity 180ms ease;
}

.reservation-submit-button:hover:not(:disabled),
.reservation-return-button:hover:not(:disabled) {
  background: var(--red-dark);
}

.reservation-submit-button:active:not(:disabled),
.reservation-return-button:active:not(:disabled) {
  transform: translateY(1px);
}

.reservation-submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.reservation-state-code {
  display: block;
  margin-bottom: 8px;
  color: var(--red);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.reservation-uncertain-state {
  min-height: 240px;
  border-left: 3px solid var(--red);
}

.reservation-uncertain-state h4,
.reservation-uncertain-state p {
  color: var(--red);
}

.reservation-success {
  max-width: 680px;
  margin: 0 auto;
  border: 1px solid var(--border);
  padding: 26px;
}

.reservation-success-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  margin-bottom: 16px;
  background: var(--red);
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
}

.reservation-success h4 {
  margin-top: 6px;
  font-size: 19px;
}

.receipt-message {
  margin: 16px 0 0;
  border-left: 3px solid var(--red);
  background: color-mix(in srgb, var(--red) 4%, var(--bg));
  color: var(--text);
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.6;
}

.receipt-timestamp {
  margin: 12px 0 0;
  color: var(--muted);
  font-family: "SF Mono", "Geist Mono", "JetBrains Mono", monospace;
  font-size: 10px;
  line-height: 1.4;
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

  .filter-panel {
    grid-template-columns: 1fr;
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

  .seat-modal-backdrop {
    padding: 8px;
  }

  .seat-modal {
    width: 100%;
    max-height: calc(100dvh - 16px);
  }

  .seat-modal-header {
    gap: 14px;
    padding: 16px;
  }

  .seat-modal-body {
    min-height: 0;
    padding: 16px;
  }

  .seat-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .seat-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .booking-seat-summary,
  .reservation-time-grid {
    grid-template-columns: 1fr;
  }

  .booking-section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .seat-timeline {
    margin-inline: 2px;
  }

  .reservation-inline-error {
    flex-direction: column;
  }

  .reservation-summary dl > div,
  .reservation-success dl > div {
    grid-template-columns: 68px minmax(0, 1fr);
  }

  .reservation-success {
    padding: 20px;
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

  .seat-modal-header {
    align-items: stretch;
    flex-direction: column;
  }

  .seat-modal-actions {
    width: 100%;
  }

  .seat-modal-actions > button {
    flex: 1 1 0;
  }

  .timeline-section,
  .reservation-form {
    padding: 14px;
  }

  .seat-timeline-mark small {
    font-size: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .primary-button,
  .page-button,
  .room-card-button,
  .seat-item-button,
  .seat-modal-close,
  .seat-modal-back,
  .seat-retry-button,
  .reservation-submit-button,
  .reservation-return-button,
  .booking-skeleton-line,
  .booking-skeleton-timeline,
  .skeleton-line,
  .seat-skeleton-line {
    animation: none;
    transition: none;
  }
}
</style>
