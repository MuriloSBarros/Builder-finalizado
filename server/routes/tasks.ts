import { Router } from 'express';
import { tasksController } from '../controllers/tasksController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

router.get('/', authenticateToken, tenantMiddleware, tasksController.getTasks);
router.post('/', authenticateToken, tenantMiddleware, tasksController.createTask);
router.put('/:id', authenticateToken, tenantMiddleware, tasksController.updateTask);
router.delete('/:id', authenticateToken, tenantMiddleware, tasksController.deleteTask);
router.get('/stats', authenticateToken, tenantMiddleware, tasksController.getTaskStats);
router.put('/:taskId/subtasks/:subtaskId/toggle', authenticateToken, tenantMiddleware, tasksController.toggleSubtask);

export { router as tasksRoutes };