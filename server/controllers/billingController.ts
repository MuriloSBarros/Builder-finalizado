import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class BillingController {
  async getDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, type } = req.query;

      let options: any = {
        order: { column: 'created_at', ascending: false }
      };

      // Apply filters
      if (status && status !== 'all') {
        options.eq = { ...options.eq, status };
      }

      if (type && type !== 'all') {
        options.eq = { ...options.eq, type };
      }

      const { rows: documents } = await tenantDb.query('billing_documents', options);

      // Get items for each document
      const documentsWithItems = await Promise.all(
        documents.map(async (doc: any) => {
          const { rows: items } = await db.query('billing_items', {
            eq: { document_id: doc.id }
          });
          return { ...doc, items };
        })
      );

      // Filter by search term (client-side for now)
      let filteredDocuments = documentsWithItems;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredDocuments = documentsWithItems.filter((doc: any) =>
          doc.number.toLowerCase().includes(searchTerm) ||
          doc.title.toLowerCase().includes(searchTerm) ||
          doc.receiver_name?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredDocuments);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Erro ao buscar documentos' });
    }
  }

  async createDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const documentData = req.body;

      // Create document
      const document = await tenantDb.insert('billing_documents', {
        ...documentData,
        created_by: req.user.name,
      });

      // Create items
      if (documentData.items && documentData.items.length > 0) {
        for (const item of documentData.items) {
          await db.insert('billing_items', {
            document_id: document.id,
            ...item,
          });
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

      const document = await tenantDb.update('billing_documents', id, {
        ...documentData,
        last_modified_by: req.user.name,
        updated_at: new Date().toISOString(),
      });

      res.json(document);
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Erro ao atualizar documento' });
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('billing_documents', id);
      res.json({ message: 'Documento removido com sucesso' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Erro ao remover documento' });
    }
  }

  async getBillingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: documents } = await tenantDb.query('billing_documents');

      const stats = {
        totalEstimates: documents.filter((d: any) => d.type === 'estimate').length,
        totalInvoices: documents.filter((d: any) => d.type === 'invoice').length,
        pendingAmount: documents
          .filter((d: any) => ['Pendente', 'SENT', 'VIEWED'].includes(d.status))
          .reduce((sum: number, d: any) => sum + parseFloat(d.total), 0),
        paidAmount: documents
          .filter((d: any) => d.status === 'PAID')
          .reduce((sum: number, d: any) => sum + parseFloat(d.total), 0),
        overdueAmount: documents
          .filter((d: any) => d.status === 'OVERDUE' || 
            (new Date(d.due_date) < new Date() && !['PAID', 'CANCELLED'].includes(d.status)))
          .reduce((sum: number, d: any) => sum + parseFloat(d.total), 0),
        thisMonthRevenue: documents
          .filter((d: any) => {
            const docDate = new Date(d.date);
            const thisMonth = new Date();
            return docDate.getMonth() === thisMonth.getMonth() &&
                   docDate.getFullYear() === thisMonth.getFullYear() &&
                   d.status === 'PAID';
          })
          .reduce((sum: number, d: any) => sum + parseFloat(d.total), 0),
        averagePaymentTime: 15, // Mock value
      };

      res.json(stats);
    } catch (error) {
      console.error('Get billing stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export const billingController = new BillingController();