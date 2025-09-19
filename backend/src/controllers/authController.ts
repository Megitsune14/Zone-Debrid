import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '@/models/User'
import Logger from '@/base/Logger'
import allDebridService from '@/services/allDebridService'

/**
 * Generate a JWT token for user authentication
 * @param {string} userId - The user ID to include in the token
 * @returns {string} The generated JWT token
 */
const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

/**
 * Register a new user account
 * @param {Request} req - Express request object containing username, password, and allDebridApiKey
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status and user data or error message
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, allDebridApiKey } = req.body

    // Validation des données
    if (!username || !password || !allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      })
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ username: username.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà pris'
      })
    }

    // Valider la clé API AllDebrid
    Logger.info(`Validation de la clé API AllDebrid pour l'utilisateur: ${username}`)
    const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
    if (!isApiKeyValid) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid fournie n\'est pas valide. Veuillez vérifier votre clé sur alldebrid.com'
      })
    }
    Logger.success(`Clé API AllDebrid validée pour l'utilisateur: ${username}`)

    // Créer le nouvel utilisateur
    const user = new User({
      username: username.toLowerCase(),
      password,
      allDebridApiKey
    })

    await user.save()

    // Générer le token
    const token = generateToken(user._id.toString())

    Logger.success(`Nouvel utilisateur créé: ${username}`)

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: user._id,
          username: user.username,
          allDebridApiKey: user.getDecryptedAllDebridApiKey(),
          createdAt: user.createdAt
        },
        token
      }
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de l'inscription: ${error.message}`)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message)
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      })
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    })
  }
}

/**
 * Authenticate user and return JWT token
 * @param {Request} req - Express request object containing username and password
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status and user data with token or error message
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // Validation des données
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur et mot de passe requis'
      })
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      })
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      })
    }

    // Générer le token
    const token = generateToken(user._id.toString())

    Logger.success(`Connexion réussie: ${username}`)

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          username: user.username,
          allDebridApiKey: user.getDecryptedAllDebridApiKey(),
          createdAt: user.createdAt
        },
        token
      }
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la connexion: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    })
  }
}

/**
 * Get authenticated user profile information
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with user profile data or error message
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          allDebridApiKey: user.getDecryptedAllDebridApiKey(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la récupération du profil: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    })
  }
}

/**
 * Update authenticated user profile (AllDebrid API key)
 * @param {Request} req - Express request object with authenticated user and new allDebridApiKey
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status and updated user data or error message
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { allDebridApiKey } = req.body
    const user = req.user

    if (!allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid est requise'
      })
    }

    // Valider la nouvelle clé API AllDebrid
    Logger.info(`Validation de la nouvelle clé API AllDebrid pour l'utilisateur: ${user.username}`)
    const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
    if (!isApiKeyValid) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid fournie n\'est pas valide. Veuillez vérifier votre clé sur alldebrid.com'
      })
    }
    Logger.success(`Nouvelle clé API AllDebrid validée pour l'utilisateur: ${user.username}`)

    // Mettre à jour la clé API
    user.allDebridApiKey = allDebridApiKey
    await user.save()

    Logger.success(`Profil mis à jour: ${user.username}`)

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: {
          id: user._id,
          username: user.username,
          allDebridApiKey: user.getDecryptedAllDebridApiKey(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la mise à jour du profil: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    })
  }
}

/**
 * Validate an AllDebrid API key without authentication
 * @param {Request} req - Express request object containing allDebridApiKey
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with validation result or error message
 */
export const validateApiKey = async (req: Request, res: Response) => {
  try {
    const { allDebridApiKey } = req.body

    if (!allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid est requise'
      })
    }

    // Valider la clé API AllDebrid
    const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
    
    if (!isApiKeyValid) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid fournie n\'est pas valide. Veuillez vérifier votre clé sur alldebrid.com'
      })
    }

    res.json({
      success: true,
      message: 'Clé API AllDebrid valide'
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la validation de la clé API: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation de la clé API'
    })
  }
}

/**
 * Update authenticated user password
 * @param {Request} req - Express request object with authenticated user, currentPassword, and newPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = req.user

    // Validation des données
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      })
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      })
    }

    // Validation du nouveau mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      })
    }

    // Mettre à jour le mot de passe
    user.password = newPassword
    await user.save()

    Logger.success(`Mot de passe modifié: ${user.username}`)

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la modification du mot de passe: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du mot de passe'
    })
  }
}

/**
 * Delete authenticated user account and all associated data
 * @param {Request} req - Express request object with authenticated user and password confirmation
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { password } = req.body
    const currentUser = req.user

    // Validation des données
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est requis pour supprimer le compte'
      })
    }

    // Récupérer l'utilisateur complet avec le mot de passe pour la vérification
    const user = await User.findById(currentUser._id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe incorrect'
      })
    }

    // Supprimer l'utilisateur et toutes ses données associées
    // MongoDB supprimera automatiquement les documents liés grâce aux références
    await User.findByIdAndDelete(user._id)

    Logger.success(`Compte supprimé: ${currentUser.username}`)

    res.json({
      success: true,
      message: 'Votre compte a été supprimé avec succès'
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la suppression du compte: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte'
    })
  }
}