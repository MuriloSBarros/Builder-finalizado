import { Router } from 'express';
import { notificationsController } from '../controllers/notificationsController';
import { authenticateToken, tenantMiddleware } from '../config/auth';

const router = Router();

router.get('/', authenticateToken, tenantMiddleware, notificationsController.getNotifications);
router.get('/unread-count', authenticateToken, tenantMiddleware, notificationsController.getUnreadCount);
router.put('/:id/read', authenticateToken, tenantMiddleware, notificationsController.markAsRead);
router.put('/mark-all-read', authenticateToken, tenantMiddleware, notificationsController.markAllAsRead);
router.delete('/:id', authenticateToken, tenantMiddleware, notificationsController.deleteNotification);

export { router as notificationsRoutes };