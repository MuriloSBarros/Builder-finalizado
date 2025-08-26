import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

// Métricas básicas (todos os tipos de conta)
router.get('/metrics', 
  authenticateToken, 
  tenantMiddleware, 
  dashboardController.getMetrics
);

// Atividades recentes (todos os tipos de conta)
router.get('/activities', 
  authenticateToken, 
  tenantMiddleware, 
  dashboardController.getRecentActivities
);

export { router as dashboardRoutes };