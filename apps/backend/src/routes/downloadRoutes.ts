import express from 'express';
import {
  checkDownloadAvailability,
  downloadProxy,
  downloadZip,
  cancelDownloadCheck,
  getSignedProxy,
  getSignedProxyZip,
  streamProxy,
  streamZip,
  getSessions,
  cancelSession,
  sendToAria2
} from '@/controllers/downloadController';
import { auth } from '@/middleware/auth';

const router = express.Router();

// Routes de stream signé (sans auth : validation par signature)
router.get('/stream/zip/:sessionId', streamZip);
router.get('/stream/:sessionId', streamProxy);

// Routes protégées par authentification
router.use(auth);

// Vérifier la disponibilité des liens
router.post('/check', checkDownloadAvailability);

// Annuler une vérification de disponibilité
router.post('/cancel', cancelDownloadCheck);

// Obtenir une URL signée pour téléchargement natif (fichier unique)
router.get('/signed-proxy', getSignedProxy);

// Obtenir une URL signée pour téléchargement ZIP
router.post('/signed-proxy/zip', getSignedProxyZip);

// Sessions actives (pour le panel)
router.get('/sessions', getSessions);
router.post('/sessions/:sessionId/cancel', cancelSession);

// Envoi vers Aria2 (NAS)
router.post('/aria2', sendToAria2);

// Proxy de téléchargement legacy (HTTP Range Request, 206)
router.get('/proxy', downloadProxy);

// ZIP streamé (plusieurs fichiers)
router.post('/zip', downloadZip);

export default router;
