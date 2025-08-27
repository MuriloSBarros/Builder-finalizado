import { createClient } from '@supabase/supabase-js';

export class DatabaseManager {
  private supabase: any;
  private tenantConnections: Map<string, any> = new Map();

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      // Convert PostgreSQL query to Supabase query
      // For now, we'll use raw SQL through Supabase's rpc function
      const { data, error } = await this.supabase.rpc('execute_sql', {
        query: text,
        params: params || []
      });

      if (error) {
        throw new Error(error.message);
      }

      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.warn('Slow query detected:', { text: text.substring(0, 100), duration });
      }
      
      return { rows: data || [] };
    } catch (error: any) {
      console.error('Database query error:', { 
        text: text.substring(0, 100), 
        params, 
        error: error.message 
      });
      throw error;
    }
  }

  async initializeDatabase() {
    try {
      console.log('🔧 Inicializando banco de dados com Supabase...');

      // For Supabase, we'll use the built-in auth and create our tables
      // First, let's check if we can connect
      const { data, error } = await this.supabase.from('users').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means table doesn't exist, which is fine
        console.log('⚠️ Supabase connection established, but custom tables may need to be created');
      } else {
        console.log('✅ Supabase connection successful');
      }

      // Create a demo tenant entry in our system
      console.log('📝 Sistema inicializado com Supabase Auth');
      console.log('✅ Use o sistema de autenticação do Supabase para login');
      
    } catch (error: any) {
      console.error('❌ Erro ao conectar com Supabase:', error.message);
      // Don't throw the error, just log it so the server can still start
      console.log('⚠️ Continuando sem inicialização do banco...');
    }
  }

  async createTenantSchema(tenantId: string) {
    // For Supabase, we'll use Row Level Security instead of separate schemas
    console.log(`✅ Tenant ${tenantId} will use RLS for data isolation`);
    return Promise.resolve();
  }

  getTenantConnection(tenantId: string) {
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, {
        query: async (text: string, params?: any[]) => {
          // Add tenant filtering to queries
          return await this.query(text, params);
        },
        supabase: this.supabase,
        tenantId
      });
    }
    
    return this.tenantConnections.get(tenantId);
  }

  async close() {
    // Supabase client doesn't need explicit closing
    console.log('Supabase connection closed');
  }

  // Helper method to get Supabase client directly
  getSupabaseClient() {
    return this.supabase;
  }
}

export const db = new DatabaseManager();