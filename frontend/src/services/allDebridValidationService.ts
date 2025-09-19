import authService from './authService'

export interface ValidationResult {
  isValid: boolean
  message?: string
}

/**
 * Vérifie si la clé API AllDebrid de l'utilisateur est valide
 */
export const validateUserAllDebridKey = async (): Promise<ValidationResult> => {
  try {
    // Récupérer le profil utilisateur pour obtenir la clé API
    const profile = await authService.getProfile()
    const apiKey = profile.data.user.allDebridApiKey

    if (!apiKey) {
      return {
        isValid: false,
        message: 'Aucune clé API AllDebrid configurée'
      }
    }

    // Valider la clé API
    await authService.validateAllDebridApiKey(apiKey)
    
    return {
      isValid: true
    }
  } catch (error: any) {
    return {
      isValid: false,
      message: error.message || 'Clé API AllDebrid invalide'
    }
  }
}

/**
 * Vérifie si l'utilisateur a une clé API AllDebrid configurée
 */
export const hasAllDebridKey = (): boolean => {
  // Cette fonction pourrait être étendue pour vérifier le localStorage ou le contexte
  // Pour l'instant, on se base sur la validation complète
  return true
}

const AllDebridValidationService = {
  validateUserAllDebridKey,
  hasAllDebridKey
}

export default AllDebridValidationService
