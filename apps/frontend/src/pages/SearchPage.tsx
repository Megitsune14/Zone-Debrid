import { useState, useRef, useCallback, useEffect } from 'react'
import SearchBar, { type ContentType } from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import SiteStatus, { type SiteStatusRef } from '../components/SiteStatus'
import ServiceUnavailableModal from '../components/ServiceUnavailableModal'
import type { SearchResult } from '../types'
import apiService from '../services/api'
import { checkServicesHealth, allServicesUp } from '../services/healthService'
import { useNotification } from '../contexts/NotificationContext'
import { log } from '../config/api'

type ServicesStatus = 'loading' | 'up' | 'down'

const SearchPage = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [servicesStatus, setServicesStatus] = useState<ServicesStatus>('loading')
  const [isRetryingServices, setIsRetryingServices] = useState(false)
  const siteStatusRef = useRef<SiteStatusRef>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchIdRef = useRef(0)
  const { showInvalidApiKeyModal } = useNotification()

  const checkServices = useCallback(async () => {
    const data = await checkServicesHealth()
    setServicesStatus(allServicesUp(data) ? 'up' : 'down')
  }, [])

  useEffect(() => {
    checkServices()
  }, [checkServices])

  const handleRetryServices = async () => {
    setIsRetryingServices(true)
    await checkServices()
    setIsRetryingServices(false)
  }

  const handleCancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    searchIdRef.current += 1
    abortControllerRef.current = null
    setIsSearching(false)
  }, [])

  useEffect(() => {
    return () => { handleCancelSearch() }
  }, [handleCancelSearch])

  const handleSearch = async (query: string, contentType: ContentType, year?: number) => {
    if (servicesStatus !== 'up') return
    if (isSearching) return
    setHasSearched(true)
    setIsSearching(true)
    const thisSearchId = ++searchIdRef.current
    const controller = new AbortController()
    abortControllerRef.current = controller
    const signal = controller.signal

    try {
      const response = await apiService.searchContent(query, contentType, year, signal)
      if (signal.aborted || thisSearchId !== searchIdRef.current) return
      setSearchResults(response.data)
      if (signal.aborted || thisSearchId !== searchIdRef.current) return
      if (siteStatusRef.current) {
        siteStatusRef.current.refreshStatus()
      }
    } catch (error: unknown) {
      if (thisSearchId !== searchIdRef.current) return
      const err = error as { name?: string; message?: string; code?: string }
      const isAbort = signal.aborted ||
        err.name === 'AbortError' ||
        err.code === 'ABORTED'
      if (isAbort) return
      setSearchResults([])
      if (err.name === 'InvalidApiKeyError') {
        showInvalidApiKeyModal(err.message ?? '')
      } else {
        log.error('Search failed:', error)
      }
    } finally {
      if (thisSearchId === searchIdRef.current) {
        setIsSearching(false)
        abortControllerRef.current = null
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <ServiceUnavailableModal
        isOpen={servicesStatus === 'down'}
        onRetry={handleRetryServices}
        isRetrying={isRetryingServices}
        variant="services"
      />

      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Recherche</h1>
      </div>

      <SiteStatus ref={siteStatusRef} />
      <SearchBar
        onSearch={handleSearch}
        onCancel={handleCancelSearch}
        isSearching={isSearching}
        disabled={servicesStatus !== 'up'}
      />
      <div className="mt-6 sm:mt-8">
        <SearchResults
          results={searchResults}
          isLoading={isSearching}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  )
}

export default SearchPage
