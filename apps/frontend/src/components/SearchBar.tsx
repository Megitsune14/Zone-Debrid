import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

export type ContentType = 'all' | 'films' | 'series' | 'mangas'

interface SearchBarProps {
  onSearch: (query: string, contentType: ContentType, year?: number) => void
  isSearching: boolean
}

const SearchBar = ({ onSearch, isSearching }: SearchBarProps) => {
  const [query, setQuery] = useState('')
  const [contentType, setContentType] = useState<ContentType>('all')
  const [year, setYear] = useState<number | undefined>(undefined)

  // Generate year options from current year to 1950
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim(), contentType, year)
    }
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un film, une série ou un anime..."
              className="input-field w-full pl-10 pr-4"
              disabled={isSearching}
            />
          </div>
          
          {/* Filters Container */}
          <div className="flex flex-row space-x-2 md:space-x-4 md:flex-shrink-0">
            {/* Content Type Filter */}
            <div className="flex-1 md:flex-shrink-0">
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="input-field w-full md:min-w-[120px]"
                disabled={isSearching}
              >
                <option value="all">Tous</option>
                <option value="films">Films</option>
                <option value="series">Séries</option>
                <option value="mangas">Animes</option>
              </select>
            </div>
            
            {/* Year Filter */}
            <div className="flex-1 md:flex-shrink-0">
              <select
                value={year || ''}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="input-field w-full md:min-w-[100px]"
                disabled={isSearching}
              >
                <option value="">Toutes années</option>
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {isSearching ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SearchBar
