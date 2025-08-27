/*
  # Create Admin Schema and Tables

  1. Admin Schema
    - `tenants` - Tenant management
    - `tenant_migrations` - Migration tracking
    - `system_logs` - System-wide logs

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create admin schema
CREATE SCHEMA IF NOT EXISTS admin;

-- Tenants table
CREATE TABLE IF NOT EXISTS admin.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  admin_email VARCHAR UNIQUE NOT NULL,
  oab_number VARCHAR,
  schema_name VARCHAR UNIQUE,
  plan_type VARCHAR DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant migrations tracking
CREATE TABLE IF NOT EXISTS admin.tenant_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES admin.tenants(id),
  migration_name VARCHAR NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, migration_name)
);

-- System logs
CREATE TABLE IF NOT EXISTS admin.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  level VARCHAR NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.tenant_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.system_logs ENABLE ROW LEVEL SECURITY;

-- Create demo tenant
INSERT INTO admin.tenants (name, admin_email, oab_number, is_active)
VALUES ('Escritório Silva & Associados', 'admin@escritorio.com', '123456/SP', true)
ON CONFLICT (admin_email) DO NOTHING;