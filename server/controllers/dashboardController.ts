import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class DashboardController {
  async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const { accountType } = req.user;
      const tenantDb = req.db;

      // Para Conta Simples, dados financeiros são zerados
      if (accountType === 'simples') {
        const clientsResult = await tenantDb.query(`
          SELECT COUNT(*) as total FROM \${schema}.clients WHERE status = 'active'
        `);

        const clientsGrowth = await tenantDb.query(`
          WITH monthly_clients AS (
            SELECT
              DATE_TRUNC('month', created_at) as month,
              COUNT(*) as new_clients
            FROM \${schema}.clients
            WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
              AND status = 'active'
            GROUP BY DATE_TRUNC('month', created_at)
          )
          SELECT 
            COALESCE(
              (SELECT new_clients FROM monthly_clients WHERE month = DATE_TRUNC('month', NOW())), 0
            ) as current_month,
            COALESCE(
              (SELECT new_clients FROM monthly_clients WHERE month = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0
            ) as previous_month
        `);

        const growth = clientsGrowth.rows[0];
        const growthPercentage = growth.previous_month > 0 
          ? ((growth.current_month - growth.previous_month) / growth.previous_month) * 100 
          : 0;

        return res.json({
          revenue: { value: 0, change: 0, trend: 'up' },
          expenses: { value: 0, change: 0, trend: 'down' },
          balance: { value: 0, change: 0, trend: 'up' },
          clients: { 
            value: parseInt(clientsResult.rows[0].total), 
            change: Math.round(growthPercentage), 
            trend: growthPercentage >= 0 ? 'up' : 'down' 
          },
        });
      }

      // Para Conta Composta e Gerencial, dados completos
      const financialResult = await tenantDb.query(`
        WITH monthly_data AS (
          SELECT
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as current_revenue,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as current_expenses
          FROM \${schema}.cash_flow
          WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
        ),
        previous_month_data AS (
          SELECT
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as previous_revenue,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as previous_expenses
          FROM \${schema}.cash_flow
          WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        )
        SELECT 
          md.current_revenue,
          md.current_expenses,
          (md.current_revenue - md.current_expenses) as current_balance,
          pmd.previous_revenue,
          pmd.previous_expenses,
          (pmd.previous_revenue - pmd.previous_expenses) as previous_balance
        FROM monthly_data md, previous_month_data pmd
      `);

      const financial = financialResult.rows[0] || {
        current_revenue: 0,
        current_expenses: 0,
        current_balance: 0,
        previous_revenue: 0,
        previous_expenses: 0,
        previous_balance: 0,
      };

      const clientsResult = await tenantDb.query(`
        SELECT COUNT(*) as total FROM \${schema}.clients WHERE status = 'active'
      `);

      const clientsGrowth = await tenantDb.query(`
        WITH monthly_clients AS (
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_clients
          FROM \${schema}.clients
          WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            AND status = 'active'
          GROUP BY DATE_TRUNC('month', created_at)
        )
        SELECT 
          COALESCE(
            (SELECT new_clients FROM monthly_clients WHERE month = DATE_TRUNC('month', NOW())), 0
          ) as current_month,
          COALESCE(
            (SELECT new_clients FROM monthly_clients WHERE month = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0
          ) as previous_month
      `);

      const growth = clientsGrowth.rows[0];
      const clientGrowthPercentage = growth.previous_month > 0 
        ? ((growth.current_month - growth.previous_month) / growth.previous_month) * 100 
        : 0;

      // Calcular percentuais de mudança
      const revenueChange = financial.previous_revenue > 0 
        ? ((financial.current_revenue - financial.previous_revenue) / financial.previous_revenue) * 100 
        : 0;

      const expenseChange = financial.previous_expenses > 0 
        ? ((financial.current_expenses - financial.previous_expenses) / financial.previous_expenses) * 100 
        : 0;

      const balanceChange = financial.previous_balance !== 0 
        ? ((financial.current_balance - financial.previous_balance) / Math.abs(financial.previous_balance)) * 100 
        : 0;

      res.json({
        revenue: {
          value: parseFloat(financial.current_revenue) || 0,
          change: Math.round(revenueChange),
          trend: revenueChange >= 0 ? 'up' : 'down',
        },
        expenses: {
          value: parseFloat(financial.current_expenses) || 0,
          change: Math.round(Math.abs(expenseChange)),
          trend: expenseChange <= 0 ? 'down' : 'up',
        },
        balance: {
          value: parseFloat(financial.current_balance) || 0,
          change: Math.round(Math.abs(balanceChange)),
          trend: balanceChange >= 0 ? 'up' : 'down',
        },
        clients: {
          value: parseInt(clientsResult.rows[0].total),
          change: Math.round(clientGrowthPercentage),
          trend: clientGrowthPercentage >= 0 ? 'up' : 'down',
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

      const activities = await tenantDb.query(`
        SELECT 
          'client' as type,
          'Novo cliente adicionado: ' || name as message,
          created_at as time,
          'Users' as icon,
          'text-blue-600' as color
        FROM \${schema}.clients 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'project' as type,
          'Projeto atualizado: ' || title as message,
          updated_at as time,
          'FileText' as icon,
          'text-green-600' as color
        FROM \${schema}.projects 
        WHERE updated_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'task' as type,
          'Tarefa: ' || title || ' - ' || status as message,
          updated_at as time,
          'Clock' as icon,
          'text-purple-600' as color
        FROM \${schema}.tasks 
        WHERE updated_at >= NOW() - INTERVAL '7 days'
        
        ORDER BY time DESC
        LIMIT 10
      `);

      res.json(activities.rows);
    } catch (error) {
      console.error('Recent activities error:', error);
      res.status(500).json({ error: 'Erro ao buscar atividades' });
    }
  }
}

export const dashboardController = new DashboardController();