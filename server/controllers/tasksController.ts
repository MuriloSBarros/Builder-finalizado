import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class TasksController {
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status, priority, assignee } = req.query;

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

      if (assignee && assignee !== 'all') {
        options.eq = { ...options.eq, assigned_to: assignee };
      }

      const { rows: tasks } = await tenantDb.query('tasks', options);

      // Get subtasks for each task
      const tasksWithSubtasks = await Promise.all(
        tasks.map(async (task: any) => {
          const { rows: subtasks } = await db.query('subtasks', {
            eq: { task_id: task.id }
          });
          return { ...task, subtasks };
        })
      );

      // Filter by search term (client-side for now)
      let filteredTasks = tasksWithSubtasks;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredTasks = tasksWithSubtasks.filter((task: any) =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredTasks);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const taskData = req.body;

      const task = await tenantDb.insert('tasks', {
        ...taskData,
        created_by: req.user.userId,
      });

      // Create subtasks if provided
      if (taskData.subtasks && taskData.subtasks.length > 0) {
        for (const subtask of taskData.subtasks) {
          await db.insert('subtasks', {
            task_id: task.id,
            title: subtask.title,
            completed: subtask.completed || false,
          });
        }
      }

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

      const task = await tenantDb.update('tasks', id, {
        ...taskData,
        updated_at: new Date().toISOString(),
        completed_at: taskData.status === 'completed' ? new Date().toISOString() : null,
      });

      res.json(task);
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      await tenantDb.delete('tasks', id);
      res.json({ message: 'Tarefa removida com sucesso' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Erro ao remover tarefa' });
    }
  }

  async getTaskStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;

      const { rows: tasks } = await tenantDb.query('tasks');

      const stats = {
        total: tasks.length,
        not_started: tasks.filter((t: any) => t.status === 'not_started').length,
        in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
        completed: tasks.filter((t: any) => t.status === 'completed').length,
        overdue: tasks.filter((t: any) => 
          new Date(t.end_date) < new Date() && !['completed', 'cancelled'].includes(t.status)
        ).length,
        completion_rate: tasks.length > 0 
          ? Math.round((tasks.filter((t: any) => t.status === 'completed').length / tasks.length) * 100)
          : 0,
        average_completion_time: 7, // Mock value
      };

      res.json(stats);
    } catch (error) {
      console.error('Get task stats error:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  async toggleSubtask(req: AuthenticatedRequest, res: Response) {
    try {
      const { subtaskId } = req.params;

      // Get current subtask
      const { rows: subtasks } = await db.query('subtasks', {
        eq: { id: subtaskId }
      });

      if (subtasks.length === 0) {
        return res.status(404).json({ error: 'Subtarefa não encontrada' });
      }

      const subtask = subtasks[0];
      const newCompleted = !subtask.completed;

      const updatedSubtask = await db.update('subtasks', subtaskId, {
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      });

      res.json(updatedSubtask);
    } catch (error) {
      console.error('Toggle subtask error:', error);
      res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
    }
  }
}

export const crmController = new CRMController();