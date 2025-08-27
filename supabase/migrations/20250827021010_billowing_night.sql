/*
  # Insert Demo Data

  1. Demo Tenant and User
  2. Sample Clients
  3. Sample Projects
  4. Sample Tasks
  5. Sample Transactions

  This provides initial data for testing and demonstration.
*/

-- Get demo tenant ID
DO $$
DECLARE
  demo_tenant_id UUID;
  demo_user_id UUID;
BEGIN
  -- Get demo tenant
  SELECT id INTO demo_tenant_id FROM admin.tenants WHERE admin_email = 'admin@escritorio.com';
  
  IF demo_tenant_id IS NOT NULL THEN
    -- Insert demo user
    INSERT INTO users (tenant_id, email, name, account_type, is_active)
    VALUES (demo_tenant_id, 'admin@escritorio.com', 'Dr. Advogado Silva', 'gerencial', true)
    ON CONFLICT (email) DO UPDATE SET
      tenant_id = demo_tenant_id,
      name = 'Dr. Advogado Silva',
      account_type = 'gerencial'
    RETURNING id INTO demo_user_id;

    -- Insert additional users
    INSERT INTO users (tenant_id, email, name, account_type, is_active) VALUES
    (demo_tenant_id, 'costa@escritorio.com', 'Dra. Costa (Financeiro)', 'composta', true),
    (demo_tenant_id, 'ana@escritorio.com', 'Ana (Atendimento)', 'simples', true)
    ON CONFLICT (email) DO NOTHING;

    -- Get demo user ID if not set
    IF demo_user_id IS NULL THEN
      SELECT id INTO demo_user_id FROM users WHERE email = 'admin@escritorio.com';
    END IF;

    -- Insert demo clients
    INSERT INTO clients (tenant_id, name, email, mobile, country, state, city, budget, currency, tags, created_by) VALUES
    (demo_tenant_id, 'Maria Silva Santos', 'maria@email.com', '(11) 99999-1234', 'BR', 'SP', 'São Paulo', 5000, 'BRL', ARRAY['Direito Civil', 'Cliente Premium'], demo_user_id),
    (demo_tenant_id, 'João Carlos Oliveira', 'joao@email.com', '(11) 88888-5678', 'BR', 'RJ', 'Rio de Janeiro', 8000, 'BRL', ARRAY['Direito Trabalhista'], demo_user_id),
    (demo_tenant_id, 'Tech Solutions LTDA', 'contato@techsolutions.com', '(11) 77777-9999', 'BR', 'SP', 'São Paulo', 15000, 'BRL', ARRAY['Direito Empresarial', 'Consultoria'], demo_user_id)
    ON CONFLICT DO NOTHING;

    -- Insert demo projects
    INSERT INTO projects (tenant_id, title, description, client_name, budget, currency, status, start_date, due_date, priority, progress, tags, created_by) VALUES
    (demo_tenant_id, 'Ação Previdenciária - Maria Silva', 'Revisão de aposentadoria negada pelo INSS', 'Maria Silva Santos', 5500, 'BRL', 'won', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '15 days', 'high', 85, ARRAY['Previdenciário', 'INSS'], demo_user_id),
    (demo_tenant_id, 'Consultoria Empresarial - Tech Solutions', 'Assessoria jurídica para expansão da empresa', 'Tech Solutions LTDA', 12000, 'BRL', 'proposal', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days', 'medium', 45, ARRAY['Empresarial', 'Consultoria'], demo_user_id)
    ON CONFLICT DO NOTHING;

    -- Insert demo tasks
    INSERT INTO tasks (tenant_id, title, description, start_date, end_date, status, priority, assigned_to, progress, tags, created_by) VALUES
    (demo_tenant_id, 'Revisar documentos previdenciários', 'Análise completa dos documentos do cliente', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'in_progress', 'high', 'Dr. Advogado Silva', 60, ARRAY['Documentos', 'Previdenciário'], demo_user_id),
    (demo_tenant_id, 'Elaborar contrato de prestação de serviços', 'Contrato personalizado para cliente empresarial', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '7 days', 'not_started', 'medium', 'Dra. Costa (Financeiro)', 0, ARRAY['Contratos', 'Empresarial'], demo_user_id)
    ON CONFLICT DO NOTHING;

    -- Insert demo cash flow transactions
    INSERT INTO cash_flow (tenant_id, type, amount, category_id, description, date, payment_method, status, created_by) VALUES
    (demo_tenant_id, 'income', 5500, 'honorarios', 'Honorários - Ação Previdenciária Maria Silva', CURRENT_DATE - INTERVAL '5 days', 'pix', 'confirmed', 'Dr. Advogado Silva'),
    (demo_tenant_id, 'income', 3200, 'consultorias', 'Consultoria Jurídica - Tech Solutions', CURRENT_DATE - INTERVAL '10 days', 'bank_transfer', 'confirmed', 'Dr. Advogado Silva'),
    (demo_tenant_id, 'expense', 2800, 'salarios', 'Salários equipe - Janeiro 2025', CURRENT_DATE - INTERVAL '15 days', 'bank_transfer', 'confirmed', 'Dra. Costa (Financeiro)'),
    (demo_tenant_id, 'expense', 1200, 'aluguel', 'Aluguel escritório - Janeiro 2025', CURRENT_DATE - INTERVAL '20 days', 'bank_transfer', 'confirmed', 'Dra. Costa (Financeiro)')
    ON CONFLICT DO NOTHING;

    -- Insert demo notifications
    INSERT INTO notifications (tenant_id, user_id, type, title, message, category, details, created_by) VALUES
    (demo_tenant_id, demo_user_id, 'info', 'Novo Cliente Cadastrado', 'Maria Silva Santos foi adicionada ao CRM', 'client', 'Cliente cadastrado com sucesso. Email: maria@email.com', 'Dr. Advogado Silva'),
    (demo_tenant_id, demo_user_id, 'success', 'Projeto Finalizado', 'Ação Previdenciária foi concluída com sucesso', 'project', 'Projeto concluído. Valor: R$ 5.500,00', 'Dr. Advogado Silva'),
    (demo_tenant_id, demo_user_id, 'warning', 'Tarefa Vencendo', 'Revisar documentos vence em 2 dias', 'task', 'Tarefa atribuída a Dr. Advogado Silva', 'Sistema')
    ON CONFLICT DO NOTHING;

  END IF;
END $$;