import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, activitiesData] = await Promise.all([
        apiService.getDashboardMetrics(),
        apiService.getRecentActivities(),
      ]);

      setMetrics(metricsData);
      setActivities(activitiesData);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    metrics,
    activities,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};