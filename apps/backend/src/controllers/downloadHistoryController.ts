import { Request, Response } from 'express'
import downloadHistoryService from '@/services/downloadHistoryService'
import Logger from '@/base/Logger'

/**
 * Get user's download history
 * @param {Request} req - Express request object with authenticated user and query parameters
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with download history or error message
 */
const getUserDownloadHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id
        const { limit = 50, skip = 0, status } = req.query

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        const downloadHistory = await downloadHistoryService.getUserDownloadHistory(
            userId,
            parseInt(limit as string),
            parseInt(skip as string),
            status as string
        )

        res.json({
            success: true,
            data: downloadHistory
        })

    } catch (error: any) {
        Logger.error(`Error getting download history: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

/**
 * Create a new download history record
 * @param {Request} req - Express request object with authenticated user and download data
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with created download history or error message
 */
const createDownloadHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id
        const { title, type, language, quality, season, episodes, downloadUrl } = req.body

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        if (!title || !type) {
            return res.status(400).json({
                success: false,
                message: 'title et type sont requis'
            })
        }

        const downloadHistory = await downloadHistoryService.createDownloadHistory({
            userId,
            title,
            type,
            language,
            quality,
            season,
            episodes,
            downloadUrl
        })

        res.status(201).json({
            success: true,
            data: downloadHistory
        })

    } catch (error: any) {
        Logger.error(`Error creating download history: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'historique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

/**
 * Update a download history record
 * @param {Request} req - Express request object with authenticated user, downloadId, and update data
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with updated download history or error message
 */
const updateDownloadHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id
        const { downloadId } = req.params
        const updateData = req.body

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        const downloadHistory = await downloadHistoryService.updateDownloadHistory(
            downloadId,
            userId,
            updateData
        )

        if (!downloadHistory) {
            return res.status(404).json({
                success: false,
                message: 'Enregistrement d\'historique non trouvé'
            })
        }

        res.json({
            success: true,
            data: downloadHistory
        })

    } catch (error: any) {
        Logger.error(`Error updating download history: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'historique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

/**
 * Clear user's download history (mark as cleared)
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with cleared count or error message
 */
const clearUserDownloadHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        const clearedCount = await downloadHistoryService.clearUserDownloadHistory(userId)

        res.json({
            success: true,
            message: `${clearedCount} téléchargements marqués comme effacés`,
            data: { clearedCount }
        })

    } catch (error: any) {
        Logger.error(`Error clearing download history: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'effacement de l\'historique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

/**
 * Delete user's completed download history (mark as cleared)
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with deleted count or error message
 */
const deleteUserDownloadHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        const clearedCount = await downloadHistoryService.deleteUserDownloadHistory(userId)

        res.json({
            success: true,
            message: `${clearedCount} téléchargements terminés marqués comme effacés`,
            data: { clearedCount }
        })

    } catch (error: any) {
        Logger.error(`Error clearing download history: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'effacement de l\'historique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

/**
 * Get user's download statistics
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with download statistics or error message
 */
const getUserDownloadStats = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            })
        }

        const stats = await downloadHistoryService.getUserDownloadStats(userId)

        res.json({
            success: true,
            data: stats
        })

    } catch (error: any) {
        Logger.error(`Error getting download stats: ${error}`)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Export individual functions to match the pattern used in other controllers
export {
  getUserDownloadHistory,
  createDownloadHistory,
  updateDownloadHistory,
  clearUserDownloadHistory,
  deleteUserDownloadHistory,
  getUserDownloadStats
}
