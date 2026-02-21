import { Router } from 'express'
import { reportClientError } from '@/controllers/clientErrorController'

const router = Router()

router.post('/', reportClientError)

export default router
