import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class NotificationsController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { type, category, read } = req.query;

      let options: any = {
        eq: { user_id: req.user.userId },
        order: { column: 'created_at', ascending: false },
        limit: 50
      };

      // Apply filters
      if (type && type !== 'all') {
        options.eq.type = type;
      }

      if (category && category !== 'all') {
        options.eq.category = category;
      }

      if (read !== undefined && read !== 'all') {
        options.eq.read = read === 'true';
      }

      const { rows: notifications } = await tenantDb.query('notifications', options);

      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const notification = await db.update('notifications', id, {
        read: true,
      });

      res.json(notification);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      // For Supabase, we need to update each notification individually
      const tenantDb = req.db;
      
      const { rows: notifications } = await tenantDb.query('notifications', {
        eq: { user_id: req.user.userId, read: false }
      });

      for (const notification of notifications) {
        await db.update('notifications', notification.id, { read: true });
      }

      res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      await db.delete('notifications', id);
      res.json({ message: 'Notificação removida com sucesso' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Erro ao remover notificação' });
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: notifications } = await tenantDb.query('notifications', {
        eq: { user_id: req.user.userId, read: false }
      });

      res.json({ unreadCount: notifications.length });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Erro ao buscar contagem' });
    }
  }
}

export const notificationsController = new NotificationsController();