import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class BillingController {
  async getDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, type } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (number ILIKE $${paramCount} OR title ILIKE $${paramCount} OR receiver_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (type && type !== 'all') {
        paramCount++;
        whereClause += ` AND type = $${paramCount}`;
        params.push(type);
      }

      const result = await tenantDb.query(`
        SELECT 
          bd.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', bi.id,
                'description', bi.description,
                'quantity', bi.quantity,
                'rate', bi.rate,
                'amount', bi.amount,
                'tax', bi.tax
              )
            ) FILTER (WHERE bi.id IS NOT NULL), 
            '[]'
          ) as items
        FROM \${schema}.billing_documents bd
        LEFT JOIN \${schema}.billing_items bi ON bi.document_id = bd.id
        ${whereClause}
        GROUP BY bd.id
        ORDER BY bd.created_at DESC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Erro ao buscar documentos' });
    }
  }

  async createDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const documentData = req.body;

      // Criar documento
      const documentResult = await tenantDb.query(`
        INSERT INTO \${schema}.billing_documents (
          type, number, date, due_date, sender_id, sender_name, receiver_id, receiver_name,
          title, description, subtotal, discount, discount_type, fee, fee_type, tax, tax_type,
          total, currency, status, tags, notes, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
        ) RETURNING *
      `, [
        documentData.type,
        documentData.number,
        documentData.date,
        documentData.dueDate,
        documentData.senderId,
        documentData.senderName,
        documentData.receiverId,
        documentData.receiverName,
        documentData.title,
        documentData.description,
        documentData.subtotal,
        documentData.discount,
        documentData.discountType,
        documentData.fee,
        documentData.feeType,
        documentData.tax,
        documentData.taxType,
        documentData.total,
        documentData.currency,
        documentData.status,
        documentData.tags,
        documentData.notes,
        req.user.name,
      ]);

      const document = documentResult.rows[0];

      // Criar itens do documento
      if (documentData.items && documentData.items.length > 0) {
        for (const item of documentData.items) {
          await tenantDb.query(`
            INSERT INTO \${schema}.billing_items (document_id, description, quantity, rate, amount, tax)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [document.id, item.description, item.quantity, item.rate, item.amount, item.tax]);
        }
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Create document error:', error);
      res.status(500).json({ error: 'Erro ao criar documento' });
    }
  }

  async updateDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const documentData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.billing_documents SET
          title = $1, description = $2, subtotal = $3, discount = $4, discount_type = $5,
          fee = $6, fee_type = $7, tax = $8, tax_type = $9, total = $10, status = $11,
          tags = $12, notes = $13, last_modified_by = $14, updated_at = NOW()
        WHERE id = $15
        RETURNING *
      `, [
        documentData.title,
        documentData.description,
        documentData.subtotal,
        documentData.discount,
        documentData.discountType,
        documentData.fee,
        documentData.feeType,
        documentData.tax,
        documentData.taxType,
        documentData.total,
        documentData.status,
        documentData.tags,
        documentData.notes,
        req.user.name,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Erro ao atualizar documento' });
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.billing_documents WHERE id = $1 RETURNING number
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      res.json({ message: 'Documento removido com sucesso' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Erro ao remover documento' });
    }
  }

  async getBillingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const stats = await tenantDb.query(`
        WITH billing_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE type = 'estimate') as total_estimates,
            COUNT(*) FILTER (WHERE type = 'invoice') as total_invoices,
            SUM(total) FILTER (WHERE status IN ('Pendente', 'SENT', 'VIEWED')) as pending_amount,
            SUM(total) FILTER (WHERE status = 'PAID') as paid_amount,
            SUM(total) FILTER (WHERE status = 'OVERDUE' OR (due_date < CURRENT_DATE AND status NOT IN ('PAID', 'CANCELLED'))) as overdue_amount,
            SUM(total) FILTER (WHERE type = 'invoice' AND status = 'PAID' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())) as this_month_revenue
          FROM \${schema}.billing_documents
        )
        SELECT * FROM billing_stats
      `);

      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Get billing stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export const billingController = new BillingController();