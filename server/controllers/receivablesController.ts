import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class ReceivablesController {
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const dashboard = await tenantDb.query(`
        WITH invoice_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'paga') as faturas_pagas,
            COUNT(*) FILTER (WHERE status IN ('pendente', 'nova')) as faturas_pendentes,
            COUNT(*) FILTER (WHERE status = 'vencida') as faturas_vencidas,
            COUNT(*) FILTER (WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' AND status IN ('pendente', 'nova')) as faturas_proximo_vencimento,
            SUM(valor) as valor_total,
            SUM(valor) FILTER (WHERE status = 'paga') as valor_pago,
            SUM(valor) FILTER (WHERE status IN ('pendente', 'nova')) as valor_pendente,
            SUM(valor) FILTER (WHERE status = 'vencida') as valor_vencido,
            SUM(valor) FILTER (WHERE status = 'paga' AND DATE_TRUNC('month', data_pagamento) = DATE_TRUNC('month', NOW())) as faturamento_mensal
          FROM \${schema}.receivables_invoices
        ),
        client_stats AS (
          SELECT
            COUNT(DISTINCT client_id) as clientes_ativos,
            COUNT(DISTINCT client_id) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) as novos_clientes
          FROM \${schema}.receivables_invoices
        )
        SELECT 
          is.*,
          cs.clientes_ativos,
          cs.novos_clientes,
          CASE WHEN is.faturas_pagas + is.faturas_pendentes > 0 
            THEN ROUND((is.faturas_pagas * 100.0 / (is.faturas_pagas + is.faturas_pendentes)), 2) 
            ELSE 0 
          END as taxa_cobrancas
        FROM invoice_stats is, client_stats cs
      `);

      const result = dashboard.rows[0] || {
        faturas_pagas: 0,
        faturas_pendentes: 0,
        faturas_vencidas: 0,
        faturas_proximo_vencimento: 0,
        valor_total: 0,
        valor_pago: 0,
        valor_pendente: 0,
        valor_vencido: 0,
        faturamento_mensal: 0,
        clientes_ativos: 0,
        novos_clientes: 0,
        taxa_cobrancas: 0,
      };

      res.json({
        faturasPagas: parseInt(result.faturas_pagas),
        faturasPendentes: parseInt(result.faturas_pendentes),
        faturasVencidas: parseInt(result.faturas_vencidas),
        faturasProximoVencimento: parseInt(result.faturas_proximo_vencimento),
        valorTotal: parseFloat(result.valor_total) || 0,
        valorPago: parseFloat(result.valor_pago) || 0,
        valorPendente: parseFloat(result.valor_pendente) || 0,
        valorVencido: parseFloat(result.valor_vencido) || 0,
        faturamentoMensal: parseFloat(result.faturamento_mensal) || 0,
        clientesAtivos: parseInt(result.clientes_ativos),
        novosClientes: parseInt(result.novos_clientes),
        taxaCobranças: parseFloat(result.taxa_cobrancas),
        tempoMedioPagamento: 8, // Mock - implementar cálculo real
        crescimentoMensal: 22.4, // Mock - implementar cálculo real
        notificacoesAgendadas: 6, // Mock - implementar busca real
      });
    } catch (error) {
      console.error('Get receivables dashboard error:', error);
      res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
  }

  async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (numero_fatura ILIKE $${paramCount} OR descricao ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      const result = await tenantDb.query(`
        SELECT 
          ri.*,
          c.name as cliente_nome_ref,
          c.email as cliente_email_ref,
          c.mobile as cliente_telefone_ref
        FROM \${schema}.receivables_invoices ri
        LEFT JOIN \${schema}.clients c ON c.id = ri.client_id
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN status = 'pendente' THEN 1
            WHEN status = 'nova' THEN 2
            WHEN status = 'processando' THEN 3
            WHEN status = 'paga' THEN 4
            ELSE 5
          END,
          data_vencimento ASC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Erro ao buscar faturas' });
    }
  }

  async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const invoiceData = req.body;

      const result = await tenantDb.query(`
        INSERT INTO \${schema}.receivables_invoices (
          client_id, numero_fatura, valor, descricao, servico_prestado,
          data_emissao, data_vencimento, status, recorrente, intervalo_dias,
          proxima_fatura_data, urgencia, cliente_nome, cliente_email, cliente_telefone,
          criado_por, observacoes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING *
      `, [
        invoiceData.clienteId,
        invoiceData.numeroFatura,
        invoiceData.valor,
        invoiceData.descricao,
        invoiceData.servicoPrestado,
        invoiceData.dataEmissao,
        invoiceData.dataVencimento,
        invoiceData.status,
        invoiceData.recorrente,
        invoiceData.intervaloDias,
        invoiceData.proximaFaturaData,
        invoiceData.urgencia,
        invoiceData.clienteNome,
        invoiceData.clienteEmail,
        invoiceData.clienteTelefone,
        req.user.name,
        invoiceData.observacoes,
      ]);

      res.status(201).json(result.rows[0]);
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

      const result = await tenantDb.query(`
        UPDATE \${schema}.receivables_invoices SET
          numero_fatura = $1, valor = $2, descricao = $3, servico_prestado = $4,
          data_vencimento = $5, status = $6, urgencia = $7, cliente_nome = $8,
          cliente_email = $9, cliente_telefone = $10, observacoes = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `, [
        invoiceData.numeroFatura,
        invoiceData.valor,
        invoiceData.descricao,
        invoiceData.servicoPrestado,
        invoiceData.dataVencimento,
        invoiceData.status,
        invoiceData.urgencia,
        invoiceData.clienteNome,
        invoiceData.clienteEmail,
        invoiceData.clienteTelefone,
        invoiceData.observacoes,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ error: 'Erro ao atualizar fatura' });
    }
  }

  async deleteInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.receivables_invoices WHERE id = $1 RETURNING numero_fatura
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      res.json({ message: 'Fatura removida com sucesso' });
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ error: 'Erro ao remover fatura' });
    }
  }
}

export const receivablesController = new ReceivablesController();