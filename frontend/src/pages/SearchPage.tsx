import { useState, useRef } from 'react'
import SearchBar, { type ContentType } from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import SiteStatus, { type SiteStatusRef } from '../components/SiteStatus'
import type { SearchResult } from '../types'
import apiService from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

const SearchPage = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const siteStatusRef = useRef<SiteStatusRef>(null)
  const { showInvalidApiKeyModal } = useNotification()


  const handleSearch = async (query: string, contentType: ContentType, year?: number) => {
    setHasSearched(true)
    setIsSearching(true)
    try {
      const response = await apiService.searchContent(query, contentType, year)
      setSearchResults(response.data)
      
      // Rafraîchir le statut du site après une recherche réussie
      if (siteStatusRef.current) {
        siteStatusRef.current.refreshStatus()
      }
    } catch (error: any) {
      setSearchResults([])
      
      // Vérifier si c'est une erreur de clé API invalide
      if (error.name === 'InvalidApiKeyError') {
        showInvalidApiKeyModal(error.message)
      }else {
        console.error('Search failed:', error)
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Recherche</h1>
      </div>
      
      <SiteStatus ref={siteStatusRef} />
      <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      <div className="mt-8">
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
