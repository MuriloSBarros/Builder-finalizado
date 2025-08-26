import { Router } from 'express';
import { cashFlowController } from '../controllers/cashFlowController';
import { authenticateToken, tenantMiddleware, requireAccountType } from '../config/auth';

const router = Router();

// Apenas Conta Composta e Gerencial têm acesso ao Fluxo de Caixa
router.get('/transactions', 
  authenticateToken, 
  tenantMiddleware, 
  requireAccountType(['composta', 'gerencial']), 
  cashFlowController.getTransactions
);

router.post('/transactions', 
  authenticateToken, 
  tenantMiddleware, 
  requireAccountType(['composta', 'gerencial']), 
  cashFlowController.createTransaction
);

router.put('/transactions/:id', 
  authenticateToken, 
  tenantMiddleware, 
  requireAccountType(['composta', 'gerencial']), 
  cashFlowController.updateTransaction
);

router.delete('/transactions/:id', 
  authenticateToken, 
  tenantMiddleware, 
  requireAccountType(['composta', 'gerencial']), 
  cashFlowController.deleteTransaction
);

router.get('/export/csv', 
  authenticateToken, 
  tenantMiddleware, 
  requireAccountType(['composta', 'gerencial']), 
  cashFlowController.exportCSV
);

export { router as cashFlowRoutes };