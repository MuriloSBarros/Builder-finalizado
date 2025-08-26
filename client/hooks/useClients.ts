import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useClients = (filters?: any) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50 });

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiService.getClients(filters);
      setClients(data.clients || data);
      
      if (data.total !== undefined) {
        setPagination({
          total: data.total,
          page: data.page || 1,
          limit: data.limit || 50,
        });
      }
    } catch (err) {
      setError(err.message);
      console.error('Clients fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: any) => {
    try {
      const newClient = await apiService.createClient(clientData);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      console.error('Create client error:', err);
      throw err;
    }
  };

  const updateClient = async (id: string, clientData: any) => {
    try {
      const updatedClient = await apiService.updateClient(id, clientData);
      setClients(prev => prev.map(client => 
        client.id === id ? updatedClient : client
      ));
      return updatedClient;
    } catch (err) {
      console.error('Update client error:', err);
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await apiService.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (err) {
      console.error('Delete client error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchClients();
  }, [JSON.stringify(filters)]);

  return {
    clients,
    loading,
    error,
    pagination,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  };
};