import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class CashFlowController {
  async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, type, category, status } = req.query;

      let options: any = {
        order: { column: 'date', ascending: false }
      };

      // Apply filters
      if (type && type !== 'all') {
        options.eq = { ...options.eq, type };
      }

      if (category && category !== 'all') {
        options.eq = { ...options.eq, category_id: category };
      }

      if (status && status !== 'all') {
        options.eq = { ...options.eq, status };
      }

      const { rows: transactions } = await tenantDb.query('cash_flow', options);

      // Filter by search term (client-side for now)
      let filteredTransactions = transactions;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredTransactions = transactions.filter((transaction: any) =>
          transaction.description.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredTransactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Erro ao buscar transações' });
    }
  }

  async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const transactionData = req.body;

      const transaction = await tenantDb.insert('cash_flow', {
        ...transactionData,
        created_by: req.user.name,
      });

      res.status(201).json(transaction);
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

      const transaction = await tenantDb.update('cash_flow', id, {
        ...transactionData,
        last_modified_by: req.user.name,
        updated_at: new Date().toISOString(),
      });

      res.json(transaction);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
  }

  async deleteTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('cash_flow', id);
      res.json({ message: 'Transação removida com sucesso' });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ error: 'Erro ao remover transação' });
    }
  }

  async exportCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: transactions } = await tenantDb.query('cash_flow', {
        order: { column: 'date', ascending: false }
      });

      // Convert to CSV
      const headers = [
        'Data',
        'Tipo',
        'Descrição',
        'Valor',
        'Categoria',
        'Status',
        'Forma de Pagamento'
      ];

      const csvContent = [
        headers.join(','),
        ...transactions.map((row: any) => [
          row.date,
          row.type === 'income' ? 'Receita' : 'Despesa',
          `"${row.description}"`,
          row.amount,
          row.category_id,
          row.status,
          row.payment_method || ''
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