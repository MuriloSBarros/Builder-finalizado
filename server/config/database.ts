import { Pool } from 'pg';

export class DatabaseManager {
  private pool: Pool;
  private tenantConnections: Map<string, any> = new Map();

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.warn('Slow query detected:', { text, duration, params });
      }
      
      return res;
    } catch (error) {
      console.error('Database query error:', { text, params, error: error.message });
      throw error;
    }
  }

  async createTenantSchema(tenantId: string) {
    const schemaName = `tenant_${tenantId.replace(/-/g, '')}`;
    
    try {
      await this.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Criar todas as tabelas do tenant
      await this.query(`
        -- Users table
        CREATE TABLE IF NOT EXISTS "${schemaName}".users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR UNIQUE NOT NULL,
          password_hash VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          phone VARCHAR,
          account_type VARCHAR CHECK (account_type IN ('simples', 'composta', 'gerencial')) DEFAULT 'simples',
          is_active BOOLEAN DEFAULT true,
          must_change_password BOOLEAN DEFAULT false,
          last_login TIMESTAMP,
          avatar_url VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Clients table
        CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          organization VARCHAR,
          email VARCHAR,
          mobile VARCHAR NOT NULL,
          country VARCHAR NOT NULL DEFAULT 'BR',
          state VARCHAR NOT NULL,
          address VARCHAR,
          city VARCHAR NOT NULL,
          zip_code VARCHAR,
          budget DECIMAL(15,2) DEFAULT 0,
          currency VARCHAR DEFAULT 'BRL',
          level VARCHAR,
          description TEXT,
          cpf VARCHAR,
          rg VARCHAR,
          pis VARCHAR,
          cei VARCHAR,
          professional_title VARCHAR,
          marital_status VARCHAR,
          birth_date DATE,
          inss_status VARCHAR,
          amount_paid DECIMAL(15,2) DEFAULT 0,
          referred_by VARCHAR,
          registered_by VARCHAR,
          tags TEXT[],
          status VARCHAR DEFAULT 'active',
          created_by UUID REFERENCES "${schemaName}".users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS "${schemaName}".projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR NOT NULL,
          description TEXT,
          client_name VARCHAR NOT NULL,
          client_id UUID REFERENCES "${schemaName}".clients(id),
          organization VARCHAR,
          address VARCHAR,
          budget DECIMAL(15,2) DEFAULT 0,
          currency VARCHAR DEFAULT 'BRL',
          status VARCHAR CHECK (status IN ('contacted', 'proposal', 'won', 'lost')) DEFAULT 'contacted',
          start_date DATE NOT NULL,
          due_date DATE NOT NULL,
          priority VARCHAR CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          tags TEXT[],
          assigned_to TEXT[],
          notes TEXT,
          created_by VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Project contacts table
        CREATE TABLE IF NOT EXISTS "${schemaName}".project_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES "${schemaName}".projects(id) ON DELETE CASCADE,
          name VARCHAR NOT NULL,
          email VARCHAR NOT NULL,
          phone VARCHAR NOT NULL,
          role VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status VARCHAR CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')) DEFAULT 'not_started',
          priority VARCHAR CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
          assigned_to VARCHAR NOT NULL,
          project_id UUID REFERENCES "${schemaName}".projects(id),
          client_id UUID REFERENCES "${schemaName}".clients(id),
          estimated_hours DECIMAL(5,2) DEFAULT 0,
          actual_hours DECIMAL(5,2) DEFAULT 0,
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          tags TEXT[],
          notes TEXT,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Subtasks table
        CREATE TABLE IF NOT EXISTS "${schemaName}".subtasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID REFERENCES "${schemaName}".tasks(id) ON DELETE CASCADE,
          title VARCHAR NOT NULL,
          completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Cash flow table
        CREATE TABLE IF NOT EXISTS "${schemaName}".cash_flow (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR CHECK (type IN ('income', 'expense')) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          category_id VARCHAR NOT NULL,
          description VARCHAR NOT NULL,
          date DATE NOT NULL,
          payment_method VARCHAR,
          status VARCHAR CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'confirmed',
          project_id UUID REFERENCES "${schemaName}".projects(id),
          client_id UUID REFERENCES "${schemaName}".clients(id),
          tags TEXT[],
          notes TEXT,
          is_recurring BOOLEAN DEFAULT false,
          recurring_frequency VARCHAR CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
          created_by VARCHAR,
          last_modified_by VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Billing documents table
        CREATE TABLE IF NOT EXISTS "${schemaName}".billing_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR CHECK (type IN ('estimate', 'invoice')) NOT NULL,
          number VARCHAR UNIQUE NOT NULL,
          date DATE NOT NULL,
          due_date DATE NOT NULL,
          sender_id VARCHAR NOT NULL,
          sender_name VARCHAR NOT NULL,
          receiver_id VARCHAR NOT NULL,
          receiver_name VARCHAR NOT NULL,
          title VARCHAR NOT NULL,
          description TEXT,
          subtotal DECIMAL(15,2) NOT NULL,
          discount DECIMAL(15,2) DEFAULT 0,
          discount_type VARCHAR CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'fixed',
          fee DECIMAL(15,2) DEFAULT 0,
          fee_type VARCHAR CHECK (fee_type IN ('percentage', 'fixed')) DEFAULT 'fixed',
          tax DECIMAL(15,2) DEFAULT 0,
          tax_type VARCHAR CHECK (tax_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
          total DECIMAL(15,2) NOT NULL,
          currency VARCHAR DEFAULT 'BRL',
          status VARCHAR NOT NULL,
          tags TEXT[],
          notes TEXT,
          created_by VARCHAR,
          last_modified_by VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Billing items table
        CREATE TABLE IF NOT EXISTS "${schemaName}".billing_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID REFERENCES "${schemaName}".billing_documents(id) ON DELETE CASCADE,
          description VARCHAR NOT NULL,
          quantity INTEGER NOT NULL,
          rate DECIMAL(15,2) NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          tax DECIMAL(5,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Receivables invoices table
        CREATE TABLE IF NOT EXISTS "${schemaName}".receivables_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID REFERENCES "${schemaName}".clients(id),
          numero_fatura VARCHAR UNIQUE NOT NULL,
          valor DECIMAL(15,2) NOT NULL,
          descricao TEXT NOT NULL,
          servico_prestado VARCHAR NOT NULL,
          data_emissao DATE NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento TIMESTAMP,
          status VARCHAR CHECK (status IN ('nova', 'pendente', 'atribuida', 'paga', 'vencida', 'cancelada', 'processando')) DEFAULT 'nova',
          tentativas_cobranca INTEGER DEFAULT 0,
          stripe_invoice_id VARCHAR,
          stripe_customer_id VARCHAR,
          stripe_payment_intent_id VARCHAR,
          link_pagamento TEXT,
          webhook_n8n_id VARCHAR,
          ultima_notificacao TIMESTAMP,
          proxima_notificacao TIMESTAMP,
          recorrente BOOLEAN DEFAULT false,
          intervalo_dias INTEGER DEFAULT 30,
          proxima_fatura_data DATE,
          urgencia VARCHAR CHECK (urgencia IN ('baixa', 'media', 'alta')) DEFAULT 'media',
          criado_por VARCHAR,
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Publications table (isolado por usuário)
        CREATE TABLE IF NOT EXISTS "${schemaName}".publications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES "${schemaName}".users(id),
          data_publicacao DATE NOT NULL,
          processo VARCHAR NOT NULL,
          diario VARCHAR NOT NULL,
          vara_comarca VARCHAR NOT NULL,
          nome_pesquisado VARCHAR NOT NULL,
          status VARCHAR CHECK (status IN ('nova', 'pendente', 'atribuida', 'finalizada', 'descartada')) DEFAULT 'nova',
          conteudo TEXT,
          observacoes TEXT,
          responsavel VARCHAR,
          urgencia VARCHAR CHECK (urgencia IN ('baixa', 'media', 'alta')) DEFAULT 'media',
          numero_processo VARCHAR,
          cliente VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Audit log table
        CREATE TABLE IF NOT EXISTS "${schemaName}".audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES "${schemaName}".users(id),
          table_name VARCHAR NOT NULL,
          record_id UUID,
          operation VARCHAR CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')) NOT NULL,
          old_data JSONB,
          new_data JSONB,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        );

        -- Notifications table
        CREATE TABLE IF NOT EXISTS "${schemaName}".notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES "${schemaName}".users(id),
          type VARCHAR NOT NULL,
          title VARCHAR NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT false,
          created_by VARCHAR,
          details TEXT,
          category VARCHAR,
          action_data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- File attachments table
        CREATE TABLE IF NOT EXISTS "${schemaName}".file_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          module VARCHAR NOT NULL,
          entity_id UUID NOT NULL,
          filename VARCHAR NOT NULL,
          original_name VARCHAR NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR NOT NULL,
          s3_url VARCHAR,
          s3_key VARCHAR,
          uploaded_by UUID REFERENCES "${schemaName}".users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Refresh tokens table
        CREATE TABLE IF NOT EXISTS "${schemaName}".refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES "${schemaName}".users(id),
          token_hash VARCHAR NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Criar índices para performance
        CREATE INDEX IF NOT EXISTS idx_clients_created_by ON "${schemaName}".clients(created_by);
        CREATE INDEX IF NOT EXISTS idx_projects_client_id ON "${schemaName}".projects(client_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON "${schemaName}".tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON "${schemaName}".cash_flow(date);
        CREATE INDEX IF NOT EXISTS idx_publications_user_id ON "${schemaName}".publications(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON "${schemaName}".audit_log(timestamp);
      `);

      -- Criar função de auditoria
      await this.query(`
        CREATE OR REPLACE FUNCTION "${schemaName}".audit_trigger_function()
        RETURNS TRIGGER AS $trigger$
        BEGIN
          IF TG_OP = 'DELETE' THEN
            INSERT INTO "${schemaName}".audit_log (table_name, record_id, operation, old_data)
            VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
            RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO "${schemaName}".audit_log (table_name, record_id, operation, old_data, new_data)
            VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
            RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO "${schemaName}".audit_log (table_name, record_id, operation, new_data)
            VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
            RETURN NEW;
          END IF;
          RETURN NULL;
        END;
        $trigger$ LANGUAGE plpgsql;
      `);

      // Criar triggers de auditoria
      const tables = ['users', 'clients', 'projects', 'tasks', 'cash_flow', 'billing_documents', 'receivables_invoices'];
      for (const table of tables) {
        await this.query(`
          DROP TRIGGER IF EXISTS audit_${table}_trigger ON "${schemaName}".${table};
          CREATE TRIGGER audit_${table}_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "${schemaName}".${table}
            FOR EACH ROW EXECUTE FUNCTION "${schemaName}".audit_trigger_function();
        `);
      }

      console.log(`Schema ${schemaName} created successfully`);
    } catch (error) {
      console.error(`Error creating schema ${schemaName}:`, error);
      throw error;
    }
  }

  getTenantConnection(tenantId: string) {
    const schemaName = `tenant_${tenantId.replace(/-/g, '')}`;
    
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, {
        query: async (text: string, params?: any[]) => {
          const tenantSql = text.replace(/\${schema}/g, `"${schemaName}"`);
          return await this.query(tenantSql, params);
        },
        schema: schemaName
      });
    }
    
    return this.tenantConnections.get(tenantId);
  }

  async close() {
    await this.pool.end();
  }
}

export const db = new DatabaseManager();