import { Router } from 'express';
import { publicationsController } from '../controllers/publicationsController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

// ISOLAMENTO POR USUÁRIO - cada usuário vê apenas suas publicações
router.get('/', authenticateToken, tenantMiddleware, publicationsController.getPublications);
router.get('/:id', authenticateToken, tenantMiddleware, publicationsController.getPublicationById);
router.put('/:id/status', authenticateToken, tenantMiddleware, publicationsController.updatePublicationStatus);
router.post('/load', authenticateToken, tenantMiddleware, publicationsController.loadPublications);
router.get('/search/processes', authenticateToken, tenantMiddleware, publicationsController.searchProcesses);

export { router as publicationsRoutes };