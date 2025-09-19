declare global {
  // Types pour la fonctionnalité de téléchargement

  interface DownloadAvailability {
    type: 'films' | 'series' | 'mangas';
    episode?: string;
    availability: {
      [episode: string]: {
        host: string | null;
        link?: string;
        available: boolean;
        error?: string;
      };
    };
  }

  interface ScrapedHosts {
    [host: string]: {
      [episode: string]: { link: string };
    } | {
      link: string; // Pour les films
    };
  }

  interface LinkAvailability {
    available: boolean;
    debridedLink?: string;
    filename?: string;
    filesize?: string;
    error?: string;
  }

  interface DownloadCheckRequest {
    downloadLink: string;
    type: 'films' | 'series' | 'mangas';
    episodes?: string[]; // Changé de episode à episodes pour supporter multiple
  }

  interface DownloadCheckResponse {
    success: boolean;
    data: DownloadAvailability;
    message?: string;
    error?: string;
  }

}

export {}
