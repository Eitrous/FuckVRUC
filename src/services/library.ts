import {
  LIBRARY_BUILDINGS,
  type LibraryQueryErrorCode,
  type LibraryReservationErrorCode,
  type LibraryReservationRecord,
  type LibraryReservationRecordCategory,
  type LibraryReservationRecordPage,
  type LibraryReservationRecordsQueryParams,
  type LibraryReservationRecordsQueryResult,
  type LibraryReservationRecordStatus,
  type LibraryReservationReceipt,
  type LibraryReservationStartValue,
  type LibraryReservationSubmitParams,
  type LibraryReservationSubmitResult,
  type LibraryRoom,
  type LibraryRoomPage,
  type LibraryRoomQueryParams,
  type LibraryRoomQueryResult,
  type LibrarySeat,
  type LibrarySeatEndTimesQueryParams,
  type LibrarySeatEndTimesQueryResult,
  type LibrarySeatList,
  type LibrarySeatQueryParams,
  type LibrarySeatQueryResult,
  type LibrarySeatReservationDetails,
  type LibrarySeatReservationDetailsQueryParams,
  type LibrarySeatReservationDetailsQueryResult,
  type LibrarySeatStatus,
  type LibraryTimeOption,
  type LibraryTimelineFreePeriod,
  type LibraryTimelineMark,
} from '@/types/library'
import {
  rejectLibraryToken,
  resolveOrStartLibraryAuthentication,
} from '@/services/libraryAuth'

const LIBRARY_API_ROOT = 'https://zwlib.ruc.edu.cn/jsq/static'
const SYSTEM_SETTINGS_URL = `${LIBRARY_API_ROOT}/public/cg/getSysSet/PC`
const SERVER_DATE_TIME_KEY = 'server_date_time'
const CLIENT_DATE_TIME_IV = 'client_date_time'
const AUTH_FAILURE_CODES = new Set(['20002', '20003'])
const LIBRARY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_RECORD_PAGE_SIZE = 10 as const
const REQUEST_TIMEOUT_MS = 15_000

type ApiEnvelope = {
  status?: unknown
  success?: unknown
  code?: unknown
  message?: unknown
  data?: unknown
}

class LibraryQueryError extends Error {
  constructor(
    public readonly code: LibraryQueryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'LibraryQueryError'
  }
}

function errorResult(
  errorCode: LibraryQueryErrorCode,
  error: string,
): Extract<LibraryRoomQueryResult, { ok: false }> {
  return {
    ok: false,
    error,
    errorCode,
    fetchedAt: Date.now(),
  }
}

function reservationErrorResult(
  errorCode: LibraryReservationErrorCode,
  error: string,
): Extract<LibraryReservationSubmitResult, { ok: false }> {
  return {
    ok: false,
    error,
    errorCode,
    fetchedAt: Date.now(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function apiMessage(envelope: ApiEnvelope, fallback: string) {
  return typeof envelope.message === 'string' && envelope.message.trim()
    ? envelope.message.trim()
    : fallback
}

function isAuthFailure(envelope: ApiEnvelope) {
  return AUTH_FAILURE_CODES.has(String(envelope.code ?? ''))
}

async function parseJsonResponse(response: Response, context: string) {
  const text = await response.text()
  let envelope: ApiEnvelope

  try {
    const value = JSON.parse(text) as unknown
    if (!isRecord(value)) throw new Error('Expected an object')
    envelope = value as ApiEnvelope
  } catch {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new LibraryQueryError(
          'AUTH_REQUIRED',
          '图书馆登录已过期，请重新登录后重试。',
        )
      }

      throw new LibraryQueryError(
        'API_ERROR',
        `${context}（HTTP ${response.status}），请稍后重试。`,
      )
    }

    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      `${context}返回了无法识别的数据。`,
    )
  }

  if (!response.ok) {
    if (isAuthFailure(envelope)) return envelope

    if (response.status === 401 || response.status === 403) {
      throw new LibraryQueryError(
        'AUTH_REQUIRED',
        '图书馆登录已过期，请重新登录后重试。',
      )
    }

    throw new LibraryQueryError(
      'API_ERROR',
      `${context}（HTTP ${response.status}），请稍后重试。`,
    )
  }

  return envelope
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  headers: Headers,
  context: string,
) {
  let response: Response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    const timedOut =
      isRecord(error) && error.name === 'AbortError'

    throw new LibraryQueryError(
      'NETWORK',
      timedOut
        ? '图书馆系统响应超时，请稍后重试。'
        : '无法连接图书馆系统，请检查网络或 VPN 连接后重试。',
    )
  } finally {
    clearTimeout(timeoutId)
  }

  return await parseJsonResponse(response, context)
}

function baseHeaders(token: string) {
  return new Headers({
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json;charset=UTF-8',
    loginType: 'PC',
    token,
  })
}

function hmacIsEnabled(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function decodeBase64(value: string) {
  try {
    const normalized = value.replace(/\s/g, '')
    return Uint8Array.from(atob(normalized), (character) =>
      character.charCodeAt(0),
    )
  } catch {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回的签名配置无效。',
    )
  }
}

async function decryptHmacKey(encryptedKey: unknown) {
  if (typeof encryptedKey !== 'string' || !encryptedKey.trim()) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统缺少签名配置。',
    )
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SERVER_DATE_TIME_KEY),
      { name: 'AES-CBC' },
      false,
      ['decrypt'],
    )
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: new TextEncoder().encode(CLIENT_DATE_TIME_IV),
      },
      cryptoKey,
      decodeBase64(encryptedKey.trim()),
    )
    const key = new TextDecoder().decode(plaintext)

    if (!key) throw new Error('Empty key')
    return key
  } catch (error) {
    if (error instanceof LibraryQueryError) throw error
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回的签名配置无效。',
    )
  }
}

function randomUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

async function createHmacHeaders(hmacKey: string) {
  const requestId = randomUuid()
  const requestDate = Date.now()
  const payload = `seat::${requestId}::${requestDate}::POST`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hmacKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  const signatureHex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  return {
    'X-request-id': requestId,
    'X-request-date': String(requestDate),
    'X-hmac-request-key': signatureHex,
  }
}

async function getSystemSettings(token: string) {
  const envelope = await postJson(
    SYSTEM_SETTINGS_URL,
    {},
    baseHeaders(token),
    '读取图书馆系统配置失败',
  )

  if (isAuthFailure(envelope)) {
    throw new LibraryQueryError(
      'AUTH_REQUIRED',
      '图书馆登录已过期，请重新登录后重试。',
    )
  }

  if (envelope.status === false) {
    throw new LibraryQueryError(
      'API_ERROR',
      apiMessage(envelope, '读取图书馆系统配置失败。'),
    )
  }

  if (!isRecord(envelope.data)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的配置数据。',
    )
  }

  return envelope.data
}

async function getRequestHeaders(token: string) {
  const settings = await getSystemSettings(token)
  const headers = baseHeaders(token)

  if (hmacIsEnabled(settings.hmac)) {
    const decryptedKey = await decryptHmacKey(settings.hmacKey)
    const hmacHeaders = await createHmacHeaders(decryptedKey)

    Object.entries(hmacHeaders).forEach(([name, value]) => {
      headers.set(name, value)
    })
  }

  return headers
}

function asNonNegativeInteger(value: unknown) {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value)
        : undefined

  return number !== undefined && Number.isInteger(number) && number >= 0
    ? number
    : undefined
}

function asPositiveInteger(value: unknown) {
  const number = asNonNegativeInteger(value)
  return number !== undefined && number > 0 ? number : undefined
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !LIBRARY_DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function isValidQueryDate(value: unknown) {
  return (
    isValidCalendarDate(value) &&
    value >= formatLocalDate(new Date())
  )
}

function normalizeRoom(value: unknown): LibraryRoom | undefined {
  if (!isRecord(value)) return undefined

  const seatFree = asNonNegativeInteger(value.seatFree)
  const seatTotal = asNonNegativeInteger(value.seatTotal)

  if (
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.name !== 'string' ||
    seatFree === undefined ||
    seatTotal === undefined ||
    seatFree > seatTotal
  ) {
    return undefined
  }

  return {
    id: value.id,
    buildingId:
      typeof value.buildingId === 'string' ? value.buildingId : '',
    floorId: typeof value.floorId === 'string' ? value.floorId : '',
    name: value.name,
    buildingName:
      typeof value.buildingName === 'string' ? value.buildingName : '',
    floorName: typeof value.floorName === 'string' ? value.floorName : '',
    seatFree,
    seatTotal,
    raw: value,
  }
}

function normalizePage(value: unknown): LibraryRoomPage {
  if (!isRecord(value) || !Array.isArray(value.pageList)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的余座数据。',
    )
  }

  const currentPage = asPositiveInteger(value.currentPage)
  const pageSize = asPositiveInteger(value.pageSize)
  const totalCount = asNonNegativeInteger(value.totalCount)
  const totalPage = asNonNegativeInteger(value.totalPage)
  const items = value.pageList.map(normalizeRoom)

  if (
    currentPage === undefined ||
    pageSize === undefined ||
    totalCount === undefined ||
    totalPage === undefined ||
    items.some((room) => room === undefined)
  ) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的余座数据。',
    )
  }

  return {
    items: items as LibraryRoom[],
    currentPage,
    pageSize,
    totalCount,
    totalPage,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPage,
  }
}

function normalizeQueryParams(params: LibraryRoomQueryParams) {
  const building = LIBRARY_BUILDINGS.find(
    (candidate) => candidate.id === params?.buildingId,
  )
  const floor = building?.floors.find(
    (candidate) => candidate.id === params?.floorId,
  )
  const currentPage = params?.currentPage
  const pageSize = params?.pageSize
  const beginMinute = params?.beginMinute
  const endMinute = params?.endMinute

  if (
    !building ||
    !floor ||
    !isValidQueryDate(params?.date) ||
    typeof currentPage !== 'number' ||
    !Number.isInteger(currentPage) ||
    currentPage < 1 ||
    typeof pageSize !== 'number' ||
    !Number.isInteger(pageSize) ||
    pageSize !== DEFAULT_PAGE_SIZE ||
    typeof beginMinute !== 'number' ||
    !Number.isInteger(beginMinute) ||
    beginMinute < -1 ||
    beginMinute > 1_439 ||
    typeof endMinute !== 'number' ||
    !Number.isInteger(endMinute) ||
    endMinute < 0 ||
    endMinute > 1_439 ||
    (endMinute > 0 && (beginMinute < 0 || endMinute <= beginMinute)) ||
    typeof params?.power !== 'boolean' ||
    typeof params?.windows !== 'boolean'
  ) {
    throw new LibraryQueryError(
      'API_ERROR',
      '查询条件无效，请检查馆舍、楼层、日期和时间。',
    )
  }

  return {
    buildingId: building.id,
    date: params.date,
    body: {
      beginMinute,
      currentPage,
      endMinute,
      floorId: params.floorId,
      minMinute: 0,
      pageSize: DEFAULT_PAGE_SIZE,
      power: params.power,
      roomType: false,
      sortField: '',
      sortType: '',
      windows: params.windows,
    },
  }
}

function normalizeSeatQueryParams(params: LibrarySeatQueryParams) {
  const roomId = params?.roomId
  const beginMinute = params?.beginMinute
  const endMinute = params?.endMinute

  if (
    typeof roomId !== 'string' ||
    !/^\d+$/.test(roomId) ||
    !isValidQueryDate(params?.date) ||
    typeof beginMinute !== 'number' ||
    !Number.isInteger(beginMinute) ||
    beginMinute < -1 ||
    beginMinute > 1_439 ||
    typeof endMinute !== 'number' ||
    !Number.isInteger(endMinute) ||
    endMinute < 0 ||
    endMinute > 1_439 ||
    (endMinute > 0 && (beginMinute < 0 || endMinute <= beginMinute))
  ) {
    throw new LibraryQueryError(
      'API_ERROR',
      '座位查询条件无效，请检查房间、日期和时间。',
    )
  }

  return {
    roomId,
    date: params.date,
    body: {
      beginMinute,
      endMinute,
      minMinute: 0,
    },
  }
}

function normalizeSeatStatus(rawStatus: string): LibrarySeatStatus {
  if (
    rawStatus === 'FREE' ||
    rawStatus === 'IN_USE' ||
    rawStatus === 'AWAY'
  ) {
    return rawStatus
  }

  return 'UNKNOWN'
}

function normalizeSeat(value: unknown): LibrarySeat | undefined {
  if (!isRecord(value)) return undefined

  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    typeof value.name !== 'string' ||
    typeof value.status !== 'string' ||
    !value.status.trim() ||
    typeof value.afterFree !== 'boolean'
  ) {
    return undefined
  }

  return {
    id: value.id,
    label: value.label,
    name: value.name,
    status: normalizeSeatStatus(value.status),
    rawStatus: value.status,
    afterFree: value.afterFree,
    raw: value,
  }
}

function normalizeSeatList(value: unknown): LibrarySeatList {
  if (!isRecord(value)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的座位数据。',
    )
  }

  const items = Object.values(value).map(normalizeSeat)

  if (items.some((seat) => seat === undefined)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的座位数据。',
    )
  }

  const normalizedItems = items as LibrarySeat[]

  return {
    items: normalizedItems,
    totalCount: normalizedItems.length,
    freeCount: normalizedItems.filter((seat) => seat.status === 'FREE').length,
  }
}

function normalizeNumericId(value: unknown, subject: string) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new LibraryQueryError('API_ERROR', `${subject}无效，请重新选择。`)
  }

  return value
}

function normalizeReservationDate(value: unknown): string {
  if (!isValidQueryDate(value)) {
    throw new LibraryQueryError('API_ERROR', '预约日期无效，请重新选择。')
  }

  return value as string
}

function shanghaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  }
}

function normalizeStartValue(
  value: unknown,
  date: string,
): LibraryReservationStartValue {
  if (value === 'now') {
    if (date !== shanghaiDateParts().date) {
      throw new LibraryQueryError(
        'API_ERROR',
        '“现在”仅可用于当天预约，请重新选择开始时间。',
      )
    }
    return value
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1_439
  ) {
    throw new LibraryQueryError('API_ERROR', '预约开始时间无效。')
  }

  return value
}

function normalizeDetailsQueryParams(
  params: LibrarySeatReservationDetailsQueryParams,
) {
  return {
    seatId: normalizeNumericId(params?.seatId, '座位'),
    date: normalizeReservationDate(params?.date),
  }
}

function normalizeEndTimesQueryParams(params: LibrarySeatEndTimesQueryParams) {
  const date = normalizeReservationDate(params?.date)
  const startTime = normalizeStartValue(params?.startTime, date)

  return {
    seatId: normalizeNumericId(params?.seatId, '座位'),
    date,
    startTime,
    requestMinute:
      startTime === 'now' ? shanghaiDateParts().minute : startTime,
  }
}

function normalizeSubmitParams(params: LibraryReservationSubmitParams) {
  const date = normalizeReservationDate(params?.date)
  const startTime = normalizeStartValue(params?.startTime, date)
  const endTime = params?.endTime
  const comparisonStart =
    startTime === 'now' ? shanghaiDateParts().minute : startTime

  if (
    typeof endTime !== 'number' ||
    !Number.isInteger(endTime) ||
    endTime < 0 ||
    endTime > 1_439 ||
    endTime <= comparisonStart
  ) {
    throw new LibraryQueryError(
      'API_ERROR',
      '预约结束时间无效，请重新选择。',
    )
  }

  return {
    seatId: normalizeNumericId(params?.seatId, '座位'),
    date,
    startTime,
    endTime,
    requestStartTime: startTime === 'now' ? -1 : startTime,
  }
}

function normalizePercentage(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
    value <= 100
    ? value
    : undefined
}

function normalizeTimelineMark(value: unknown): LibraryTimelineMark | undefined {
  if (!isRecord(value)) return undefined

  const left = normalizePercentage(value.left)
  if (
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    left === undefined
  ) {
    return undefined
  }

  return { label: value.label.trim(), left }
}

function normalizeTimelineFreePeriod(
  value: unknown,
): LibraryTimelineFreePeriod | undefined {
  if (!isRecord(value)) return undefined

  const left = normalizePercentage(value.left)
  const width = normalizePercentage(value.width)
  if (
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    left === undefined ||
    width === undefined ||
    left + width > 100.1
  ) {
    return undefined
  }

  return { label: value.label.trim(), left, width }
}

function normalizeTimeline(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.markList) ||
    !Array.isArray(value.freeList)
  ) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的座位时间线。',
    )
  }

  const marks = value.markList.map(normalizeTimelineMark)
  const freePeriods = value.freeList.map(normalizeTimelineFreePeriod)

  if (
    marks.some((mark) => mark === undefined) ||
    freePeriods.some((period) => period === undefined)
  ) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的座位时间线。',
    )
  }

  return {
    marks: marks as LibraryTimelineMark[],
    freePeriods: freePeriods as LibraryTimelineFreePeriod[],
  }
}

function normalizeTimeOptions<T extends LibraryReservationStartValue>(
  value: unknown,
  allowNow: boolean,
): LibraryTimeOption<T>[] {
  if (!Array.isArray(value)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约时间。',
    )
  }

  const options = value.map((option) => {
    if (
      !Array.isArray(option) ||
      option.length !== 2 ||
      typeof option[1] !== 'string' ||
      !option[1].trim()
    ) {
      return undefined
    }

    const rawValue = option[0]
    if (allowNow && rawValue === 'now') {
      return { value: 'now', label: option[1].trim() }
    }

    const numericValue =
      typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string' && /^\d+$/.test(rawValue.trim())
          ? Number(rawValue)
          : undefined

    if (
      numericValue === undefined ||
      !Number.isInteger(numericValue) ||
      numericValue < 0 ||
      numericValue > 1_439
    ) {
      return undefined
    }

    return { value: numericValue, label: option[1].trim() }
  })

  if (options.some((option) => option === undefined)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约时间。',
    )
  }

  return options as LibraryTimeOption<T>[]
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  allowEmpty = false,
) {
  const candidate = value[key]
  if (
    typeof candidate !== 'string' ||
    (!allowEmpty && !candidate.trim())
  ) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约结果。',
    )
  }

  return candidate.trim()
}

function normalizeReservationReceipt(
  value: unknown,
  params: ReturnType<typeof normalizeSubmitParams>,
): LibraryReservationReceipt {
  if (!isRecord(value)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约结果。',
    )
  }

  const id = requiredString(value, 'id')
  const roomId = requiredString(value, 'roomId')
  const seatId = requiredString(value, 'seatId')
  const date = requiredString(value, 'makeDateStr')
  const beginMinute = asNonNegativeInteger(value.makeBegin)
  const endMinute = asNonNegativeInteger(value.makeEnd)

  if (
    !/^\d+$/.test(id) ||
    !/^\d+$/.test(roomId) ||
    !/^\d+$/.test(seatId) ||
    seatId !== params.seatId ||
    date !== params.date ||
    beginMinute === undefined ||
    beginMinute > 1_439 ||
    endMinute === undefined ||
    endMinute > 1_439 ||
    endMinute <= beginMinute ||
    endMinute !== params.endTime ||
    (params.startTime !== 'now' && beginMinute !== params.startTime)
  ) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约结果。',
    )
  }

  return {
    id,
    receipt: requiredString(value, 'receipt'),
    roomId,
    seatId,
    seatLabel: requiredString(value, 'seatLabel'),
    date,
    beginMinute,
    endMinute,
    beginLabel: requiredString(value, 'makeBeginStr'),
    endLabel: requiredString(value, 'makeEndStr'),
    status: requiredString(value, 'status'),
    buildingName: requiredString(value, 'buildName', true),
    floorName: requiredString(value, 'floorName', true),
    roomName: requiredString(value, 'roomName', true),
    location: requiredString(value, 'location', true),
    message: requiredString(value, 'message', true),
  }
}

const RESERVATION_RECORD_STATUSES = new Set<LibraryReservationRecordStatus>([
  'CHECK_IN',
  'LEAVE_EARLY',
  'AWAY',
  'RESERVE',
  'STOP',
  'MISS',
  'CANCEL',
  'NO_STOP',
])

function normalizeReservationRecordStatus(
  value: string,
): LibraryReservationRecordStatus {
  return RESERVATION_RECORD_STATUSES.has(
    value as LibraryReservationRecordStatus,
  )
    ? value as LibraryReservationRecordStatus
    : 'UNKNOWN'
}

function numericRecordId(value: unknown) {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return value.trim()
  }

  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return String(value)
  }

  return undefined
}

function optionalRecordString(value: unknown) {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value.trim() : undefined
}

function optionalRecordMinute(value: unknown) {
  if (value === '' || value === null || value === undefined || value === -1) {
    return undefined
  }

  const minute = asNonNegativeInteger(value)
  return minute !== undefined && minute <= 1_439 ? minute : undefined
}

function normalizeReservationRecord(
  value: unknown,
): LibraryReservationRecord | undefined {
  if (!isRecord(value)) return undefined

  const id = numericRecordId(value.id)
  const roomId = numericRecordId(value.roomId)
  const seatId = numericRecordId(value.seatId)
  const seatLabel = optionalRecordString(value.seatLabel)
  const receipt = optionalRecordString(value.receipt)
  const date = optionalRecordString(value.makeDateStr)
  const beginMinute = asNonNegativeInteger(value.makeBegin)
  const endMinute = asNonNegativeInteger(value.makeEnd)
  const beginLabel = optionalRecordString(value.makeBeginStr)
  const endLabel = optionalRecordString(value.makeEndStr)
  const statusValue = optionalRecordString(value.status)
  const useMinute = asNonNegativeInteger(value.useMinute)
  const actualBeginMinute = optionalRecordMinute(value.actualBegin)
  const actualEndMinute = optionalRecordMinute(value.actualEnd)

  if (
    !id ||
    !roomId ||
    !seatId ||
    !seatLabel ||
    receipt === undefined ||
    !date ||
    !isValidCalendarDate(date) ||
    beginMinute === undefined ||
    beginMinute > 1_439 ||
    endMinute === undefined ||
    endMinute > 1_439 ||
    endMinute <= beginMinute ||
    !beginLabel ||
    !endLabel ||
    !statusValue ||
    useMinute === undefined ||
    (value.actualBegin !== '' &&
      value.actualBegin !== null &&
      value.actualBegin !== undefined &&
      value.actualBegin !== -1 &&
      actualBeginMinute === undefined) ||
    (value.actualEnd !== '' &&
      value.actualEnd !== null &&
      value.actualEnd !== undefined &&
      value.actualEnd !== -1 &&
      actualEndMinute === undefined)
  ) {
    return undefined
  }

  const optionalFields = [
    value.actualStr,
    value.awayRange,
    value.buildName,
    value.floorName,
    value.roomName,
    value.location,
    value.message,
  ]

  if (optionalFields.some((field) => optionalRecordString(field) === undefined)) {
    return undefined
  }

  return {
    id,
    roomId,
    seatId,
    seatLabel,
    receipt,
    date,
    beginMinute,
    endMinute,
    beginLabel,
    endLabel,
    actualBeginMinute,
    actualEndMinute,
    actualTimeLabel: optionalRecordString(value.actualStr) ?? '',
    awayRange: optionalRecordString(value.awayRange) ?? '',
    useMinute,
    status: normalizeReservationRecordStatus(statusValue),
    rawStatus: statusValue,
    buildingName: optionalRecordString(value.buildName) ?? '',
    floorName: optionalRecordString(value.floorName) ?? '',
    roomName: optionalRecordString(value.roomName) ?? '',
    location: optionalRecordString(value.location) ?? '',
    message: optionalRecordString(value.message) ?? '',
  }
}

function normalizeReservationRecordsQueryParams(
  params: LibraryReservationRecordsQueryParams,
) {
  const categories: LibraryReservationRecordCategory[] = [
    'today',
    'history',
    'breach',
  ]

  if (
    !categories.includes(params?.category) ||
    !Number.isInteger(params?.currentPage) ||
    params.currentPage < 1 ||
    (params.category === 'today' && params.currentPage !== 1) ||
    params?.pageSize !== DEFAULT_RECORD_PAGE_SIZE
  ) {
    throw new LibraryQueryError(
      'API_ERROR',
      '预约记录查询条件无效，请重新选择分类或页码。',
    )
  }

  return {
    category: params.category,
    currentPage: params.currentPage,
    serverPage: params.currentPage - 1,
    pageSize: DEFAULT_RECORD_PAGE_SIZE,
  }
}

function normalizeReservationRecordPage(
  value: unknown,
  params: ReturnType<typeof normalizeReservationRecordsQueryParams>,
): LibraryReservationRecordPage {
  let rawItems: unknown[]
  let totalCount: number

  if (params.category === 'today') {
    if (!Array.isArray(value)) {
      throw new LibraryQueryError(
        'INVALID_RESPONSE',
        '图书馆系统返回了无效的今日预约数据。',
      )
    }

    rawItems = value
    totalCount = value.length
  } else {
    if (!isRecord(value)) {
      throw new LibraryQueryError(
        'INVALID_RESPONSE',
        '图书馆系统返回了无效的预约记录分页数据。',
      )
    }

    const count = asNonNegativeInteger(value.count)
    const list = value.list === null ? [] : value.list

    if (
      count === undefined ||
      !Array.isArray(list) ||
      list.length > params.pageSize ||
      list.length > count
    ) {
      throw new LibraryQueryError(
        'INVALID_RESPONSE',
        '图书馆系统返回了无效的预约记录分页数据。',
      )
    }

    rawItems = list
    totalCount = count
  }

  const items = rawItems.map(normalizeReservationRecord)
  if (items.some((item) => item === undefined)) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约记录。',
    )
  }

  const totalPage = params.category === 'today'
    ? 1
    : Math.max(1, Math.ceil(totalCount / params.pageSize))

  if (params.category !== 'today' && params.currentPage > totalPage) {
    throw new LibraryQueryError(
      'INVALID_RESPONSE',
      '图书馆系统返回了无效的预约记录分页数据。',
    )
  }

  return {
    items: items as LibraryReservationRecord[],
    category: params.category,
    currentPage: params.category === 'today' ? 1 : params.currentPage,
    pageSize: params.pageSize,
    totalCount,
    totalPage,
    hasPrevious: params.category !== 'today' && params.currentPage > 1,
    hasNext:
      params.category !== 'today' && params.currentPage < totalPage,
  }
}

function normalizeCaptchaMode(value: unknown): 0 | 1 | 2 | undefined {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^[012]$/.test(value.trim())
        ? Number(value)
        : undefined

  return numeric === 0 || numeric === 1 || numeric === 2
    ? numeric
    : undefined
}

async function postProtectedQuery(
  token: string,
  url: string,
  context: string,
) {
  const headers = await getRequestHeaders(token)
  const envelope = await postJson(url, {}, headers, context)

  if (isAuthFailure(envelope)) {
    throw new LibraryQueryError(
      'AUTH_REQUIRED',
      '图书馆登录已过期，请重新登录后重试。',
    )
  }

  if (envelope.status === false || envelope.success === false) {
    throw new LibraryQueryError(
      'API_ERROR',
      apiMessage(envelope, `${context}，请稍后重试。`),
    )
  }

  return envelope.data
}

export async function fetchLibraryRooms(
  params: LibraryRoomQueryParams,
  storeId?: string,
  windowId?: number,
): Promise<LibraryRoomQueryResult> {
  let token: string | undefined

  try {
    const normalized = normalizeQueryParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return errorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆。',
      )
    }

    if (authentication.status === 'failed') {
      return errorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token

    const headers = await getRequestHeaders(token)
    const url = `${LIBRARY_API_ROOT}/frontApi/res/findRoomDuration/${normalized.buildingId}/${normalized.date}`
    const envelope = await postJson(
      url,
      normalized.body,
      headers,
      '图书馆余座查询失败',
    )

    if (isAuthFailure(envelope)) {
      await rejectLibraryToken(token, storeId)
      return errorResult(
        'AUTH_PENDING',
        '图书馆登录已过期，正在重新进行统一身份认证。',
      )
    }

    if (envelope.status === false || envelope.success === false) {
      return errorResult(
        'API_ERROR',
        apiMessage(envelope, '图书馆余座查询失败，请稍后重试。'),
      )
    }

    const page = normalizePage(envelope.data)

    return {
      ok: true,
      page,
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return errorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，正在重新进行统一身份认证。',
        )
      }
      return errorResult(error.code, error.message)
    }

    return errorResult(
      'API_ERROR',
      '图书馆余座查询失败，请稍后重试。',
    )
  }
}

export async function fetchLibrarySeats(
  params: LibrarySeatQueryParams,
  storeId?: string,
  windowId?: number,
): Promise<LibrarySeatQueryResult> {
  let token: string | undefined

  try {
    const normalized = normalizeSeatQueryParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return errorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆。',
      )
    }

    if (authentication.status === 'failed') {
      return errorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token

    const headers = await getRequestHeaders(token)
    const url = `${LIBRARY_API_ROOT}/frontApi/res/freeSeatIdsDuration/${encodeURIComponent(normalized.roomId)}/${normalized.date}`
    const envelope = await postJson(
      url,
      normalized.body,
      headers,
      '图书馆座位查询失败',
    )

    if (isAuthFailure(envelope)) {
      await rejectLibraryToken(token, storeId)
      return errorResult(
        'AUTH_PENDING',
        '图书馆登录已过期，正在重新进行统一身份认证。',
      )
    }

    if (envelope.status === false || envelope.success === false) {
      return errorResult(
        'API_ERROR',
        apiMessage(envelope, '图书馆座位查询失败，请稍后重试。'),
      )
    }

    const list = normalizeSeatList(envelope.data)

    return {
      ok: true,
      list,
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return errorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，正在重新进行统一身份认证。',
        )
      }
      return errorResult(error.code, error.message)
    }

    return errorResult(
      'API_ERROR',
      '图书馆座位查询失败，请稍后重试。',
    )
  }
}

export async function fetchLibraryReservationRecords(
  params: LibraryReservationRecordsQueryParams,
  storeId?: string,
  windowId?: number,
): Promise<LibraryReservationRecordsQueryResult> {
  let token: string | undefined

  try {
    const normalized = normalizeReservationRecordsQueryParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return errorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆。',
      )
    }

    if (authentication.status === 'failed') {
      return errorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token
    const url = normalized.category === 'today'
      ? `${LIBRARY_API_ROOT}/frontApi/user/lastMake`
      : `${LIBRARY_API_ROOT}/frontApi/user/${normalized.category}/${normalized.serverPage}/${normalized.pageSize}`
    const data = await postProtectedQuery(
      token,
      url,
      '读取图书馆预约记录失败',
    )

    return {
      ok: true,
      page: normalizeReservationRecordPage(data, normalized),
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return errorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，正在重新进行统一身份认证。',
        )
      }

      return errorResult(error.code, error.message)
    }

    return errorResult(
      'API_ERROR',
      '读取图书馆预约记录失败，请稍后重试。',
    )
  }
}

export async function fetchLibrarySeatReservationDetails(
  params: LibrarySeatReservationDetailsQueryParams,
  storeId?: string,
  windowId?: number,
): Promise<LibrarySeatReservationDetailsQueryResult> {
  let token: string | undefined

  try {
    const normalized = normalizeDetailsQueryParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return errorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆。',
      )
    }

    if (authentication.status === 'failed') {
      return errorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token
    const encodedSeatId = encodeURIComponent(normalized.seatId)
    const [timelineData, startTimesData] = await Promise.all([
      postProtectedQuery(
        token,
        `${LIBRARY_API_ROOT}/frontApi/res/getTimeLine/${encodedSeatId}/${normalized.date}`,
        '读取座位时间线失败',
      ),
      postProtectedQuery(
        token,
        `${LIBRARY_API_ROOT}/frontApi/res/getStartTimes/${encodedSeatId}/${normalized.date}`,
        '读取预约开始时间失败',
      ),
    ])
    const startTimes =
      normalizeTimeOptions<LibraryReservationStartValue>(
        startTimesData,
        true,
      )

    if (
      normalized.date !== shanghaiDateParts().date &&
      startTimes.some((option) => option.value === 'now')
    ) {
      throw new LibraryQueryError(
        'INVALID_RESPONSE',
        '图书馆系统返回了无效的预约开始时间。',
      )
    }

    const details: LibrarySeatReservationDetails = {
      timeline: normalizeTimeline(timelineData),
      startTimes,
    }

    return {
      ok: true,
      details,
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return errorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，正在重新进行统一身份认证。',
        )
      }
      return errorResult(error.code, error.message)
    }

    return errorResult(
      'API_ERROR',
      '读取座位预约信息失败，请稍后重试。',
    )
  }
}

export async function fetchLibrarySeatEndTimes(
  params: LibrarySeatEndTimesQueryParams,
  storeId?: string,
  windowId?: number,
): Promise<LibrarySeatEndTimesQueryResult> {
  let token: string | undefined

  try {
    const normalized = normalizeEndTimesQueryParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return errorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆。',
      )
    }

    if (authentication.status === 'failed') {
      return errorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token
    const data = await postProtectedQuery(
      token,
      `${LIBRARY_API_ROOT}/frontApi/res/getEndTimes/${encodeURIComponent(normalized.seatId)}/${normalized.date}/${normalized.requestMinute}`,
      '读取预约结束时间失败',
    )

    return {
      ok: true,
      options: normalizeTimeOptions<number>(data, false),
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return errorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，正在重新进行统一身份认证。',
        )
      }
      return errorResult(error.code, error.message)
    }

    return errorResult(
      'API_ERROR',
      '读取预约结束时间失败，请稍后重试。',
    )
  }
}

export async function submitLibraryReservation(
  params: LibraryReservationSubmitParams,
  storeId?: string,
  windowId?: number,
): Promise<LibraryReservationSubmitResult> {
  let token: string | undefined
  let freeBookStarted = false

  try {
    const normalized = normalizeSubmitParams(params)
    const authentication = await resolveOrStartLibraryAuthentication(
      storeId,
      windowId,
    )

    if (authentication.status === 'pending') {
      return reservationErrorResult(
        'AUTH_PENDING',
        '正在通过统一身份认证连接图书馆，请稍后重新确认预约。',
      )
    }

    if (authentication.status === 'failed') {
      return reservationErrorResult(
        'AUTH_REQUIRED',
        '未能完成图书馆自动登录，请在打开的登录页完成认证后重试。',
      )
    }

    token = authentication.token
    const settings = await getSystemSettings(token)
    const captchaMode = normalizeCaptchaMode(settings.mackCaptcha)

    if (captchaMode === undefined || captchaMode === 2) {
      return reservationErrorResult(
        'CAPTCHA_REQUIRED',
        '本次预约需要完成图书馆验证码，请前往图书馆系统提交。',
      )
    }

    if (captchaMode === 1) {
      let captchaEnvelope: ApiEnvelope

      try {
        const captchaHeaders = await getRequestHeaders(token)
        captchaEnvelope = await postJson(
          `${LIBRARY_API_ROOT}/cap/cg/checkHigh`,
          {},
          captchaHeaders,
          '检查图书馆验证码状态失败',
        )
      } catch (error) {
        if (
          error instanceof LibraryQueryError &&
          error.code === 'AUTH_REQUIRED'
        ) {
          throw error
        }

        return reservationErrorResult(
          'CAPTCHA_REQUIRED',
          '无法确认图书馆验证码状态，请前往图书馆系统提交。',
        )
      }

      if (isAuthFailure(captchaEnvelope)) {
        throw new LibraryQueryError(
          'AUTH_REQUIRED',
          '图书馆登录已过期，请重新登录后重试。',
        )
      }

      if (
        captchaEnvelope.status === false ||
        captchaEnvelope.success === false ||
        typeof captchaEnvelope.data !== 'boolean' ||
        captchaEnvelope.data
      ) {
        return reservationErrorResult(
          'CAPTCHA_REQUIRED',
          '本次预约需要完成图书馆验证码，请前往图书馆系统提交。',
        )
      }
    }

    const submissionHeaders = await getRequestHeaders(token)
    const submissionUrl =
      `${LIBRARY_API_ROOT}/frontApi/make/freeBook/` +
      `${encodeURIComponent(normalized.seatId)}/${normalized.date}/` +
      `${normalized.requestStartTime}/${normalized.endTime}?capToken=capToken`

    freeBookStarted = true
    const envelope = await postJson(
      submissionUrl,
      {},
      submissionHeaders,
      '提交图书馆预约失败',
    )

    if (isAuthFailure(envelope)) {
      await rejectLibraryToken(token, storeId)
      return reservationErrorResult(
        'AUTH_PENDING',
        '图书馆登录已过期，请重新认证后再次确认预约。',
      )
    }

    if (envelope.status === false || envelope.success === false) {
      return reservationErrorResult(
        'RESERVATION_REJECTED',
        apiMessage(envelope, '图书馆未接受本次预约，请检查时间后重试。'),
      )
    }

    const receipt = normalizeReservationReceipt(envelope.data, normalized)

    return {
      ok: true,
      receipt,
      fetchedAt: Date.now(),
    }
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      if (error.code === 'AUTH_REQUIRED' && token) {
        await rejectLibraryToken(token, storeId)
        return reservationErrorResult(
          'AUTH_PENDING',
          '图书馆登录已过期，请重新认证后再次确认预约。',
        )
      }

      if (freeBookStarted) {
        return reservationErrorResult(
          'RESULT_UNCERTAIN',
          '无法确认预约是否成功，请先到图书馆系统核对预约记录。',
        )
      }

      return reservationErrorResult(error.code, error.message)
    }

    return reservationErrorResult(
      freeBookStarted ? 'RESULT_UNCERTAIN' : 'API_ERROR',
      freeBookStarted
        ? '无法确认预约是否成功，请先到图书馆系统核对预约记录。'
        : '提交图书馆预约失败，请稍后重试。',
    )
  }
}
