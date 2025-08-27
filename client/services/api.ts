/**
 * API SERVICE - INTEGRAÇÃO COM SUPABASE
 * =====================================
 * 
 * Centraliza todas as chamadas para o backend usando Supabase.
 * Remove todos os mock data e implementa chamadas reais.
 */

const API_BASE_URL = '/api';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('accessToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (response.status === 401) {
        // Token expired, try refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          };
          return await fetch(`${API_BASE_URL}${endpoint}`, config);
        } else {
          // Redirect to login
          window.location.href = '/login';
          throw new Error('Sessão expirada');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na requisição');
      }

      return response;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // AUTH
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));

    return data;
  }

  async register(userData: any) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
    }
  }

  // DASHBOARD
  async getDashboardMetrics() {
    const response = await this.request('/dashboard/metrics');
    return await response.json();
  }

  async getRecentActivities() {
    const response = await this.request('/dashboard/activities');
    return await response.json();
  }

  // CRM
  async getClients(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/crm/clients${queryString}`);
    return await response.json();
  }

  async createClient(clientData: any) {
    const response = await this.request('/crm/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
    return await response.json();
  }

  async updateClient(id: string, clientData: any) {
    const response = await this.request(`/crm/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
    return await response.json();
  }

  async deleteClient(id: string) {
    const response = await this.request(`/crm/clients/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  async getDeals() {
    const response = await this.request('/crm/deals');
    return await response.json();
  }

  async createDeal(dealData: any) {
    const response = await this.request('/crm/deals', {
      method: 'POST',
      body: JSON.stringify(dealData),
    });
    return await response.json();
  }

  async updateDeal(id: string, dealData: any) {
    const response = await this.request(`/crm/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dealData),
    });
    return await response.json();
  }

  async deleteDeal(id: string) {
    const response = await this.request(`/crm/deals/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  // PROJECTS
  async getProjects(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/projects${queryString}`);
    return await response.json();
  }

  async createProject(projectData: any) {
    const response = await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
    return await response.json();
  }

  async updateProject(id: string, projectData: any) {
    const response = await this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
    return await response.json();
  }

  async deleteProject(id: string) {
    const response = await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  async getProjectStats() {
    const response = await this.request('/projects/stats');
    return await response.json();
  }

  // TASKS
  async getTasks(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/tasks${queryString}`);
    return await response.json();
  }

  async createTask(taskData: any) {
    const response = await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return await response.json();
  }

  async updateTask(id: string, taskData: any) {
    const response = await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    return await response.json();
  }

  async deleteTask(id: string) {
    const response = await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  async getTaskStats() {
    const response = await this.request('/tasks/stats');
    return await response.json();
  }

  async toggleSubtask(taskId: string, subtaskId: string) {
    const response = await this.request(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
      method: 'PUT',
    });
    return await response.json();
  }

  // CASH FLOW
  async getTransactions(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/cash-flow/transactions${queryString}`);
    return await response.json();
  }

  async createTransaction(transactionData: any) {
    const response = await this.request('/cash-flow/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    return await response.json();
  }

  async updateTransaction(id: string, transactionData: any) {
    const response = await this.request(`/cash-flow/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
    return await response.json();
  }

  async deleteTransaction(id: string) {
    const response = await this.request(`/cash-flow/transactions/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  async exportTransactionsCSV(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/cash-flow/export/csv${queryString}`);
    return response; // Return response directly for file download
  }

  // BILLING
  async getBillingDocuments(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/billing/documents${queryString}`);
    return await response.json();
  }

  async createBillingDocument(documentData: any) {
    const response = await this.request('/billing/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
    return await response.json();
  }

  async updateBillingDocument(id: string, documentData: any) {
    const response = await this.request(`/billing/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(documentData),
    });
    return await response.json();
  }

  async deleteBillingDocument(id: string) {
    const response = await this.request(`/billing/documents/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  async getBillingStats() {
    const response = await this.request('/billing/stats');
    return await response.json();
  }

  // RECEIVABLES
  async getReceivablesDashboard() {
    const response = await this.request('/receivables/dashboard');
    return await response.json();
  }

  async getReceivablesInvoices(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/receivables/invoices${queryString}`);
    return await response.json();
  }

  async createReceivablesInvoice(invoiceData: any) {
    const response = await this.request('/receivables/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
    return await response.json();
  }

  async updateReceivablesInvoice(id: string, invoiceData: any) {
    const response = await this.request(`/receivables/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
    return await response.json();
  }

  async deleteReceivablesInvoice(id: string) {
    const response = await this.request(`/receivables/invoices/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  // PUBLICATIONS
  async getPublications(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/publications${queryString}`);
    return await response.json();
  }

  async getPublicationById(id: string) {
    const response = await this.request(`/publications/${id}`);
    return await response.json();
  }

  async updatePublicationStatus(id: string, status: string, responsavel?: string) {
    const response = await this.request(`/publications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, responsavel }),
    });
    return await response.json();
  }

  async loadPublications() {
    const response = await this.request('/publications/load', {
      method: 'POST',
    });
    return await response.json();
  }

  async searchProcesses(oabNumber: string, oabState: string) {
    const response = await this.request(`/publications/search/processes?oabNumber=${oabNumber}&oabState=${oabState}`);
    return await response.json();
  }

  // NOTIFICATIONS
  async getNotifications(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request(`/notifications${queryString}`);
    return await response.json();
  }

  async getUnreadCount() {
    const response = await this.request('/notifications/unread-count');
    return await response.json();
  }

  async markNotificationAsRead(id: string) {
    const response = await this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
    return await response.json();
  }

  async markAllNotificationsAsRead() {
    const response = await this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
    return await response.json();
  }

  async deleteNotification(id: string) {
    const response = await this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  }
}

export const apiService = new ApiService();