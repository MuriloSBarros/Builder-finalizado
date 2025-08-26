import { Router } from 'express';
import { receivablesController } from '../controllers/receivablesController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

router.get('/dashboard', authenticateToken, tenantMiddleware, receivablesController.getDashboard);
router.get('/invoices', authenticateToken, tenantMiddleware, receivablesController.getInvoices);
router.post('/invoices', authenticateToken, tenantMiddleware, receivablesController.createInvoice);
router.put('/invoices/:id', authenticateToken, tenantMiddleware, receivablesController.updateInvoice);
router.delete('/invoices/:id', authenticateToken, tenantMiddleware, receivablesController.deleteInvoice);

export { router as receivablesRoutes };