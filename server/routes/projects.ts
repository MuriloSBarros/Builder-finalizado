import { Router } from 'express';
import { projectsController } from '../controllers/projectsController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

router.get('/', authenticateToken, tenantMiddleware, projectsController.getProjects);
router.post('/', authenticateToken, tenantMiddleware, projectsController.createProject);
router.put('/:id', authenticateToken, tenantMiddleware, projectsController.updateProject);
router.delete('/:id', authenticateToken, tenantMiddleware, projectsController.deleteProject);
router.get('/stats', authenticateToken, tenantMiddleware, projectsController.getProjectStats);

export { router as projectsRoutes };