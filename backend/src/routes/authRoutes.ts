import { Router } from 'express'
import { register, login, getProfile, updateProfile, updatePassword, validateApiKey, deleteAccount } from '@/controllers/authController'
import { auth } from '@/middleware/auth'

const router = Router()

// Routes publiques avec rate limiting
router.post('/register', register)
router.post('/login', login)
router.post('/validate-api-key', validateApiKey)

// Routes protégées
router.get('/profile', auth, getProfile)
router.put('/profile', auth, updateProfile)
router.put('/password', auth, updatePassword)
router.delete('/account', auth, deleteAccount)

export default router
