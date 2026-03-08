import { Request, Response, NextFunction } from 'express'
import SearchHistory from '@/models/SearchHistory'
import Logger from '@/base/Logger'
import { AppError } from '@/middleware/errorHandler'

/** Liste paginée des recherches (admin) - filtres: search (query), type, userId, dateFrom, dateTo */
export const listSearches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20))
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined
    const type = typeof req.query.type === 'string' && req.query.type.trim() ? req.query.type.trim() : undefined
    const userId = typeof req.query.userId === 'string' && req.query.userId.trim() ? req.query.userId.trim() : undefined
    const dateFrom = typeof req.query.dateFrom === 'string' && req.query.dateFrom.trim() ? req.query.dateFrom.trim() : undefined
    const dateTo = typeof req.query.dateTo === 'string' && req.query.dateTo.trim() ? req.query.dateTo.trim() : undefined

    const match: Record<string, unknown> = {}
    if (search) match.query = { $regex: search, $options: 'i' }
    if (type && ['films', 'series', 'mangas'].includes(type)) match.type = type
    if (userId) match.userId = userId
    if (dateFrom || dateTo) {
      match.createdAt = {}
      if (dateFrom) (match.createdAt as Record<string, Date>).$gte = new Date(dateFrom)
      if (dateTo) (match.createdAt as Record<string, Date>).$lte = new Date(dateTo)
    }

    const [items, total] = await Promise.all([
      SearchHistory.find(match)
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      SearchHistory.countDocuments(match)
    ])

    const data = items.map((doc: any) => ({
      id: doc._id.toString(),
      query: doc.query,
      type: doc.type ?? null,
      year: doc.year ?? null,
      username: doc.userId?.username ?? '—',
      userId: doc.userId?._id?.toString() ?? null,
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
    Logger.error(`admin listSearches: ${error instanceof Error ? error.message : error}`)
    next(error instanceof Error ? error : new AppError('Erreur lors de la récupération des recherches', 500))
  }
}
