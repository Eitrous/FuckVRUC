import {
  LIBRARY_BUILDINGS,
  type LibraryQueryErrorCode,
  type LibraryRoom,
  type LibraryRoomPage,
  type LibraryRoomQueryParams,
  type LibraryRoomQueryResult,
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
): LibraryRoomQueryResult {
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

async function getRequestHeaders(token: string) {
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

  const headers = baseHeaders(token)

  if (hmacIsEnabled(envelope.data.hmac)) {
    const decryptedKey = await decryptHmacKey(envelope.data.hmacKey)
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

function isValidQueryDate(value: unknown) {
  if (typeof value !== 'string' || !LIBRARY_DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
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
