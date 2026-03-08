import { Request, Response, NextFunction } from 'express'
import User from '@/models/User'
import DownloadHistory from '@/models/DownloadHistory'
import ZTUrl from '@/models/ZTUrl'
import Logger from '@/base/Logger'
import { AppError } from '@/middleware/errorHandler'

/**
 * Set master password for admin user
 * @param {Request} req - Express request object with authenticated user and masterPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const setMasterPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { masterPassword, currentMasterPassword } = req.body
    const user = req.user as any

    // Réservé aux utilisateurs avec le rôle admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les administrateurs peuvent définir un mot de passe maître.'
      })
    }

    // Validation des données
    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe maître est requis'
      })
    }

    if (masterPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe maître doit contenir au moins 8 caractères'
      })
    }

    // Récupérer l'utilisateur complet pour la mise à jour
    const targetUser = await User.findById(user._id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Vérifier si un mot de passe maître existe déjà
    if (targetUser.masterPassword) {
      // Si un mot de passe maître existe, vérifier l'ancien
      if (!currentMasterPassword) {
        return res.status(400).json({
          success: false,
          message: 'L\'ancien mot de passe maître est requis pour le modifier'
        })
      }

      // Vérifier l'ancien mot de passe maître
      const isCurrentMasterPasswordValid = await targetUser.compareMasterPassword(currentMasterPassword)
      if (!isCurrentMasterPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'L\'ancien mot de passe maître est incorrect'
        })
      }
    }

    // Mettre à jour le mot de passe maître
    targetUser.masterPassword = masterPassword
    await targetUser.save()

    Logger.success(`Mot de passe maître ${targetUser.masterPassword ? 'modifié' : 'défini'} pour l'utilisateur: ${user.username}`)

    res.json({
      success: true,
      message: targetUser.masterPassword ? 'Mot de passe maître modifié avec succès' : 'Mot de passe maître défini avec succès'
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la définition du mot de passe maître: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la définition du mot de passe maître', 500, undefined, 'critical'))
  }
}

/**
 * Authenticate with master password for metrics access
 * @param {Request} req - Express request object with authenticated user and masterPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const authenticateMasterPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { masterPassword } = req.body
    const user = req.user as any

    // Réservé aux utilisateurs avec le rôle admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les administrateurs peuvent accéder aux métriques.'
      })
    }

    // Validation des données
    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe maître est requis'
      })
    }

    // Récupérer l'utilisateur complet pour la vérification
    const targetUser = await User.findById(user._id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Vérifier si le mot de passe maître est défini
    if (!targetUser.masterPassword) {
      return res.status(400).json({
        success: false,
        message: 'Aucun mot de passe maître défini. Veuillez d\'abord définir un mot de passe maître.'
      })
    }

    // Vérifier le mot de passe maître
    const isMasterPasswordValid = await targetUser.compareMasterPassword(masterPassword)
    if (!isMasterPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe maître incorrect'
      })
    }

    Logger.success(`Authentification maître réussie pour l'utilisateur: ${user.username}`)

    res.json({
      success: true,
      message: 'Authentification maître réussie'
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de l'authentification maître: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de l\'authentification maître', 500, undefined, 'critical'))
  }
}

/**
 * Get application metrics
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with metrics data or error message
 */
export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any

    // Vérifier que l'utilisateur a le rôle admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul un administrateur peut accéder aux métriques.'
      })
    }

    // Récupérer les métriques des utilisateurs
    const totalUsers = await User.countDocuments()
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 derniers jours
    })

    // Récupérer les métriques des téléchargements
    const totalDownloads = await DownloadHistory.countDocuments()
    const completedDownloads = await DownloadHistory.countDocuments({ status: 'completed' })
    const errorDownloads = await DownloadHistory.countDocuments({ status: 'error' })
    const cancelledDownloads = await DownloadHistory.countDocuments({ status: 'cancelled' })
    const clearedDownloads = await DownloadHistory.countDocuments({ cleared: true })

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const downloadsLast24h = await DownloadHistory.countDocuments({ createdAt: { $gte: oneDayAgo } })

    const volumeResult = await DownloadHistory.aggregate([
      { $match: { status: 'completed', fileSize: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } }
    ])
    const totalVolumeBytes = volumeResult[0]?.totalBytes ?? 0

    // Récupérer les téléchargements par type
    const downloadsByType = await DownloadHistory.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ])

    // Récupérer les téléchargements par jour (7 derniers jours)
    const downloadsByDay = await DownloadHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    // Récupérer les utilisateurs les plus actifs
    const mostActiveUsers = await DownloadHistory.aggregate([
      {
        $group: {
          _id: '$userId',
          downloadCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          downloadCount: 1
        }
      },
      {
        $sort: { downloadCount: -1 }
      },
      {
        $limit: 10
      }
    ])

    // Récupérer le statut de Zone Téléchargement
    const ztStatus = await ZTUrl.findOne()

    const metrics = {
      users: {
        total: totalUsers,
        recent: recentUsers
      },
      downloads: {
        total: totalDownloads,
        completed: completedDownloads,
        error: errorDownloads,
        cancelled: cancelledDownloads,
        cleared: clearedDownloads,
        last24h: downloadsLast24h,
        totalVolumeBytes,
        byType: downloadsByType,
        byDay: downloadsByDay
      },
      topUsers: mostActiveUsers,
      siteStatus: ztStatus ? {
        currentUrl: ztStatus.currentUrl,
        urlHistory: ztStatus.urlHistory,
        lastChecked: ztStatus.lastChecked,
        responseTime: ztStatus.responseTime,
        isHealthy: ztStatus.responseTime > 0 && ztStatus.responseTime < 10000
      } : null
    }

    Logger.info(`Métriques récupérées par l'utilisateur: ${user.username}`)

    res.json({
      success: true,
      data: metrics
    })

  } catch (error: unknown) {
    Logger.error(`Erreur lors de la récupération des métriques: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération des métriques', 500, undefined, 'critical'))
  }
}

/**
 * GET /api/metrics/downloads — Liste paginée de tous les téléchargements (tous utilisateurs)
 * Query: page, limit, sortBy, sortOrder, status, type, search
 * Tri par défaut: createdAt desc (plus récent en premier)
 */
export const getDownloadsList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any

    // Vérifier que l'utilisateur a le rôle admin
    if (user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul un administrateur peut accéder aux métriques.'
      })
    }

    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20))
    const sortBy = String(req.query.sortBy || 'createdAt')
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : undefined
    const type = typeof req.query.type === 'string' && req.query.type.trim() ? req.query.type.trim() : undefined
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined

    const match: Record<string, unknown> = {}
    if (status) match.status = status
    if (type) match.type = type
    if (search) {
      const usersMatching = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id').lean()
      const userIds = usersMatching.map((u: { _id: unknown }) => u._id)
      match.$or = [
        { title: { $regex: search, $options: 'i' } },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : [])
      ]
    }

    const sortField = ['createdAt', 'startTime', 'endTime', 'status', 'type', 'title'].includes(sortBy) ? sortBy : 'createdAt'

    const [items, total] = await Promise.all([
      DownloadHistory.find(match)
        .populate('userId', 'username')
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      DownloadHistory.countDocuments(match)
    ])

    const data = items.map((doc: any) => ({
      _id: doc._id,
      title: doc.title,
      type: doc.type,
      status: doc.status,
      startTime: doc.startTime,
      endTime: doc.endTime,
      fileSize: doc.fileSize,
      language: doc.language,
      quality: doc.quality,
      season: doc.season,
      errorMessage: doc.errorMessage,
      username: doc.userId?.username ?? '—',
      createdAt: doc.createdAt
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
    Logger.error(`Erreur getDownloadsList: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération des téléchargements', 500, undefined, 'critical'))
  }
}

export default {
  setMasterPassword,
  authenticateMasterPassword,
  getMetrics,
  getDownloadsList
}
