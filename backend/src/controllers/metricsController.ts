import { Request, Response } from 'express'
import User from '@/models/User'
import DownloadHistory from '@/models/DownloadHistory'
import ZTUrl from '@/models/ZTUrl'
import Logger from '@/base/Logger'

/**
 * Set master password for Megitsune user
 * @param {Request} req - Express request object with authenticated user and masterPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const setMasterPassword = async (req: Request, res: Response) => {
  try {
    const { masterPassword, currentMasterPassword } = req.body
    const user = req.user

    // Vérifier que l'utilisateur est Megitsune
    if (user.username !== 'megitsune') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul l\'utilisateur Megitsune peut définir un mot de passe maître.'
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
    const megitsuneUser = await User.findById(user._id)
    if (!megitsuneUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Vérifier si un mot de passe maître existe déjà
    if (megitsuneUser.masterPassword) {
      // Si un mot de passe maître existe, vérifier l'ancien
      if (!currentMasterPassword) {
        return res.status(400).json({
          success: false,
          message: 'L\'ancien mot de passe maître est requis pour le modifier'
        })
      }

      // Vérifier l'ancien mot de passe maître
      const isCurrentMasterPasswordValid = await megitsuneUser.compareMasterPassword(currentMasterPassword)
      if (!isCurrentMasterPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'L\'ancien mot de passe maître est incorrect'
        })
      }
    }

    // Mettre à jour le mot de passe maître
    megitsuneUser.masterPassword = masterPassword
    await megitsuneUser.save()

    Logger.success(`Mot de passe maître ${megitsuneUser.masterPassword ? 'modifié' : 'défini'} pour l'utilisateur: ${user.username}`)

    res.json({
      success: true,
      message: megitsuneUser.masterPassword ? 'Mot de passe maître modifié avec succès' : 'Mot de passe maître défini avec succès'
    })

  } catch (error: any) {
    Logger.error(`Erreur lors de la définition du mot de passe maître: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la définition du mot de passe maître'
    })
  }
}

/**
 * Authenticate with master password for metrics access
 * @param {Request} req - Express request object with authenticated user and masterPassword
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with success status or error message
 */
export const authenticateMasterPassword = async (req: Request, res: Response) => {
  try {
    const { masterPassword } = req.body
    const user = req.user

    // Vérifier que l'utilisateur est Megitsune
    if (user.username !== 'megitsune') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul l\'utilisateur Megitsune peut accéder aux métriques.'
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
    const megitsuneUser = await User.findById(user._id)
    if (!megitsuneUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Vérifier si le mot de passe maître est défini
    if (!megitsuneUser.masterPassword) {
      return res.status(400).json({
        success: false,
        message: 'Aucun mot de passe maître défini. Veuillez d\'abord définir un mot de passe maître.'
      })
    }

    // Vérifier le mot de passe maître
    const isMasterPasswordValid = await megitsuneUser.compareMasterPassword(masterPassword)
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

  } catch (error: any) {
    Logger.error(`Erreur lors de l'authentification maître: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification maître'
    })
  }
}

/**
 * Get application metrics
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with metrics data or error message
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const user = req.user

    // Vérifier que l'utilisateur est Megitsune
    if (user.username !== 'megitsune') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seul l\'utilisateur Megitsune peut accéder aux métriques.'
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

  } catch (error: any) {
    Logger.error(`Erreur lors de la récupération des métriques: ${error.message}`)
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques'
    })
  }
}

export default {
  setMasterPassword,
  authenticateMasterPassword,
  getMetrics
}
