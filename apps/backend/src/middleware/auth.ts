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
  } catch (error: unknown) {
    Logger.error(`Erreur d'authentification: ${error instanceof Error ? error.message : String(error)}`)
    next(error)
  }
}

/** Exige un utilisateur authentifié avec rôle admin */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    })
  }
  const u = req.user as any
  const isAdmin = u.role === 'admin'
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    })
  }
  next()
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
  } catch {
    next()
  }
}
