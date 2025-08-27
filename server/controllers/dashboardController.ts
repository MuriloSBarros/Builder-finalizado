import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class DashboardController {
  async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const { accountType } = req.user;
      const tenantDb = req.db;

      // For Conta Simples, financial data is zeroed
      if (accountType === 'simples') {
        const { rows: clients } = await tenantDb.query('clients', {
          eq: { status: 'active' }
        });

        return res.json({
          revenue: { value: 0, change: 0, trend: 'up' },
          expenses: { value: 0, change: 0, trend: 'down' },
          balance: { value: 0, change: 0, trend: 'up' },
          clients: { 
            value: clients.length, 
            change: 0, 
            trend: 'up' 
          },
        });
      }

      // For Conta Composta and Gerencial, full data
      const { rows: transactions } = await tenantDb.query('cash_flow', {
        order: { column: 'date', ascending: false },
        limit: 100
      });

      const { rows: clients } = await tenantDb.query('clients', {
        eq: { status: 'active' }
      });

      // Calculate current month metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthTransactions = transactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });

      const revenue = currentMonthTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const expenses = currentMonthTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const balance = revenue - expenses;

      res.json({
        revenue: {
          value: revenue,
          change: 15, // Mock growth percentage
          trend: 'up',
        },
        expenses: {
          value: expenses,
          change: 8,
          trend: 'down',
        },
        balance: {
          value: balance,
          change: 22,
          trend: balance >= 0 ? 'up' : 'down',
        },
        clients: {
          value: clients.length,
          change: 12,
          trend: 'up',
        },
      });
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
  }

  async getRecentActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      // Get recent notifications as activities
      const { rows: activities } = await tenantDb.query('notifications', {
        order: { column: 'created_at', ascending: false },
        limit: 10
      });

      const formattedActivities = activities.map((activity: any) => ({
        type: activity.category,
        message: activity.message,
        time: activity.created_at,
        icon: this.getActivityIcon(activity.category),
        color: this.getActivityColor(activity.type),
      }));

      res.json(formattedActivities);
    } catch (error) {
      console.error('Recent activities error:', error);
      res.status(500).json({ error: 'Erro ao buscar atividades' });
    }
  }

  private getActivityIcon(category: string): string {
    const icons: { [key: string]: string } = {
      client: 'Users',
      project: 'FileText',
      task: 'Clock',
      billing: 'DollarSign',
      system: 'Settings',
    };
    return icons[category] || 'Bell';
  }

  private getActivityColor(type: string): string {
    const colors: { [key: string]: string } = {
      info: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-orange-600',
      error: 'text-red-600',
    };
    return colors[type] || 'text-gray-600';
  }
}

export const dashboardController = new DashboardController();