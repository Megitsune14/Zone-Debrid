import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

const setMasterPassword = async (masterPassword: string, currentMasterPassword?: string): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.API_URL}/metrics/set-master-password`, {
    method: 'POST',
    body: { masterPassword, currentMasterPassword }
  })
}

const authenticateMasterPassword = async (masterPassword: string): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.API_URL}/metrics/authenticate-master`, {
    method: 'POST',
    body: { masterPassword }
  })
}

const getMetrics = async (): Promise<{ success: boolean; data: any }> => {
  return request(`${API_CONFIG.API_URL}/metrics`)
}

export interface GetDownloadsListParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: string
  type?: string
  search?: string
}

export interface DownloadListItem {
  _id: string
  title: string
  type: string
  status: string
  startTime: string
  endTime?: string
  fileSize?: number
  language?: string
  quality?: string
  season?: string
  errorMessage?: string
  username: string
  createdAt: string
}

export interface GetDownloadsListResponse {
  success: boolean
  data: DownloadListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const getDownloadsList = async (params: GetDownloadsListParams = {}): Promise<GetDownloadsListResponse> => {
  const searchParams = new URLSearchParams()
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.limit != null) searchParams.set('limit', String(params.limit))
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  if (params.status) searchParams.set('status', params.status)
  if (params.type) searchParams.set('type', params.type)
  if (params.search) searchParams.set('search', params.search)
  const url = `${API_CONFIG.API_URL}/metrics/downloads${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  return request<GetDownloadsListResponse>(url)
}

const MetricsService = {
  setMasterPassword,
  authenticateMasterPassword,
  getMetrics,
  getDownloadsList
}

export default MetricsService
