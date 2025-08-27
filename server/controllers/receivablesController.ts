import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class ReceivablesController {
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: invoices } = await tenantDb.query('receivables_invoices');

      const dashboard = {
        faturasPagas: invoices.filter((i: any) => i.status === 'paga').length,
        faturasPendentes: invoices.filter((i: any) => ['pendente', 'nova'].includes(i.status)).length,
        faturasVencidas: invoices.filter((i: any) => i.status === 'vencida').length,
        faturasProximoVencimento: invoices.filter((i: any) => {
          const daysUntilDue = Math.ceil((new Date(i.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDue <= 3 && daysUntilDue >= 0 && ['pendente', 'nova'].includes(i.status);
        }).length,
        valorTotal: invoices.reduce((sum: number, i: any) => sum + parseFloat(i.valor), 0),
        valorPago: invoices
          .filter((i: any) => i.status === 'paga')
          .reduce((sum: number, i: any) => sum + parseFloat(i.valor), 0),
        valorPendente: invoices
          .filter((i: any) => ['pendente', 'nova'].includes(i.status))
          .reduce((sum: number, i: any) => sum + parseFloat(i.valor), 0),
        valorVencido: invoices
          .filter((i: any) => i.status === 'vencida')
          .reduce((sum: number, i: any) => sum + parseFloat(i.valor), 0),
        faturamentoMensal: invoices
          .filter((i: any) => {
            const invoiceDate = new Date(i.data_emissao);
            const thisMonth = new Date();
            return invoiceDate.getMonth() === thisMonth.getMonth() &&
                   invoiceDate.getFullYear() === thisMonth.getFullYear() &&
                   i.status === 'paga';
          })
          .reduce((sum: number, i: any) => sum + parseFloat(i.valor), 0),
        clientesAtivos: new Set(invoices.map((i: any) => i.client_id)).size,
        novosClientes: 5, // Mock value
        taxaCobranças: 96.8, // Mock value
        tempoMedioPagamento: 8, // Mock value
        crescimentoMensal: 22.4, // Mock value
        notificacoesAgendadas: 6, // Mock value
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Get receivables dashboard error:', error);
      res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
  }

  async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status } = req.query;

      let options: any = {
        order: { column: 'created_at', ascending: false }
      };

      // Apply filters
      if (status && status !== 'all') {
        options.eq = { ...options.eq, status };
      }

      const { rows: invoices } = await tenantDb.query('receivables_invoices', options);

      // Filter by search term (client-side for now)
      let filteredInvoices = invoices;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredInvoices = invoices.filter((invoice: any) =>
          invoice.numero_fatura.toLowerCase().includes(searchTerm) ||
          invoice.descricao?.toLowerCase().includes(searchTerm) ||
          invoice.cliente_nome?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredInvoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Erro ao buscar faturas' });
    }
  }

  async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const invoiceData = req.body;

      const invoice = await tenantDb.insert('receivables_invoices', {
        ...invoiceData,
        criado_por: req.user.name,
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Erro ao criar fatura' });
    }
  }

  async updateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const invoiceData = req.body;

      const invoice = await tenantDb.update('receivables_invoices', id, {
        ...invoiceData,
        updated_at: new Date().toISOString(),
      });

      res.json(invoice);
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }

  async deleteInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('receivables_invoices', id);
      res.json({ message: 'Fatura removida com sucesso' });
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ error: 'Erro ao remover fatura' });
    }
  }
}

export const receivablesController = new ReceivablesController();