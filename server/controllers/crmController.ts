import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { notificationService } from '../services/notificationService';

export class CRMController {
  async getClients(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, page = 1, limit = 50 } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR organization ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      paramCount++;
      const limitClause = `LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      const offsetClause = `OFFSET $${paramCount}`;
      params.push(offset);

      const result = await tenantDb.query(`
        SELECT 
          id, name, organization, email, mobile, country, state, address, city, zip_code,
          budget, currency, level, description, cpf, rg, professional_title, marital_status,
          birth_date, inss_status, amount_paid, referred_by, registered_by, tags, status,
          created_at, updated_at
        FROM \${schema}.clients 
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause} ${offsetClause}
      `, params);

      const countResult = await tenantDb.query(`
        SELECT COUNT(*) as total FROM \${schema}.clients ${whereClause}
      `, params.slice(0, -2)); // Remove limit e offset

      res.json({
        clients: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }

  async createClient(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const clientData = req.body;

      const result = await tenantDb.query(`
        INSERT INTO \${schema}.clients (
          name, organization, email, mobile, country, state, address, city, zip_code,
          budget, currency, level, description, cpf, rg, pis, cei, professional_title,
          marital_status, birth_date, inss_status, amount_paid, referred_by, 
          registered_by, tags, status, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW()
        ) RETURNING *
      `, [
        clientData.name,
        clientData.organization,
        clientData.email,
        clientData.mobile,
        clientData.country,
        clientData.state,
        clientData.address,
        clientData.city,
        clientData.zipCode,
        clientData.budget,
        clientData.currency,
        clientData.level,
        clientData.description,
        clientData.cpf,
        clientData.rg,
        clientData.pis,
        clientData.cei,
        clientData.professionalTitle,
        clientData.maritalStatus,
        clientData.birthDate,
        clientData.inssStatus,
        clientData.amountPaid,
        clientData.referredBy,
        clientData.registeredBy,
        clientData.tags,
        'active',
        req.user.userId,
      ]);

      const client = result.rows[0];

      // Enviar notificação para o tenant
      await notificationService.sendToTenant({
        tenantId: req.tenantId,
        type: 'info',
        title: 'Novo Cliente Cadastrado',
        message: `${client.name} foi adicionado ao CRM`,
        category: 'client',
        details: `Cliente cadastrado com sucesso. Email: ${client.email}, Telefone: ${client.mobile}`,
        actionData: {
          type: 'client',
          id: client.id,
          page: '/crm'
        },
        createdBy: req.user.name,
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  async updateClient(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const clientData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.clients SET
          name = $1, organization = $2, email = $3, mobile = $4, country = $5,
          state = $6, address = $7, city = $8, zip_code = $9, budget = $10,
          currency = $11, level = $12, description = $13, cpf = $14, rg = $15,
          pis = $16, cei = $17, professional_title = $18, marital_status = $19,
          birth_date = $20, inss_status = $21, amount_paid = $22, referred_by = $23,
          registered_by = $24, tags = $25, updated_at = NOW()
        WHERE id = $26
        RETURNING *
      `, [
        clientData.name,
        clientData.organization,
        clientData.email,
        clientData.mobile,
        clientData.country,
        clientData.state,
        clientData.address,
        clientData.city,
        clientData.zipCode,
        clientData.budget,
        clientData.currency,
        clientData.level,
        clientData.description,
        clientData.cpf,
        clientData.rg,
        clientData.pis,
        clientData.cei,
        clientData.professionalTitle,
        clientData.maritalStatus,
        clientData.birthDate,
        clientData.inssStatus,
        clientData.amountPaid,
        clientData.referredBy,
        clientData.registeredBy,
        clientData.tags,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async deleteClient(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        UPDATE \${schema}.clients 
        SET status = 'inactive', updated_at = NOW()
        WHERE id = $1
        RETURNING name
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json({ message: 'Cliente removido com sucesso' });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ error: 'Erro ao remover cliente' });
    }
  }

  async getDeals(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        SELECT 
          id, title, contact_name, organization, email, mobile, address,
          budget, currency, stage, tags, description, created_at, updated_at
        FROM \${schema}.deals 
        ORDER BY created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Get deals error:', error);
      res.status(500).json({ error: 'Erro ao buscar negócios' });
    }
  }

  async createDeal(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const dealData = req.body;

      const result = await tenantDb.query(`
        INSERT INTO \${schema}.deals (
          title, contact_name, organization, email, mobile, address,
          budget, currency, stage, tags, description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        ) RETURNING *
      `, [
        dealData.title,
        dealData.contactName,
        dealData.organization,
        dealData.email,
        dealData.mobile,
        dealData.address,
        dealData.budget,
        dealData.currency,
        dealData.stage,
        dealData.tags,
        dealData.description,
      ]);

      const deal = result.rows[0];

      // Enviar notificação
      await notificationService.sendToTenant({
        tenantId: req.tenantId,
        type: 'info',
        title: 'Novo Negócio Adicionado',
        message: `${deal.title} foi adicionado ao Pipeline de Vendas`,
        category: 'pipeline',
        details: `Negócio criado no estágio: ${deal.stage}. Valor: R$ ${deal.budget}`,
        actionData: {
          type: 'deal',
          id: deal.id,
          page: '/crm'
        },
        createdBy: req.user.name,
      });

      res.status(201).json(deal);
    } catch (error) {
      console.error('Create deal error:', error);
      res.status(500).json({ error: 'Erro ao criar negócio' });
    }
  }

  async updateDeal(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const dealData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.deals SET
          title = $1, contact_name = $2, organization = $3, email = $4, mobile = $5,
          address = $6, budget = $7, currency = $8, stage = $9, tags = $10,
          description = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `, [
        dealData.title,
        dealData.contactName,
        dealData.organization,
        dealData.email,
        dealData.mobile,
        dealData.address,
        dealData.budget,
        dealData.currency,
        dealData.stage,
        dealData.tags,
        dealData.description,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Negócio não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update deal error:', error);
      res.status(500).json({ error: 'Erro ao atualizar negócio' });
    }
  }

  async deleteDeal(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.deals WHERE id = $1 RETURNING title
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Negócio não encontrado' });
      }

      res.json({ message: 'Negócio removido com sucesso' });
    } catch (error) {
      console.error('Delete deal error:', error);
      res.status(500).json({ error: 'Erro ao remover negócio' });
    }
  }
}

export const crmController = new CRMController();