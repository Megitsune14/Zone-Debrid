import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

export interface AdminUserListItem {
  id: string
  username: string
  role: string
  aria2Enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ListUsersParams {
  page?: number
  limit?: number
  search?: string
}

export interface ListUsersResponse {
  success: boolean
  data: AdminUserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserBody {
  username: string
  password: string
  allDebridApiKey: string
  aria2Enabled?: boolean
  aria2RpcUrl?: string
  aria2RpcSecret?: string
  aria2DownloadBasePath?: string
  aria2PathFilms?: string
  aria2PathSeries?: string
  aria2PathAnimes?: string
  aria2PathSeriesSeason?: string
}

export interface ListSearchesParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}

export interface SearchHistoryItem {
  id: string
  query: string
  type: string | null
  year: number | null
  username: string
  userId: string | null
  createdAt: string
}

export interface ListSearchesResponse {
  success: boolean
  data: SearchHistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const listSearches = async (params: ListSearchesParams = {}): Promise<ListSearchesResponse> => {
  const searchParams = new URLSearchParams()
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.limit != null) searchParams.set('limit', String(params.limit))
  if (params.search) searchParams.set('search', params.search)
  if (params.type) searchParams.set('type', params.type)
  if (params.userId) searchParams.set('userId', params.userId)
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  const url = `${API_CONFIG.API_URL}/admin/searches${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  const res = await request<ListSearchesResponse>(url)
  return res
}

const listUsers = async (params: ListUsersParams = {}): Promise<ListUsersResponse> => {
  const searchParams = new URLSearchParams()
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.limit != null) searchParams.set('limit', String(params.limit))
  if (params.search) searchParams.set('search', params.search)
  const url = `${API_CONFIG.API_URL}/admin/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  return request<ListUsersResponse>(url)
}

export interface DashboardSummary {
  usersTotal: number
  downloadsTotal: number
  downloadsLast24h: number
}

export interface MaintenanceConfig {
  maintenanceEnabled: boolean
  maintenanceMessage: string
}

const getDashboardSummary = async (): Promise<{ success: boolean; data: DashboardSummary }> => {
  return request(`${API_CONFIG.API_URL}/admin/dashboard-summary`)
}

const getMaintenanceConfig = async (): Promise<{ success: boolean; data: MaintenanceConfig }> => {
  return request(`${API_CONFIG.API_URL}/admin/maintenance`)
}

const updateMaintenanceConfig = async (body: MaintenanceConfig): Promise<{ success: boolean; data: MaintenanceConfig }> => {
  return request(`${API_CONFIG.API_URL}/admin/maintenance`, {
    method: 'PUT',
    body
  })
}

const createUser = async (body: CreateUserBody): Promise<{ success: boolean; message: string; data: { id: string; username: string; createdAt: string } }> => {
  return request(`${API_CONFIG.API_URL}/admin/users`, {
    method: 'POST',
    body
  })
}

const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.API_URL}/admin/users/${id}`, {
    method: 'DELETE'
  })
}

const updateUserRole = async (id: string, role: 'user' | 'admin'): Promise<{ success: boolean; message: string; data?: { id: string; username: string; role: string } }> => {
  return request(`${API_CONFIG.API_URL}/admin/users/${id}`, {
    method: 'PATCH',
    body: { role }
  })
}

const adminService = {
  getDashboardSummary,
  listUsers,
  listSearches,
  createUser,
  deleteUser,
  updateUserRole,
  getMaintenanceConfig,
  updateMaintenanceConfig
}

export default adminService
