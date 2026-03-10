import { Router } from 'express'
import { auth } from '@/middleware/auth'
import { requireAdmin } from '@/middleware/auth'
import { listUsers, createUser, deleteUser, getDashboardSummary, updateUserRole } from '@/controllers/adminUsersController'
import { listSearches } from '@/controllers/adminSearchesController'
import { getMaintenanceAdmin, updateMaintenanceAdmin } from '@/controllers/maintenanceController'

const router = Router()

router.use(auth)
router.use(requireAdmin)

router.get('/dashboard-summary', getDashboardSummary)
router.get('/maintenance', getMaintenanceAdmin)
router.put('/maintenance', updateMaintenanceAdmin)
router.get('/users', listUsers)
router.post('/users', createUser)
router.patch('/users/:id', updateUserRole)
router.delete('/users/:id', deleteUser)
router.get('/searches', listSearches)

export default router
