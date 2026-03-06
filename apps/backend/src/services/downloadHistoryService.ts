import DownloadHistory, { IDownloadHistory, IDownloadHistoryLean, IDownloadHistoryFile } from '@/models/DownloadHistory'
import Logger from '@/base/Logger'

interface CreateDownloadHistoryData {
  userId: string
  title: string
  type: 'films' | 'series' | 'mangas'
  language?: string
  quality?: string
  season?: string
  episodes?: string[]
  downloadUrl?: string
  files?: IDownloadHistoryFile[]
}

interface UpdateDownloadHistoryData {
  status?: 'downloading' | 'completed' | 'error' | 'cancelled' | 'paused'
  cleared?: boolean
  endTime?: Date
  errorMessage?: string
  zipFilename?: string
  fileSize?: number
}

/**
 * Créer un nouvel enregistrement d'historique de téléchargement
 */
const createDownloadHistory = async (data: CreateDownloadHistoryData): Promise<IDownloadHistory> => {
  try {
    const downloadHistory = new DownloadHistory({
      userId: data.userId,
      title: data.title,
      type: data.type,
      language: data.language,
      quality: data.quality,
      season: data.season,
      episodes: data.episodes,
      downloadUrl: data.downloadUrl,
      files: data.files,
      status: 'downloading',
      startTime: new Date()
    })

    await downloadHistory.save()
    Logger.info(`Download history created for user ${data.userId}: ${data.title}`)
    
    return downloadHistory
  } catch (error) {
    Logger.error(`Error creating download history: ${error}`)
    throw error
  }
}

/**
 * Mettre à jour un enregistrement d'historique de téléchargement
 */
const updateDownloadHistory = async (
  downloadId: string, 
  userId: string, 
  data: UpdateDownloadHistoryData
): Promise<IDownloadHistory | null> => {
  try {
    const downloadHistory = await DownloadHistory.findOneAndUpdate(
      { _id: downloadId, userId },
      { 
        ...data,
        updatedAt: new Date()
      },
      { returnDocument: 'after' }
    )

    if (downloadHistory) {
      Logger.info(`Download history updated for user ${userId}: ${downloadHistory.title} - ${data.status}`)
    }

    return downloadHistory
  } catch (error) {
    Logger.error(`Error updating download history: ${error}`)
    throw error
  }
}

/**
 * Obtenir un enregistrement d'historique par ID et utilisateur
 */
const getDownloadHistoryById = async (
  downloadId: string,
  userId: string
): Promise<IDownloadHistory | null> => {
  return DownloadHistory.findOne({ _id: downloadId, userId }).exec()
}

/**
 * Obtenir l'historique des téléchargements d'un utilisateur
 */
const getUserDownloadHistory = async (
  userId: string, 
  limit: number = 50, 
  skip: number = 0,
  status?: string,
  includeCleared: boolean = false
): Promise<IDownloadHistoryLean[]> => {
  try {
    const query: any = { userId }
    
    if (status) {
      query.status = status
    }

    // Par défaut, exclure les éléments marqués comme cleared
    if (!includeCleared) {
      query.cleared = { $ne: true }
    }

    const downloadHistory = await DownloadHistory
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    Logger.debug(`Retrieved ${downloadHistory.length} download history records for user ${userId}`)
    
    return downloadHistory as unknown as IDownloadHistoryLean[]
  } catch (error) {
    Logger.error(`Error getting user download history: ${error}`)
    throw error
  }
}

/**
 * Marquer tous les téléchargements terminés d'un utilisateur comme "cleared"
 */
const clearUserDownloadHistory = async (userId: string): Promise<number> => {
  try {
    const result = await DownloadHistory.updateMany(
      { 
        userId, 
        status: { $in: ['completed', 'error', 'cancelled'] },
        cleared: { $ne: true }
      },
      { 
        cleared: true,
        updatedAt: new Date()
      }
    )

    Logger.info(`Cleared ${result.modifiedCount} download history records for user ${userId}`)
    
    return result.modifiedCount
  } catch (error) {
    Logger.error(`Error clearing user download history: ${error}`)
    throw error
  }
}

/**
 * Marquer tous les téléchargements terminés d'un utilisateur comme "cleared" (même comportement que clearUserDownloadHistory)
 */
const deleteUserDownloadHistory = async (userId: string): Promise<number> => {
  try {
    const result = await DownloadHistory.updateMany(
      { 
        userId, 
        status: { $in: ['completed', 'error', 'cancelled'] },
        cleared: { $ne: true }
      },
      { 
        cleared: true,
        updatedAt: new Date()
      }
    )

    Logger.info(`Marked ${result.modifiedCount} completed download history records as cleared for user ${userId}`)
    
    return result.modifiedCount
  } catch (error) {
    Logger.error(`Error marking download history as cleared: ${error}`)
    throw error
  }
}

/**
 * Obtenir les statistiques des téléchargements d'un utilisateur
 */
const getUserDownloadStats = async (userId: string): Promise<{
  total: number
  completed: number
  error: number
  cancelled: number
  cleared: number
  totalSize: number
}> => {
  try {
    // Statistiques par statut (excluant les cleared)
    const statusStats = await DownloadHistory.aggregate([
      { $match: { userId, cleared: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSize: { $sum: { $ifNull: ['$fileSize', 0] } }
        }
      }
    ])

    // Compter les éléments cleared
    const clearedCount = await DownloadHistory.countDocuments({ 
      userId, 
      cleared: true 
    })

    const result = {
      total: 0,
      completed: 0,
      error: 0,
      cancelled: 0,
      cleared: clearedCount,
      totalSize: 0
    }

    statusStats.forEach(stat => {
      result.total += stat.count
      result.totalSize += stat.totalSize
      
      switch (stat._id) {
        case 'completed':
          result.completed = stat.count
          break
        case 'error':
          result.error = stat.count
          break
        case 'cancelled':
          result.cancelled = stat.count
          break
      }
    })

    Logger.debug(`Retrieved download stats for user ${userId}: ${JSON.stringify(result)}`)
    
    return result
  } catch (error) {
    Logger.error(`Error getting user download stats: ${error}`)
    throw error
  }
}

const DownloadHistoryService = {
  createDownloadHistory,
  updateDownloadHistory,
  getDownloadHistoryById,
  getUserDownloadHistory,
  clearUserDownloadHistory,
  deleteUserDownloadHistory,
  getUserDownloadStats
};

export default DownloadHistoryService
