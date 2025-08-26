import { Router } from 'express';
import { billingController } from '../controllers/billingController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

router.get('/documents', authenticateToken, tenantMiddleware, billingController.getDocuments);
router.post('/documents', authenticateToken, tenantMiddleware, billingController.createDocument);
router.put('/documents/:id', authenticateToken, tenantMiddleware, billingController.updateDocument);
router.delete('/documents/:id', authenticateToken, tenantMiddleware, billingController.deleteDocument);
router.get('/stats', authenticateToken, tenantMiddleware, billingController.getBillingStats);

export { router as billingRoutes };