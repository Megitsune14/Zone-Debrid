// Types de base pour l'application
export interface AppConfig {
  version: string
  name: string
}

// Types pour la nouvelle API
export interface SearchItem {
  title: string
  description?: string
  image?: string
  relevanceScore?: number
  release_date?: string
  details?: {
    // Pour les films: langue -> qualité -> lien
    [language: string]: {
      [quality: string]: {
        link: string
      }
    }
  } | {
    // Pour les séries/animes: saison -> { episodes, versions }
    [season: string]: {
      episodes?: number
      versions: {
        [language: string]: {
          [quality: string]: {
            link: string
            fileSize?: string
          }
        }
      }
    }
  }
}

export interface SearchResult {
  type: 'films' | 'series' | 'mangas'
  results: SearchItem[]
}

export interface SearchResponse {
  success: boolean
  query: string
  data: SearchResult[]
  timestamp: string
}

export interface SearchErrorResponse {
  success: false
  message: string
  error?: string
  code?: string
}


// Types pour les filtres
export type ContentType = 'all' | 'films' | 'series' | 'mangas'


