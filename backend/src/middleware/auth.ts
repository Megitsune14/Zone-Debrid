import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '@/models/User'
import Logger from '@/base/Logger'

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    req.user = user
    next()
  } catch (error: any) {
    Logger.error(`Erreur d'authentification: ${error.message}`)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      })
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification'
    })
  }
}

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await User.findById(decoded.userId).select('-password')
    
    if (user) {
      req.user = user
    }
    
    next()
  } catch (error) {
    // Pour l'authentification optionnelle, on continue même en cas d'erreur
    next()
  }
}
