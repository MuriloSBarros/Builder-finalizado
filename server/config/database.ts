import { createClient } from '@supabase/supabase-js';

export class DatabaseManager {
  private supabase: any;
  private isInitialized = false;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase configuration missing. Server will start but database features will be limited.');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });

    console.log('✅ Supabase client initialized');
  }

  async initializeDatabase() {
    if (!this.supabase) {
      console.log('⚠️ Skipping database initialization - Supabase not configured');
      return;
    }

    try {
      console.log('🔧 Verificando conexão com Supabase...');
      
      // Test connection
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') {
        console.log('⚠️ Database tables may need to be created via Supabase migrations');
      } else {
        console.log('✅ Supabase connection successful');
      }

      this.isInitialized = true;
    } catch (error: any) {
      console.error('❌ Erro ao conectar com Supabase:', error.message);
      console.log('⚠️ Continuando sem inicialização do banco...');
    }
  }

  // Tenant-aware query method
  async query(table: string, options: any = {}) {
    if (!this.supabase) {
      throw new Error('Database not configured');
    }

    try {
      let query = this.supabase.from(table);

      // Apply filters
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.filter(key, 'eq', value);
        });
      }

      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return { rows: data || [] };
    } catch (error: any) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Insert method
  async insert(table: string, data: any) {
    if (!this.supabase) {
      throw new Error('Database not configured');
    }

    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return result;
  }

  // Update method
  async update(table: string, id: string, data: any) {
    if (!this.supabase) {
      throw new Error('Database not configured');
    }

    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return result;
  }

  // Delete method
  async delete(table: string, id: string) {
    if (!this.supabase) {
      throw new Error('Database not configured');
    }

    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  // Get Supabase client for direct access
  getSupabaseClient() {
    return this.supabase;
  }

  // Tenant connection wrapper
  getTenantConnection(tenantId: string) {
    return {
      query: async (table: string, options: any = {}) => {
        return this.query(table, {
          ...options,
          eq: { ...options.eq, tenant_id: tenantId }
        });
      },
      insert: async (table: string, data: any) => {
        return this.insert(table, { ...data, tenant_id: tenantId });
      },
      update: async (table: string, id: string, data: any) => {
        return this.update(table, id, data);
      },
      delete: async (table: string, id: string) => {
        return this.delete(table, id);
      }
    };
  }

  async close() {
    // Supabase client doesn't need explicit closing
    console.log('✅ Database connection closed');
  }
}

export const db = new DatabaseManager();