export const LIBRARY_BUILDINGS = [
  {
    id: '1875080631899230208',
    name: '图书馆',
    floors: [
      { id: 0, name: '全部楼层' },
      { id: '1876808903766937600', name: 'B1' },
      { id: '1876448627456577536', name: '一楼' },
      { id: '1876448701611872256', name: '二楼' },
      { id: '1876808661059342336', name: '三楼' },
      { id: '1876808742844076032', name: '四楼' },
      { id: '1876808803686649856', name: '五楼' },
    ],
  },
  {
    id: '1875080659246092288',
    name: '藏书馆',
    floors: [
      { id: 0, name: '全部楼层' },
      { id: '1876809036554407936', name: '二楼' },
      { id: '1876809088236621824', name: '三楼' },
      { id: '1876809139906252800', name: '四楼' },
    ],
  },
] as const

export type LibraryBuildingId = (typeof LIBRARY_BUILDINGS)[number]['id']
export type LibraryFloorId =
  (typeof LIBRARY_BUILDINGS)[number]['floors'][number]['id']

export type LibraryRoomQueryParams = {
  buildingId: LibraryBuildingId
  date: string
  floorId: LibraryFloorId
  beginMinute: number
  endMinute: number
  power: boolean
  windows: boolean
  currentPage: number
  pageSize: number
}

export type LibraryRoom = {
  id: string
  buildingId: string
  floorId: string
  name: string
  buildingName: string
  floorName: string
  seatFree: number
  seatTotal: number
  raw: Record<string, unknown>
}

export type LibraryRoomPage = {
  items: LibraryRoom[]
  currentPage: number
  pageSize: number
  totalCount: number
  totalPage: number
  hasPrevious: boolean
  hasNext: boolean
}

export type LibraryQueryErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_PENDING'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'API_ERROR'

export type LibraryRoomQueryResult =
  | {
      ok: true
      page: LibraryRoomPage
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryQueryErrorCode
      fetchedAt: number
    }

export type LibrarySeatStatus = 'FREE' | 'IN_USE' | 'AWAY' | 'UNKNOWN'

export type LibrarySeat = {
  id: string
  label: string
  name: string
  status: LibrarySeatStatus
  rawStatus: string
  afterFree: boolean
  raw: Record<string, unknown>
}

export type LibrarySeatQueryParams = {
  roomId: string
  date: string
  beginMinute: number
  endMinute: number
}

export type LibrarySeatList = {
  items: LibrarySeat[]
  totalCount: number
  freeCount: number
}

export type LibrarySeatQueryResult =
  | {
      ok: true
      list: LibrarySeatList
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryQueryErrorCode
      fetchedAt: number
    }

export type LibraryTimelineMark = {
  label: string
  left: number
}

export type LibraryTimelineFreePeriod = {
  label: string
  left: number
  width: number
}

export type LibraryReservationStartValue = 'now' | number

export type LibraryTimeOption<
  T extends LibraryReservationStartValue = number,
> = {
  value: T
  label: string
}

export type LibrarySeatReservationDetailsQueryParams = {
  seatId: string
  date: string
}

export type LibrarySeatReservationDetails = {
  timeline: {
    marks: LibraryTimelineMark[]
    freePeriods: LibraryTimelineFreePeriod[]
  }
  startTimes: LibraryTimeOption<LibraryReservationStartValue>[]
}

export type LibrarySeatReservationDetailsQueryResult =
  | {
      ok: true
      details: LibrarySeatReservationDetails
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryQueryErrorCode
      fetchedAt: number
    }

export type LibrarySeatEndTimesQueryParams = {
  seatId: string
  date: string
  startTime: LibraryReservationStartValue
}

export type LibrarySeatEndTimesQueryResult =
  | {
      ok: true
      options: LibraryTimeOption<number>[]
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryQueryErrorCode
      fetchedAt: number
    }

export type LibraryReservationSubmitParams = {
  seatId: string
  date: string
  startTime: LibraryReservationStartValue
  endTime: number
}

export type LibraryReservationReceipt = {
  id: string
  receipt: string
  roomId: string
  seatId: string
  seatLabel: string
  date: string
  beginMinute: number
  endMinute: number
  beginLabel: string
  endLabel: string
  status: string
  buildingName: string
  floorName: string
  roomName: string
  location: string
  message: string
}

export type LibraryReservationErrorCode =
  | LibraryQueryErrorCode
  | 'CAPTCHA_REQUIRED'
  | 'RESERVATION_REJECTED'
  | 'RESULT_UNCERTAIN'

export type LibraryReservationSubmitResult =
  | {
      ok: true
      receipt: LibraryReservationReceipt
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryReservationErrorCode
      fetchedAt: number
    }

export type LibraryReservationRecordCategory =
  | 'today'
  | 'history'
  | 'breach'

export type LibraryReservationRecordStatus =
  | 'CHECK_IN'
  | 'LEAVE_EARLY'
  | 'AWAY'
  | 'RESERVE'
  | 'STOP'
  | 'MISS'
  | 'CANCEL'
  | 'NO_STOP'
  | 'UNKNOWN'

export type LibraryReservationRecord = {
  id: string
  roomId: string
  seatId: string
  seatLabel: string
  receipt: string
  date: string
  beginMinute: number
  endMinute: number
  beginLabel: string
  endLabel: string
  actualBeginMinute?: number
  actualEndMinute?: number
  actualTimeLabel: string
  awayRange: string
  useMinute: number
  status: LibraryReservationRecordStatus
  rawStatus: string
  buildingName: string
  floorName: string
  roomName: string
  location: string
  message: string
}

export type LibraryReservationRecordPage = {
  items: LibraryReservationRecord[]
  category: LibraryReservationRecordCategory
  currentPage: number
  pageSize: 10
  totalCount: number
  totalPage: number
  hasPrevious: boolean
  hasNext: boolean
}

export type LibraryReservationRecordsQueryParams = {
  category: LibraryReservationRecordCategory
  currentPage: number
  pageSize: 10
}

export type LibraryReservationRecordsQueryResult =
  | {
      ok: true
      page: LibraryReservationRecordPage
      fetchedAt: number
    }
  | {
      ok: false
      error: string
      errorCode: LibraryQueryErrorCode
      fetchedAt: number
    }
