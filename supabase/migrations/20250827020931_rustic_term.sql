/*
  # Create Tenant Tables

  1. Core Tables
    - `users` - Tenant users with account types
    - `clients` - CRM clients
    - `projects` - Project management
    - `tasks` - Task management
    - `cash_flow` - Financial transactions
    - `billing_documents` - Billing documents
    - `notifications` - System notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  avatar_url VARCHAR,
  account_type VARCHAR CHECK (account_type IN ('simples', 'composta', 'gerencial')) DEFAULT 'simples',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  organization VARCHAR,
  email VARCHAR,
  mobile VARCHAR,
  country VARCHAR DEFAULT 'BR',
  state VARCHAR,
  address TEXT,
  city VARCHAR,
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
  tags TEXT[] DEFAULT '{}',
  status VARCHAR DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  client_name VARCHAR NOT NULL,
  client_id UUID REFERENCES clients(id),
  organization VARCHAR,
  address TEXT,
  budget DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR DEFAULT 'BRL',
  status VARCHAR CHECK (status IN ('contacted', 'proposal', 'won', 'lost')) DEFAULT 'contacted',
  start_date DATE,
  due_date DATE,
  priority VARCHAR CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')) DEFAULT 'not_started',
  priority VARCHAR CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to VARCHAR NOT NULL,
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash flow table
CREATE TABLE IF NOT EXISTS cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category_id VARCHAR NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR,
  status VARCHAR CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'confirmed',
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
  created_by VARCHAR,
  last_modified_by VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing documents table
CREATE TABLE IF NOT EXISTS billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR CHECK (type IN ('estimate', 'invoice')) NOT NULL,
  number VARCHAR NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  sender_id VARCHAR,
  sender_name VARCHAR,
  receiver_id VARCHAR,
  receiver_name VARCHAR,
  title VARCHAR NOT NULL,
  description TEXT,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'fixed',
  fee DECIMAL(15,2) DEFAULT 0,
  fee_type VARCHAR CHECK (fee_type IN ('percentage', 'fixed')) DEFAULT 'fixed',
  tax DECIMAL(15,2) DEFAULT 0,
  tax_type VARCHAR CHECK (tax_type IN ('percentage', 'fixed')) DEFAULT 'fixed',
  total DECIMAL(15,2) NOT NULL,
  currency VARCHAR DEFAULT 'BRL',
  status VARCHAR DEFAULT 'DRAFT',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by VARCHAR,
  last_modified_by VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing items table
CREATE TABLE IF NOT EXISTS billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES billing_documents(id) ON DELETE CASCADE,
  description VARCHAR NOT NULL,
  quantity INTEGER DEFAULT 1,
  rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  tax DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR NOT NULL,
  details TEXT,
  action_data JSONB,
  read BOOLEAN DEFAULT false,
  created_by VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receivables invoices table
CREATE TABLE IF NOT EXISTS receivables_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id),
  numero_fatura VARCHAR NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  descricao TEXT,
  servico_prestado VARCHAR,
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status VARCHAR CHECK (status IN ('nova', 'pendente', 'atribuida', 'paga', 'vencida', 'cancelada', 'processando')) DEFAULT 'nova',
  tentativas_cobranca INTEGER DEFAULT 0,
  stripe_invoice_id VARCHAR,
  stripe_customer_id VARCHAR,
  link_pagamento TEXT,
  recorrente BOOLEAN DEFAULT false,
  intervalo_dias INTEGER DEFAULT 30,
  proxima_fatura_data DATE,
  urgencia VARCHAR CHECK (urgencia IN ('baixa', 'media', 'alta')) DEFAULT 'media',
  cliente_nome VARCHAR,
  cliente_email VARCHAR,
  cliente_telefone VARCHAR,
  criado_por VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Publications table (isolated by user)
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL, -- Isolation by user
  data_publicacao DATE NOT NULL,
  processo VARCHAR NOT NULL,
  diario VARCHAR NOT NULL,
  vara_comarca VARCHAR NOT NULL,
  nome_pesquisado VARCHAR NOT NULL,
  status VARCHAR CHECK (status IN ('nova', 'pendente', 'atribuida', 'finalizada', 'descartada')) DEFAULT 'nova',
  conteudo TEXT,
  observacoes TEXT,
  responsavel VARCHAR,
  numero_processo VARCHAR,
  cliente VARCHAR,
  urgencia VARCHAR CHECK (urgencia IN ('baixa', 'media', 'alta')) DEFAULT 'media',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project contacts table
CREATE TABLE IF NOT EXISTS project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  role VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can access own tenant data" ON users
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Clients tenant isolation" ON clients
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Projects tenant isolation" ON projects
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tasks tenant isolation" ON tasks
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Subtasks access through tasks" ON subtasks
  FOR ALL USING (task_id IN (SELECT id FROM tasks WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Cash flow tenant isolation" ON cash_flow
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Billing documents tenant isolation" ON billing_documents
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Billing items access through documents" ON billing_items
  FOR ALL USING (document_id IN (SELECT id FROM billing_documents WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Notifications tenant isolation" ON notifications
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Receivables invoices tenant isolation" ON receivables_invoices
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Publications: USER isolation (not just tenant)
CREATE POLICY "Publications user isolation" ON publications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Project contacts access through projects" ON project_contacts
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_tenant_id ON cash_flow(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_documents_tenant_id ON billing_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receivables_invoices_tenant_id ON receivables_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_publications_user_id ON publications(user_id);