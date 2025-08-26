import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class CashFlowController {
  async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, type, category, status, startDate, endDate } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND description ILIKE $${paramCount}`;
        params.push(`%${search}%`);
      }

      if (type && type !== 'all') {
        paramCount++;
        whereClause += ` AND type = $${paramCount}`;
        params.push(type);
      }

      if (category && category !== 'all') {
        paramCount++;
        whereClause += ` AND category_id = $${paramCount}`;
        params.push(category);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (startDate) {
        paramCount++;
        whereClause += ` AND date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereClause += ` AND date <= $${paramCount}`;
        params.push(endDate);
      }

      const result = await tenantDb.query(`
        SELECT 
          cf.*,
          p.title as project_title,
          c.name as client_name
        FROM \${schema}.cash_flow cf
        LEFT JOIN \${schema}.projects p ON p.id = cf.project_id
        LEFT JOIN \${schema}.clients c ON c.id = cf.client_id
        ${whereClause}
        ORDER BY cf.date DESC, cf.created_at DESC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const transactionData = req.body;

      const result = await tenantDb.query(`
        INSERT INTO \${schema}.cash_flow (
          type, amount, category_id, description, date, payment_method, status,
          project_id, client_id, tags, notes, is_recurring, recurring_frequency,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING *
      `, [
        transactionData.type,
        transactionData.amount,
        transactionData.categoryId,
        transactionData.description,
        transactionData.date,
        transactionData.paymentMethod,
        transactionData.status,
        transactionData.projectId || null,
        transactionData.clientId || null,
        transactionData.tags,
        transactionData.notes,
        transactionData.isRecurring,
        transactionData.recurringFrequency,
        req.user.name,
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Erro ao criar transação' });
    }
  }

  async updateTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const transactionData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.cash_flow SET
          type = $1, amount = $2, category_id = $3, description = $4, date = $5,
          payment_method = $6, status = $7, project_id = $8, client_id = $9,
          tags = $10, notes = $11, is_recurring = $12, recurring_frequency = $13,
          last_modified_by = $14, updated_at = NOW()
        WHERE id = $15
        RETURNING *
      `, [
        transactionData.type,
        transactionData.amount,
        transactionData.categoryId,
        transactionData.description,
        transactionData.date,
        transactionData.paymentMethod,
        transactionData.status,
        transactionData.projectId || null,
        transactionData.clientId || null,
        transactionData.tags,
        transactionData.notes,
        transactionData.isRecurring,
        transactionData.recurringFrequency,
        req.user.name,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
  }

  async deleteTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.cash_flow WHERE id = $1 RETURNING description
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }

      res.json({ message: 'Transação removida com sucesso' });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ error: 'Erro ao remover transação' });
    }
  }

  async exportCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { startDate, endDate } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (startDate) {
        params.push(startDate);
        whereClause += ` AND date >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        whereClause += ` AND date <= $${params.length}`;
      }

      const result = await tenantDb.query(`
        SELECT 
          date,
          type,
          description,
          amount,
          category_id,
          payment_method,
          status,
          tags,
          notes,
          created_by,
          created_at
        FROM \${schema}.cash_flow
        ${whereClause}
        ORDER BY date DESC
      `, params);

      // Converter para CSV
      const headers = [
        'Data',
        'Tipo',
        'Descrição',
        'Valor',
        'Categoria',
        'Forma de Pagamento',
        'Status',
        'Tags',
        'Observações',
        'Criado Por',
        'Data de Criação'
      ];

      const csvContent = [
        headers.join(','),
        ...result.rows.map((row: any) => [
          row.date,
          row.type === 'income' ? 'Receita' : 'Despesa',
          `"${row.description}"`,
          row.amount,
          row.category_id,
          row.payment_method || '',
          row.status,
          `"${(row.tags || []).join(', ')}"`,
          `"${row.notes || ''}"`,
          row.created_by || '',
          row.created_at
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
  }
}

export const cashFlowController = new CashFlowController();