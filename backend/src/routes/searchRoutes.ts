import { Router } from 'express';
import searchController from '@/controllers/searchController';
import { auth } from '@/middleware/auth';

const router = Router();

// Route pour effectuer une recherche complète (films, séries, mangas) - Protégée par authentification
router.get('/search', auth, searchController.searchAll);

// Route de santé pour vérifier que le service fonctionne
router.get('/health', searchController.healthCheck);

// Route pour obtenir le statut du site Zone Téléchargement - Protégée par authentification
router.get('/site-status', auth, searchController.getSiteStatus);

export default router;
