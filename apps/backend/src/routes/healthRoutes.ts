import { Router } from 'express'
import { healthServices } from '@/controllers/healthController'

const router = Router()

router.get('/services', healthServices)

export default router
