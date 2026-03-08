import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '@/models/User'
import Logger from '@/base/Logger'
import allDebridService from '@/services/allDebridService'
import aria2Service from '@/services/aria2Service'
import { AppError } from '@/middleware/errorHandler'
import { sendServiceDownAlert } from '@/services/discordWebhookService'

interface Aria2ConfigInput {
  aria2Enabled?: boolean
  aria2RpcUrl?: string
  aria2RpcSecret?: string
  aria2DownloadBasePath?: string
  aria2PathFilms?: string
  aria2PathSeries?: string
  aria2PathSeriesSeason?: string
}

const buildUserResponse = (user: any) => ({
  id: user._id,
  username: user.username,
  allDebridApiKey: user.getDecryptedAllDebridApiKey(),
  isAdmin: user.role === 'admin',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  aria2Enabled: user.aria2Enabled ?? false,
  aria2RpcUrl: user.getDecryptedAria2RpcUrl?.() ?? user.aria2RpcUrl ?? undefined,
  aria2RpcSecret: user.getDecryptedAria2RpcSecret?.() ?? user.aria2RpcSecret ?? undefined,
  aria2DownloadBasePath: user.aria2DownloadBasePath ?? undefined,
  aria2PathFilms: user.aria2PathFilms ?? undefined,
  aria2PathSeries: user.aria2PathSeries ?? undefined,
  aria2PathSeriesSeason: user.aria2PathSeriesSeason ?? undefined
})

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
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      username,
      password,
      allDebridApiKey,
      aria2Enabled,
      aria2RpcUrl,
      aria2RpcSecret,
      aria2DownloadBasePath,
      aria2PathFilms,
      aria2PathSeries,
      aria2PathSeriesSeason
    } = req.body as {
      username?: string
      password?: string
      allDebridApiKey?: string
    } & Aria2ConfigInput

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

    // Vérifier la disponibilité d'AllDebrid avant de valider la clé (éviter de rejeter une clé valide si service down)
    const allDebridAvailable = await allDebridService.isAvailable()
    if (!allDebridAvailable) {
      sendServiceDownAlert('AllDebrid').catch(() => {})
      return res.status(503).json({
        success: false,
        message: 'Le service AllDebrid est temporairement indisponible. Veuillez réessayer dans quelques minutes.',
        code: 'ALLDEBRID_UNAVAILABLE'
      })
    }

    // Valider la clé API AllDebrid
    Logger.info(`Validation de la clé API AllDebrid pour l'utilisateur: ${username}`)
    try {
      const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
      if (!isApiKeyValid) {
        return res.status(400).json({
          success: false,
          message: 'La clé API AllDebrid fournie n\'est pas valide. Vérifiez-la sur alldebrid.com',
          code: 'INVALID_API_KEY'
        })
      }
    } catch (err) {
      Logger.error(`Erreur réseau lors de la validation AllDebrid: ${err instanceof Error ? err.message : err}`)
      return res.status(502).json({
        success: false,
        message: 'Erreur de connexion temporaire. Veuillez réessayer.',
        code: 'NETWORK_ERROR'
      })
    }
    Logger.success(`Clé API AllDebrid validée pour l'utilisateur: ${username}`)

    // Créer le nouvel utilisateur
    const user = new User({
      username: username.toLowerCase(),
      password,
      allDebridApiKey,
      aria2Enabled: Boolean(aria2Enabled),
      aria2RpcUrl: aria2RpcUrl || undefined,
      aria2RpcSecret: aria2RpcSecret || undefined,
      aria2DownloadBasePath: aria2DownloadBasePath || undefined,
      aria2PathFilms: aria2PathFilms || undefined,
      aria2PathSeries: aria2PathSeries || undefined,
      aria2PathSeriesSeason: aria2PathSeriesSeason || undefined
    })

    await user.save()

    // Générer le token
    const token = generateToken(user._id.toString())

    Logger.success(`Nouvel utilisateur créé: ${username}`)

    const userForResponse = await User.findById(user._id).select('+aria2RpcSecret').exec()
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: buildUserResponse(userForResponse ?? user),
        token
      }
    })

  } catch (error: unknown) {
    const err = error as { name?: string; errors?: Record<string, { message: string }>; message?: string }
    Logger.error(`Erreur lors de l'inscription: ${err.message ?? error}`)
    if (err.name === 'ValidationError' && err.errors) {
      const errors = Object.values(err.errors).map((e) => e.message)
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      })
    }
    next(error instanceof Error ? error : new AppError('Erreur lors de l\'inscription', 500))
  }
}

/**
 * Authenticate user and return JWT token
 * @param {Request} req - Express request object containing username and password
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status and user data with token or error message
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
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

    const userForResponse = await User.findById(user._id).select('+aria2RpcSecret').exec()
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: buildUserResponse(userForResponse ?? user),
        token
      }
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la connexion: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la connexion', 500))
  }
}

/**
 * Get authenticated user profile information
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with user profile data or error message
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userWithSecret = await User.findById(req.user!._id).select('+aria2RpcSecret').exec()
    const user = userWithSecret ?? req.user

    res.json({
      success: true,
      data: {
        user: buildUserResponse(user)
      }
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la récupération du profil: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération du profil', 500))
  }
}

/**
 * Update authenticated user profile (AllDebrid API key)
 * @param {Request} req - Express request object with authenticated user and new allDebridApiKey
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status and updated user data or error message
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      allDebridApiKey,
      aria2Enabled,
      aria2RpcUrl,
      aria2RpcSecret,
      aria2DownloadBasePath,
      aria2PathFilms,
      aria2PathSeries,
      aria2PathSeriesSeason
    } = req.body as {
      allDebridApiKey?: string
    } & Aria2ConfigInput
    const user = req.user

    // Mettre à jour la clé API uniquement si fournie
    if (allDebridApiKey) {
      Logger.info(`Validation de la nouvelle clé API AllDebrid pour l'utilisateur: ${user.username}`)
      const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
      if (!isApiKeyValid) {
        return res.status(400).json({
          success: false,
          message: 'La clé API AllDebrid fournie n\'est pas valide. Veuillez vérifier votre clé sur alldebrid.com'
        })
      }
      Logger.success(`Nouvelle clé API AllDebrid validée pour l'utilisateur: ${user.username}`)
      user.allDebridApiKey = allDebridApiKey
    }

    // Mettre à jour la configuration Aria2 si fournie
    if (typeof aria2Enabled === 'boolean') {
      user.aria2Enabled = aria2Enabled
      if (!aria2Enabled) {
        user.aria2RpcUrl = undefined
        user.aria2RpcSecret = undefined
        user.aria2DownloadBasePath = undefined
        user.aria2PathFilms = undefined
        user.aria2PathSeries = undefined
        user.aria2PathSeriesSeason = undefined
      }
    }
    if (user.aria2Enabled) {
      if (typeof aria2RpcUrl === 'string') {
        user.aria2RpcUrl = aria2RpcUrl || undefined
      }
      if (typeof aria2DownloadBasePath === 'string') {
        user.aria2DownloadBasePath = aria2DownloadBasePath || undefined
      }
      if (typeof aria2PathFilms === 'string') {
        user.aria2PathFilms = aria2PathFilms.trim() || undefined
      }
      if (typeof aria2PathSeries === 'string') {
        user.aria2PathSeries = aria2PathSeries.trim() || undefined
      }
      if (typeof aria2PathSeriesSeason === 'string') {
        user.aria2PathSeriesSeason = aria2PathSeriesSeason.trim() || undefined
      }
      if (typeof aria2RpcSecret === 'string' && aria2RpcSecret.trim().length > 0) {
        user.aria2RpcSecret = aria2RpcSecret
      }
    }

    await user.save()

    Logger.success(`Profil mis à jour: ${user.username}`)

    const updated = await User.findById(user._id).select('+aria2RpcSecret').exec()
    const userForResponse = updated ?? user

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: buildUserResponse(userForResponse)
      }
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la mise à jour du profil: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la mise à jour du profil', 500))
  }
}

/**
 * Validate an AllDebrid API key without authentication.
 * Vérifie d'abord la disponibilité d'AllDebrid pour distinguer clé invalide / service down / réseau.
 */
export const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { allDebridApiKey } = req.body

    if (!allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'La clé API AllDebrid est requise'
      })
    }

    const allDebridAvailable = await allDebridService.isAvailable()
    if (!allDebridAvailable) {
      sendServiceDownAlert('AllDebrid').catch(() => {})
      return res.status(503).json({
        success: false,
        message: 'Le service AllDebrid est temporairement indisponible. Réessayez dans quelques minutes.',
        code: 'ALLDEBRID_UNAVAILABLE'
      })
    }

    try {
      const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
      if (!isApiKeyValid) {
        return res.status(400).json({
          success: false,
          message: 'Clé API invalide. Vérifiez-la sur alldebrid.com',
          code: 'INVALID_API_KEY'
        })
      }
    } catch (err) {
      Logger.error(`Erreur réseau validation clé API: ${err instanceof Error ? err.message : err}`)
      return res.status(502).json({
        success: false,
        message: 'Erreur de connexion temporaire. Réessayez.',
        code: 'NETWORK_ERROR'
      })
    }

    res.json({
      success: true,
      message: 'Clé API AllDebrid valide'
    })
  } catch (error: unknown) {
    Logger.error(`Erreur lors de la validation de la clé API: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la validation de la clé API', 500))
  }
}

/**
 * Vérifier la connexion à une instance Aria2 (aria2.getVersion).
 * Route protégée : évite de sauvegarder une URL invalide.
 */
export const verifyAria2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aria2RpcUrl, aria2RpcSecret } = req.body as { aria2RpcUrl?: string; aria2RpcSecret?: string }

    if (!aria2RpcUrl || typeof aria2RpcUrl !== 'string' || !aria2RpcUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'L\'URL RPC Aria2 est requise'
      })
    }

    const url = aria2RpcUrl.trim()
    const secret = typeof aria2RpcSecret === 'string' ? aria2RpcSecret.trim() || undefined : undefined

    try {
      await aria2Service.verifyConnection(url, secret)
      res.json({
        success: true,
        message: 'Aria2 répond correctement'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion Aria2 impossible'
      Logger.debug(`Vérification Aria2 échouée: ${message}`)
      return res.status(400).json({
        success: false,
        message
      })
    }
  } catch (error: unknown) {
    Logger.error(`Erreur lors de la vérification Aria2: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la vérification Aria2', 500))
  }
}

/**
 * Update authenticated user password
 * @param {Request} req - Express request object with authenticated user, currentPassword, and newPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
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

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la modification du mot de passe: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la modification du mot de passe', 500))
  }
}

/**
 * Delete authenticated user account and all associated data
 * @param {Request} req - Express request object with authenticated user and password confirmation
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
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

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la suppression du compte: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la suppression du compte', 500))
  }
}