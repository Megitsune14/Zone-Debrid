import { Router } from 'express'
import { setMasterPassword, authenticateMasterPassword, getMetrics } from '@/controllers/metricsController'
import { auth } from '@/middleware/auth'

const router = Router()

// Routes protégées par authentification normale
router.use(auth)

/**
 * Définir le mot de passe maître pour l'utilisateur Megitsune
 */
router.post('/set-master-password', setMasterPassword)

/**
 * Authentifier avec le mot de passe maître pour accéder aux métriques
 */
router.post('/authenticate-master', authenticateMasterPassword)

/**
 * Obtenir les métriques de l'application
 */
router.get('/', getMetrics)

export default router
