import { Router } from 'express';
import { crmController } from '../controllers/crmController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

// Clientes
router.get('/clients', authenticateToken, tenantMiddleware, crmController.getClients);
router.post('/clients', authenticateToken, tenantMiddleware, crmController.createClient);
router.put('/clients/:id', authenticateToken, tenantMiddleware, crmController.updateClient);
router.delete('/clients/:id', authenticateToken, tenantMiddleware, crmController.deleteClient);

// Deals/Pipeline
router.get('/deals', authenticateToken, tenantMiddleware, crmController.getDeals);
router.post('/deals', authenticateToken, tenantMiddleware, crmController.createDeal);
router.put('/deals/:id', authenticateToken, tenantMiddleware, crmController.updateDeal);
router.delete('/deals/:id', authenticateToken, tenantMiddleware, crmController.deleteDeal);

export { router as crmRoutes };