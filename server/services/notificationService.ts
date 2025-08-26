import { db } from '../config/database';

export interface NotificationData {
  userId?: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  category: string;
  details?: string;
  actionData?: any;
  createdBy: string;
}

export class NotificationService {
  async createNotification(data: NotificationData) {
    try {
      const tenantDb = db.getTenantConnection(data.tenantId);
      
      const result = await tenantDb.query(`
        INSERT INTO \${schema}.notifications (
          user_id, type, title, message, category, details, action_data, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        data.userId,
        data.type,
        data.title,
        data.message,
        data.category,
        data.details,
        JSON.stringify(data.actionData),
        data.createdBy
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendToTenant(data: Omit<NotificationData, 'userId'>) {
    try {
      const tenantDb = db.getTenantConnection(data.tenantId);
      
      // Buscar todos os usuários do tenant
      const users = await tenantDb.query(`
        SELECT id FROM \${schema}.users WHERE is_active = true
      `);

      // Criar notificação para cada usuário
      const notifications = await Promise.all(
        users.rows.map((user: any) => 
          this.createNotification({
            ...data,
            userId: user.id
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error sending notification to tenant:', error);
      throw error;
    }
  }

  async getNotifications(userId: string, tenantId: string, filters: any = {}) {
    try {
      const tenantDb = db.getTenantConnection(tenantId);
      
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;

      if (filters.type) {
        paramCount++;
        whereClause += ` AND type = $${paramCount}`;
        params.push(filters.type);
      }

      if (filters.category) {
        paramCount++;
        whereClause += ` AND category = $${paramCount}`;
        params.push(filters.category);
      }

      if (filters.read !== undefined) {
        paramCount++;
        whereClause += ` AND read = $${paramCount}`;
        params.push(filters.read);
      }

      const result = await tenantDb.query(`
        SELECT * FROM \${schema}.notifications 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 50
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, tenantId: string) {
    try {
      const tenantDb = db.getTenantConnection(tenantId);
      
      const result = await tenantDb.query(`
        UPDATE \${schema}.notifications 
        SET read = true
        WHERE id = $1
        RETURNING *
      `, [notificationId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string, tenantId: string) {
    try {
      const tenantDb = db.getTenantConnection(tenantId);
      
      await tenantDb.query(`
        DELETE FROM \${schema}.notifications WHERE id = $1
      `, [notificationId]);

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();