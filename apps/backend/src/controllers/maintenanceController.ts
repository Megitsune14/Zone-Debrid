import { Request, Response, NextFunction } from 'express'
import AppConfig from '@/models/AppConfig'
import Logger from '@/base/Logger'
import { AppError } from '@/middleware/errorHandler'

export const getMaintenancePublic = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await AppConfig.findOne().lean()
    res.json({
      maintenanceEnabled: config?.maintenanceEnabled ?? false,
      maintenanceMessage: config?.maintenanceMessage ?? 'Le site est actuellement en maintenance. Merci de revenir un peu plus tard.'
    })
  } catch (error: unknown) {
    Logger.error(`maintenance getMaintenancePublic: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération de la configuration maintenance', 500))
  }
}

export const getMaintenanceAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await AppConfig.findOne().lean()
    res.json({
      success: true,
      data: {
        maintenanceEnabled: config?.maintenanceEnabled ?? false,
        maintenanceMessage: config?.maintenanceMessage ?? 'Le site est actuellement en maintenance. Merci de revenir un peu plus tard.'
      }
    })
  } catch (error: unknown) {
    Logger.error(`maintenance getMaintenanceAdmin: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération de la configuration maintenance', 500))
  }
}

export const updateMaintenanceAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maintenanceEnabled, maintenanceMessage } = req.body as {
      maintenanceEnabled?: unknown
      maintenanceMessage?: unknown
    }

    if (typeof maintenanceEnabled !== 'boolean' && typeof maintenanceEnabled !== 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'maintenanceEnabled doit être un booléen'
      })
    }

    if (typeof maintenanceMessage !== 'string' && typeof maintenanceMessage !== 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'maintenanceMessage doit être une chaîne de caractères'
      })
    }

    const update: Record<string, unknown> = {}
    if (typeof maintenanceEnabled === 'boolean') {
      update.maintenanceEnabled = maintenanceEnabled
    }
    if (typeof maintenanceMessage === 'string') {
      update.maintenanceMessage = maintenanceMessage
    }

    const config = await AppConfig.findOneAndUpdate(
      {},
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    res.json({
      success: true,
      data: {
        maintenanceEnabled: config?.maintenanceEnabled ?? false,
        maintenanceMessage: config?.maintenanceMessage ?? 'Le site est actuellement en maintenance. Merci de revenir un peu plus tard.'
      }
    })
  } catch (error: unknown) {
    Logger.error(`maintenance updateMaintenanceAdmin: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la mise à jour de la configuration maintenance', 500))
  }
}

