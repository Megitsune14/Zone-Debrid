import { useState } from 'react'
import { FiDownload, FiFilm, FiTv, FiPlay, FiCalendar, FiGlobe, FiSearch, FiStar } from 'react-icons/fi'
import type { SearchResult, SearchItem } from '../types'
import DownloadModal from './DownloadModal.tsx'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  hasSearched: boolean
}

const SearchResults = ({ results, isLoading, hasSearched }: SearchResultsProps) => {
  const [selectedResult, setSelectedResult] = useState<{ result: SearchResult; item: SearchItem } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'films':
        return <FiFilm className="h-4 w-4" />
      case 'series':
        return <FiTv className="h-4 w-4" />
      case 'mangas':
        return <FiPlay className="h-4 w-4" />
      default:
        return <FiFilm className="h-4 w-4" />
    }
  }

  const handleDownloadClick = (result: SearchResult, item: SearchItem) => {
    setSelectedResult({ result, item })
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedResult(null)
  }


  const toggleDescription = (itemId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const truncateDescription = (description: string, itemId: string) => {
    if (description.length <= 300) {
      return description
    }

    const isExpanded = expandedDescriptions.has(itemId)
    const truncatedText = description.substring(0, 300) + '...'

    return (
      <div>
        <span>{isExpanded ? description : truncatedText}</span>
        <button
          onClick={() => toggleDescription(itemId)}
          className="ml-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          {isExpanded ? 'voir moins' : 'voir plus'}
        </button>
      </div>
    )
  }

  const renderVersionsInfo = (item: SearchItem, resultType: string) => {
    if (!item.details) return null

    if (resultType === 'films') {
      // Pour les films: details[language][quality]
      const details = item.details as { [language: string]: { [quality: string]: { link: string } } }
      const languages = Object.keys(details)
      
      if (languages.length === 0) return null

      return (
        <div className="space-y-2">
          {languages.map((language) => {
            const qualities = Object.keys(details[language])
            return (
              <div key={language} className="flex items-center space-x-2 text-sm">
                <FiGlobe className="h-4 w-4 text-blue-400" />
                <span className="text-gray-400">{language}:</span>
                <div className="flex flex-wrap gap-1">
                  {qualities.map((quality) => (
                    <span
                      key={quality}
                      className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium"
                    >
                      {quality}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )
    } else {
      // Pour les séries/animes: details[season].versions[language][quality]
      const details = item.details as { [season: string]: { episodes?: number; versions: { [language: string]: { [quality: string]: { link: string; fileSize?: string } } } } }
      const seasons = Object.keys(details)
      
      if (seasons.length === 0) return null

      return (
        <div className="space-y-3">
          {seasons.map((season) => {
            const seasonData = details[season]
            const languages = Object.keys(seasonData.versions)
            
            return (
              <div key={season} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FiStar className="h-4 w-4 text-green-400" />
                  <span className="text-gray-400 font-medium">{season.replace('SAISON_', 'Saison ')}</span>
                  {seasonData.episodes && (
                    <span className="text-xs text-gray-500">({seasonData.episodes} épisodes)</span>
                  )}
                </div>
                
                {languages.map((language) => {
                  const qualities = Object.keys(seasonData.versions[language])
                  return (
                    <div key={language} className="ml-6 flex items-center space-x-2 text-sm">
                      <FiGlobe className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-400">{language}:</span>
                      <div className="flex flex-wrap gap-1">
                        {qualities.map((quality) => {
                          const fileSize = seasonData.versions[language][quality].fileSize
                          return (
                            <span
                              key={quality}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium"
                              title={fileSize ? `Taille: ${fileSize}` : undefined}
                            >
                              {quality}
                              {fileSize && <span className="ml-1 text-gray-400">({fileSize})</span>}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-400">Recherche en cours...</span>
        </div>
      </div>
    )
  }

  if (!hasSearched) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <FiSearch className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Veuillez commencer une recherche</h3>
          <p className="text-gray-500">Tapez le nom d'un film, d'une série ou d'un anime</p>
        </div>
      </div>
    )
  }

  // Check if there are any actual results (not just empty arrays)
  const hasAnyResults = results.some(result => result.results && result.results.length > 0)
  
  if (!hasAnyResults) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <FiSearch className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Aucun résultat</h3>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.filter(result => result.results.length > 0).map((result) => (
        <div key={result.type} className="space-y-4">
          {result.results.map((item, index) => (
              <div key={`${result.type}-${index}`} className="card">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-32 h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-dark-700 rounded-lg flex items-center justify-center">
                        {getTypeIcon(result.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                        <div className="text-gray-400 text-sm mb-2">
                          {item.description && truncateDescription(item.description, `${result.type}-${index}`)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          {item.release_date && (
                            <div className="flex items-center space-x-1">
                              <FiCalendar className="h-4 w-4" />
                              <span>{item.release_date}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            {getTypeIcon(result.type)}
                            <span className="capitalize">
                              {result.type === 'films' && 'Film'}
                              {result.type === 'series' && 'Série'}
                              {result.type === 'mangas' && 'Anime'}
                            </span>
                          </div>
                        </div>

                        {/* Affichage des versions */}
                        <div className="space-y-1">
                          {renderVersionsInfo(item, result.type)}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownloadClick(result, item)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <FiDownload className="h-4 w-4" />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ))}

      {/* Download Modal */}
      {selectedResult && (
        <DownloadModal
          result={selectedResult.result}
          item={selectedResult.item}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}

export default SearchResults
