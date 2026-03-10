import { Router } from 'express'
import { getMaintenancePublic } from '@/controllers/maintenanceController'

const router = Router()

router.get('/', getMaintenancePublic)

export default router

