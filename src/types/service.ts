// src/types/service.ts
export type ServiceCategory =
  | 'study'
  | 'life'
  | 'network'
  | 'library'
  | 'finance'
  | 'admin'
  | 'other'

export interface PortalService {
  id: string
  name: string
  description?: string
  url: string
  category: ServiceCategory
  keywords: string[]
  sensitive?: boolean
  source: 'manual' | 'portal' | 'user'
}