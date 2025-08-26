import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useTasks = (filters?: any) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksData, statsData] = await Promise.all([
        apiService.getTasks(filters),
        apiService.getTaskStats(),
      ]);

      setTasks(tasksData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
      console.error('Tasks fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: any) => {
    try {
      const newTask = await apiService.createTask(taskData);
      setTasks((prev: any) => [newTask, ...prev]);
      await fetchTasks(); // Refresh stats
      return newTask;
    } catch (err) {
      console.error('Create task error:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, taskData: any) => {
    try {
      const updatedTask = await apiService.updateTask(id, taskData);
      setTasks((prev: any) => prev.map((task: any) => 
        task.id === id ? updatedTask : task
      ));
      await fetchTasks(); // Refresh stats
      return updatedTask;
    } catch (err) {
      console.error('Update task error:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiService.deleteTask(id);
      setTasks((prev: any) => prev.filter((task: any) => task.id !== id));
      await fetchTasks(); // Refresh stats
    } catch (err) {
      console.error('Delete task error:', err);
      throw err;
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await apiService.toggleSubtask(taskId, subtaskId);
      await fetchTasks(); // Refresh to get updated subtasks
    } catch (err) {
      console.error('Toggle subtask error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [JSON.stringify(filters)]);

  return {
    tasks,
    stats,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleSubtask,
    refetch: fetchTasks,
  };
};