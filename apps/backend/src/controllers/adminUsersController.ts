import { Request, Response, NextFunction } from 'express'
import User from '@/models/User'
import DownloadHistory from '@/models/DownloadHistory'
import Logger from '@/base/Logger'
import allDebridService from '@/services/allDebridService'
import { AppError } from '@/middleware/errorHandler'
import { sendServiceDownAlert } from '@/services/discordWebhookService'

/** Résumé pour la page d'accueil du dashboard admin (sans mot de passe maître) */
export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalDownloads, downloadsLast24h] = await Promise.all([
      User.countDocuments(),
      DownloadHistory.countDocuments(),
      DownloadHistory.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ])
    res.json({
      success: true,
      data: {
        usersTotal: totalUsers,
        downloadsTotal: totalDownloads,
        downloadsLast24h
      }
    })
  } catch (error: unknown) {
    Logger.error(`admin getDashboardSummary: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors du résumé', 500))
  }
}

/** Liste paginée des utilisateurs (champs publics uniquement, pas de clé API) */
export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20))
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined

    const match: Record<string, unknown> = {}
    if (search) {
      match.username = { $regex: search, $options: 'i' }
    }

    const [users, total] = await Promise.all([
      User.find(match)
        .select('username createdAt updatedAt role aria2Enabled')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments(match)
    ])

    const data = users.map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      role: u.role || 'user',
      aria2Enabled: u.aria2Enabled ?? false,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }))

    res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: unknown) {
    Logger.error(`admin listUsers: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération des utilisateurs', 500))
  }
}

/** Créer un utilisateur (admin uniquement). Même logique que register (validation AllDebrid). */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
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
      aria2PathAnimes,
      aria2PathSeriesSeason
    } = req.body

    if (!username || !password || !allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (username, password, allDebridApiKey)'
      })
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà pris'
      })
    }

    const allDebridAvailable = await allDebridService.isAvailable()
    if (!allDebridAvailable) {
      sendServiceDownAlert('AllDebrid').catch(() => {})
      return res.status(503).json({
        success: false,
        message: 'Le service AllDebrid est temporairement indisponible.',
        code: 'ALLDEBRID_UNAVAILABLE'
      })
    }

    try {
      const isApiKeyValid = await allDebridService.validateApiKey(allDebridApiKey)
      if (!isApiKeyValid) {
        return res.status(400).json({
          success: false,
          message: 'La clé API AllDebrid n\'est pas valide.',
          code: 'INVALID_API_KEY'
        })
      }
    } catch (err) {
      Logger.error(`Erreur réseau validation AllDebrid: ${err instanceof Error ? err.message : err}`)
      return res.status(502).json({
        success: false,
        message: 'Erreur de connexion temporaire.',
        code: 'NETWORK_ERROR'
      })
    }

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
      aria2PathAnimes: aria2PathAnimes || undefined,
      aria2PathSeriesSeason: aria2PathSeriesSeason || undefined
    })

    await user.save()

    Logger.success(`Admin: utilisateur créé: ${username}`)

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt
      }
    })
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: Record<string, { message: string }>; message?: string }
    Logger.error(`admin createUser: ${err.message ?? error}`)
    if (err.name === 'ValidationError' && err.errors) {
      const errors = Object.values(err.errors).map((e) => e.message)
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      })
    }
    next(error instanceof Error ? error : new AppError('Erreur lors de la création de l\'utilisateur', 500))
  }
}

/** Supprimer un utilisateur par ID (admin uniquement). Un admin ne peut pas se supprimer lui-même. */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const currentUser = req.user as any

    if (id === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    await User.findByIdAndDelete(id)
    Logger.success(`Admin: utilisateur supprimé: ${user.username}`)

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    })
  } catch (error: unknown) {
    Logger.error(`admin deleteUser: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la suppression', 500))
  }
}

/** Mettre à jour le rôle d'un utilisateur (admin uniquement). */
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { role } = req.body as { role?: string }

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Le rôle doit être "user" ou "admin"'
      })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    (user as any).role = role
    await user.save()

    Logger.success(`Admin: rôle de ${user.username} mis à jour → ${role}`)

    res.json({
      success: true,
      message: 'Rôle mis à jour',
      data: { id: user._id.toString(), username: user.username, role: (user as any).role }
    })
  } catch (error: unknown) {
    Logger.error(`admin updateUserRole: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la mise à jour du rôle', 500))
  }
}
