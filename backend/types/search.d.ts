declare global {
  interface SearchResult {
    type: 'films' | 'series' | 'mangas';
    results: SearchItem[];
  }

  interface SearchItem {
    title: string;
    link?: string;
    description?: string;
    image?: string;
    relevanceScore?: number;
    release_date?: string;
    details?: {
      // For films: language -> quality -> link
      [language: string]: {
        [quality: string]: {
          link: string;
        };
      };
    } | {
      // For series/anime: season -> { episodes, versions{ language -> quality -> { link, fileSize } } }
      [season: string]: {
        episodes?: number; // Number of episodes in this season
        versions: {
          [language: string]: {
            [quality: string]: {
              link: string;
              fileSize?: string; // Size of one episode (e.g., "~545 Mo")
            };
          };
        };
      };
    };
  }

  interface SearchResponse {
    success: boolean;
    query: string;
    data: SearchResult[];
    timestamp: string;
  }

  interface SearchErrorResponse {
    success: false;
    message: string;
    error?: string;
  }

  interface HealthCheckResponse {
    success: true;
    message: string;
    timestamp: string;
  }
}

export {}
