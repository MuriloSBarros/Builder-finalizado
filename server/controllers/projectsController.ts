import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { notificationService } from '../services/notificationService';

export class ProjectsController {
  async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, priority } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (title ILIKE $${paramCount} OR client_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (priority && priority !== 'all') {
        paramCount++;
        whereClause += ` AND priority = $${paramCount}`;
        params.push(priority);
      }

      const result = await tenantDb.query(`
        SELECT 
          p.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', pc.id,
                'name', pc.name,
                'email', pc.email,
                'phone', pc.phone,
                'role', pc.role
              )
            ) FILTER (WHERE pc.id IS NOT NULL), 
            '[]'
          ) as contacts
        FROM \${schema}.projects p
        LEFT JOIN \${schema}.project_contacts pc ON pc.project_id = p.id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Erro ao buscar projetos' });
    }
  }

  async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const projectData = req.body;

      // Criar projeto
      const projectResult = await tenantDb.query(`
        INSERT INTO \${schema}.projects (
          title, description, client_name, client_id, organization, address,
          budget, currency, status, start_date, due_date, priority, progress,
          tags, assigned_to, notes, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING *
      `, [
        projectData.title,
        projectData.description,
        projectData.clientName,
        projectData.clientId,
        projectData.organization,
        projectData.address,
        projectData.budget,
        projectData.currency,
        projectData.status,
        projectData.startDate,
        projectData.dueDate,
        projectData.priority,
        projectData.progress,
        projectData.tags,
        projectData.assignedTo,
        projectData.notes,
        req.user.name,
      ]);

      const project = projectResult.rows[0];

      // Criar contatos do projeto
      if (projectData.contacts && projectData.contacts.length > 0) {
        for (const contact of projectData.contacts) {
          await tenantDb.query(`
            INSERT INTO \${schema}.project_contacts (project_id, name, email, phone, role)
            VALUES ($1, $2, $3, $4, $5)
          `, [project.id, contact.name, contact.email, contact.phone, contact.role]);
        }
      }

      // Enviar notificação
      await notificationService.sendToTenant({
        tenantId: req.tenantId,
        type: 'info',
        title: 'Novo Projeto Criado',
        message: `${project.title} foi criado`,
        category: 'project',
        details: `Projeto criado para cliente: ${project.client_name}. Prazo: ${new Date(project.due_date).toLocaleDateString('pt-BR')}`,
        actionData: {
          type: 'project',
          id: project.id,
          page: '/projetos'
        },
        createdBy: req.user.name,
      });

      res.status(201).json(project);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Erro ao criar projeto' });
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const projectData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.projects SET
          title = $1, description = $2, client_name = $3, organization = $4,
          address = $5, budget = $6, currency = $7, status = $8, start_date = $9,
          due_date = $10, priority = $11, progress = $12, tags = $13, assigned_to = $14,
          notes = $15, updated_at = NOW()
        WHERE id = $16
        RETURNING *
      `, [
        projectData.title,
        projectData.description,
        projectData.clientName,
        projectData.organization,
        projectData.address,
        projectData.budget,
        projectData.currency,
        projectData.status,
        projectData.startDate,
        projectData.dueDate,
        projectData.priority,
        projectData.progress,
        projectData.tags,
        projectData.assignedTo,
        projectData.notes,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.projects WHERE id = $1 RETURNING title
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      res.json({ message: 'Projeto removido com sucesso' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Erro ao remover projeto' });
    }
  }

  async getProjectStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const stats = await tenantDb.query(`
        WITH project_stats AS (
          SELECT
            COUNT(*) as total_projects,
            COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost')) as active_projects,
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('won', 'lost')) as overdue_projects,
            SUM(CASE WHEN status = 'won' THEN budget ELSE 0 END) as total_revenue,
            AVG(progress) FILTER (WHERE status NOT IN ('won', 'lost')) as avg_progress
          FROM \${schema}.projects
        )
        SELECT * FROM project_stats
      `);

      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export const projectsController = new ProjectsController();