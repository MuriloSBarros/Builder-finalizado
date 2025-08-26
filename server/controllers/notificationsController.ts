import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { notificationService } from '../services/notificationService';

export class NotificationsController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const { type, category, read } = req.query;
      
      const filters: any = {};
      if (type && type !== 'all') filters.type = type;
      if (category && category !== 'all') filters.category = category;
      if (read !== undefined && read !== 'all') filters.read = read === 'true';

      const notifications = await notificationService.getNotifications(
        req.user.userId,
        req.tenantId,
        filters
      );

      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const notification = await notificationService.markAsRead(id, req.tenantId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      await tenantDb.query(`
        UPDATE \${schema}.notifications 
        SET read = true, updated_at = NOW()
        WHERE user_id = $1 AND read = false
      `, [req.user.userId]);

      res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      await notificationService.deleteNotification(id, req.tenantId);
      
      res.json({ message: 'Notificação removida com sucesso' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Erro ao remover notificação' });
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        SELECT COUNT(*) as unread_count
        FROM \${schema}.notifications 
        WHERE user_id = $1 AND read = false
      `, [req.user.userId]);

      res.json({ unreadCount: parseInt(result.rows[0].unread_count) });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Erro ao buscar contagem' });
    }
  }
}

export const notificationsController = new NotificationsController();