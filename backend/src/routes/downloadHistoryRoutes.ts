import express from 'express'
import { auth } from '@/middleware/auth'
import * as downloadHistoryController from '@/controllers/downloadHistoryController'

const router = express.Router()

// Routes protégées par authentification
router.use(auth)

/**
 * Obtenir l'historique des téléchargements de l'utilisateur
 */
router.get('/', downloadHistoryController.getUserDownloadHistory)

/**
 * Créer un nouvel enregistrement d'historique de téléchargement
 */
router.post('/', downloadHistoryController.createDownloadHistory)

/**
 * Mettre à jour un enregistrement d'historique de téléchargement
 */
router.put('/:downloadId', downloadHistoryController.updateDownloadHistory)

/**
 * Effacer l'historique des téléchargements de l'utilisateur
 */
router.delete('/clear', downloadHistoryController.clearUserDownloadHistory)

/**
 * Marquer tous les téléchargements de l'utilisateur comme "cleared"
 */
router.delete('/', downloadHistoryController.deleteUserDownloadHistory)

/**
 * Obtenir les statistiques des téléchargements de l'utilisateur
 */
router.get('/stats', downloadHistoryController.getUserDownloadStats)

export default router
