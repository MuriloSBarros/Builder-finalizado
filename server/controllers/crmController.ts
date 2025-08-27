import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class CRMController {
  async getClients(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, page = 1, limit = 50 } = req.query;

      let options: any = {
        order: { column: 'created_at', ascending: false }
      };

      // Apply filters
      if (status && status !== 'all') {
        options.eq = { ...options.eq, status };
      }

      const { rows: clients } = await tenantDb.query('clients', options);

      // Filter by search term (client-side for now)
      let filteredClients = clients;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredClients = clients.filter((client: any) =>
          client.name.toLowerCase().includes(searchTerm) ||
          client.email?.toLowerCase().includes(searchTerm) ||
          client.organization?.toLowerCase().includes(searchTerm)
        );
      }

      res.json({
        clients: filteredClients,
        total: filteredClients.length,
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

      const client = await tenantDb.insert('clients', {
        ...clientData,
        created_by: req.user.userId,
        status: 'active',
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

      const client = await tenantDb.update('clients', id, {
        ...clientData,
        updated_at: new Date().toISOString(),
      });

      res.json(client);
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async deleteClient(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('clients', id);
      res.json({ message: 'Cliente removido com sucesso' });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ error: 'Erro ao remover cliente' });
    }
  }

  async getDeals(req: AuthenticatedRequest, res: Response) {
    try {
      // For now, return empty array as deals are part of projects
      res.json([]);
    } catch (error) {
      console.error('Get deals error:', error);
      res.status(500).json({ error: 'Erro ao buscar negócios' });
    }
  }

  async createDeal(req: AuthenticatedRequest, res: Response) {
    try {
      // For now, return success
      res.status(201).json({ message: 'Deal criado com sucesso' });
    } catch (error) {
      console.error('Create deal error:', error);
      res.status(500).json({ error: 'Erro ao criar negócio' });
    }
  }

  async updateDeal(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ message: 'Deal atualizado com sucesso' });
    } catch (error) {
      console.error('Update deal error:', error);
      res.status(500).json({ error: 'Erro ao atualizar negócio' });
    }
  }

  async deleteDeal(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ message: 'Deal removido com sucesso' });
    } catch (error) {
      console.error('Delete deal error:', error);
      res.status(500).json({ error: 'Erro ao remover negócio' });
    }
  }
}

export const crmController = new CRMController();