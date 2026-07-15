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
