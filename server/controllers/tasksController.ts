import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { notificationService } from '../services/notificationService';

export class TasksController {
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, priority, assignee } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
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

      if (assignee && assignee !== 'all') {
        paramCount++;
        whereClause += ` AND assigned_to = $${paramCount}`;
        params.push(assignee);
      }

      const result = await tenantDb.query(`
        SELECT 
          t.*,
          p.title as project_title,
          c.name as client_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', st.id,
                'title', st.title,
                'completed', st.completed,
                'completed_at', st.completed_at,
                'created_at', st.created_at
              )
            ) FILTER (WHERE st.id IS NOT NULL), 
            '[]'
          ) as subtasks
        FROM \${schema}.tasks t
        LEFT JOIN \${schema}.projects p ON p.id = t.project_id
        LEFT JOIN \${schema}.clients c ON c.id = t.client_id
        LEFT JOIN \${schema}.subtasks st ON st.task_id = t.id
        ${whereClause}
        GROUP BY t.id, p.title, c.name
        ORDER BY t.created_at DESC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const taskData = req.body;

      // Criar tarefa
      const taskResult = await tenantDb.query(`
        INSERT INTO \${schema}.tasks (
          title, description, start_date, end_date, status, priority, assigned_to,
          project_id, client_id, estimated_hours, actual_hours, progress, tags, notes,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING *
      `, [
        taskData.title,
        taskData.description,
        taskData.startDate,
        taskData.endDate,
        taskData.status,
        taskData.priority,
        taskData.assignedTo,
        taskData.projectId || null,
        taskData.clientId || null,
        taskData.estimatedHours,
        taskData.actualHours,
        taskData.progress,
        taskData.tags,
        taskData.notes,
      ]);

      const task = taskResult.rows[0];

      // Criar subtarefas
      if (taskData.subtasks && taskData.subtasks.length > 0) {
        for (const subtask of taskData.subtasks) {
          await tenantDb.query(`
            INSERT INTO \${schema}.subtasks (task_id, title, completed, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [task.id, subtask.title, subtask.completed]);
        }
      }

      // Enviar notificação
      await notificationService.sendToTenant({
        tenantId: req.tenantId,
        type: 'info',
        title: 'Nova Tarefa Criada',
        message: `${task.title} foi atribuída${task.assigned_to ? ` a ${task.assigned_to}` : ''}`,
        category: 'task',
        details: `Tarefa criada com prioridade: ${task.priority}. Prazo: ${new Date(task.end_date).toLocaleDateString('pt-BR')}`,
        actionData: {
          type: 'task',
          id: task.id,
          page: '/tarefas'
        },
        createdBy: req.user.name,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;
      const taskData = req.body;

      const result = await tenantDb.query(`
        UPDATE \${schema}.tasks SET
          title = $1, description = $2, start_date = $3, end_date = $4, status = $5,
          priority = $6, assigned_to = $7, project_id = $8, client_id = $9,
          estimated_hours = $10, actual_hours = $11, progress = $12, tags = $13,
          notes = $14, completed_at = $15, updated_at = NOW()
        WHERE id = $16
        RETURNING *
      `, [
        taskData.title,
        taskData.description,
        taskData.startDate,
        taskData.endDate,
        taskData.status,
        taskData.priority,
        taskData.assignedTo,
        taskData.projectId || null,
        taskData.clientId || null,
        taskData.estimatedHours,
        taskData.actualHours,
        taskData.progress,
        taskData.tags,
        taskData.notes,
        taskData.status === 'completed' ? new Date() : null,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        DELETE FROM \${schema}.tasks WHERE id = $1 RETURNING title
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      res.json({ message: 'Tarefa removida com sucesso' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Erro ao remover tarefa' });
    }
  }

  async getTaskStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const stats = await tenantDb.query(`
        WITH task_stats AS (
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE end_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue,
            AVG(EXTRACT(DAY FROM (completed_at - created_at))) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL) as avg_completion_time
          FROM \${schema}.tasks
        )
        SELECT 
          *,
          CASE WHEN total > 0 THEN ROUND((completed * 100.0 / total), 2) ELSE 0 END as completion_rate
        FROM task_stats
      `);

      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Get task stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  async toggleSubtask(req: AuthenticatedRequest, res: Response) {
    try {
      const { taskId, subtaskId } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        UPDATE \${schema}.subtasks SET
          completed = NOT completed,
          completed_at = CASE WHEN NOT completed THEN NOW() ELSE NULL END
        WHERE id = $1 AND task_id = $2
        RETURNING *
      `, [subtaskId, taskId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Subtarefa não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Toggle subtask error:', error);
      res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
    }
  }
}

export const tasksController = new TasksController();