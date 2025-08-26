import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useProjects = (filters?: any) => {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectsData, statsData] = await Promise.all([
        apiService.getProjects(filters),
        apiService.getProjectStats(),
      ]);

      setProjects(projectsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
      console.error('Projects fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: any) => {
    try {
      const newProject = await apiService.createProject(projectData);
      setProjects((prev: any) => [newProject, ...prev]);
      await fetchProjects(); // Refresh stats
      return newProject;
    } catch (err) {
      console.error('Create project error:', err);
      throw err;
    }
  };

  const updateProject = async (id: string, projectData: any) => {
    try {
      const updatedProject = await apiService.updateProject(id, projectData);
      setProjects((prev: any) => prev.map((project: any) => 
        project.id === id ? updatedProject : project
      ));
      await fetchProjects(); // Refresh stats
      return updatedProject;
    } catch (err) {
      console.error('Update project error:', err);
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await apiService.deleteProject(id);
      setProjects((prev: any) => prev.filter((project: any) => project.id !== id));
      await fetchProjects(); // Refresh stats
    } catch (err) {
      console.error('Delete project error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [JSON.stringify(filters)]);

  return {
    projects,
    stats,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};