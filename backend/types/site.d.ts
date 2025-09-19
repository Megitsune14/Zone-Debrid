declare global {
  interface SiteStatusResponse {
    success: boolean
    data: {
      currentUrl: string
      urlHistory: string[]
      lastChecked: string
      responseTime: number
      isHealthy: boolean
    }
    timestamp: string
  }

  interface SiteErrorResponse {
    success: false
    message: string
    error?: string
  }

  interface ZTUrlData {
    currentUrl: string
    urlHistory: string[]
    lastChecked: Date
    responseTime: number
  }
}

export {}