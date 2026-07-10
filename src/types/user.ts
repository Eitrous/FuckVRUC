
export type UserInfo = {
  name: string
  studentId: string
  college: string
  major: string
  class: string
  raw?: unknown
}

export type UserAuthenticationState =
  | 'authenticated'
  | 'unauthenticated'
  | 'unknown'

export interface UserInfoQueryResult {
  ok: boolean
  authState: UserAuthenticationState
  raw?: unknown
  userInfo: UserInfo | null
  error?: string
  fetchedAt: number
}

export interface LoginStatusQueryResult {
  ok: boolean
  isLoggedIn: boolean
  error?: string
  fetchedAt: number
}
