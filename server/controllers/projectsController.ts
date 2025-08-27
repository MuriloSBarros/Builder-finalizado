import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class ProjectsController {
  async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, priority } = req.query;

      let options: any = {
        order: { column: 'created_at', ascending: false }
      };

      // Apply filters
      if (status && status !== 'all') {
        options.eq = { ...options.eq, status };
      }

      if (priority && priority !== 'all') {
        options.eq = { ...options.eq, priority };
      }

      const { rows: projects } = await tenantDb.query('projects', options);

      // Filter by search term (client-side for now)
      let filteredProjects = projects;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredProjects = projects.filter((project: any) =>
          project.title.toLowerCase().includes(searchTerm) ||
          project.client_name.toLowerCase().includes(searchTerm) ||
          project.description?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredProjects);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Erro ao buscar projetos' });
    }
  }

  async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const projectData = req.body;

      const project = await tenantDb.insert('projects', {
        ...projectData,
        created_by: req.user.userId,
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

      const project = await tenantDb.update('projects', id, {
        ...projectData,
        updated_at: new Date().toISOString(),
      });

      res.json(project);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Erro ao atualizar projeto' });
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('projects', id);
      res.json({ message: 'Projeto removido com sucesso' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Erro ao remover projeto' });
    }
  }

  async getProjectStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: projects } = await tenantDb.query('projects');

      const stats = {
        total_projects: projects.length,
        active_projects: projects.filter((p: any) => !['won', 'lost'].includes(p.status)).length,
        overdue_projects: projects.filter((p: any) => 
          new Date(p.due_date) < new Date() && !['won', 'lost'].includes(p.status)
        ).length,
        total_revenue: projects
          .filter((p: any) => p.status === 'won')
          .reduce((sum: number, p: any) => sum + parseFloat(p.budget || 0), 0),
        avg_progress: Math.round(
          projects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projects.length
        ) || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export const projectsController = new ProjectsController();