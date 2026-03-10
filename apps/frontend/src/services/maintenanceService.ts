import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

export interface PublicMaintenanceStatus {
  maintenanceEnabled: boolean
  maintenanceMessage: string
}

export const getPublicMaintenanceStatus = async (): Promise<PublicMaintenanceStatus> => {
  return request<PublicMaintenanceStatus>(`${API_CONFIG.API_URL}/maintenance`)
}

