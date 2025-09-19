import express from 'express';
import { checkDownloadAvailability, downloadFile, cancelDownloadCheck } from '@/controllers/downloadController';
import { auth } from '@/middleware/auth';

const router = express.Router();

// Routes protégées par authentification
router.use(auth);

// Vérifier la disponibilité des liens
router.post('/check', checkDownloadAvailability);

// Annuler une vérification de disponibilité
router.post('/cancel', cancelDownloadCheck);

// Proxy pour télécharger un fichier
router.get('/proxy', downloadFile);

export default router;
