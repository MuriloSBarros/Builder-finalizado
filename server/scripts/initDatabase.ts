import { db } from '../config/database';

async function initializeDatabase() {
  try {
    console.log('🔧 Inicializando banco de dados...');

    // Criar schema admin se não existir
    await db.query(`
      CREATE SCHEMA IF NOT EXISTS admin;
    `);

    // Criar tabela de tenants
    await db.query(`
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Criar tabela de migrations por tenant
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin.tenant_migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES admin.tenants(id),
        migration_name VARCHAR NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, migration_name)
      );
    `);

    // Criar tabela de logs do sistema
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin.system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        level VARCHAR NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // Criar tenant de demonstração se não existir
    const demoTenant = await db.query(`
      SELECT id FROM admin.tenants WHERE admin_email = 'admin@escritorio.com'
    `);

    if (demoTenant.rows.length === 0) {
      console.log('📝 Criando tenant de demonstração...');
      
      const tenantResult = await db.query(`
        INSERT INTO admin.tenants (name, admin_email, oab_number, is_active)
        VALUES ('Escritório Silva & Associados', 'admin@escritorio.com', '123456/SP', true)
        RETURNING id
      `);

      const tenantId = tenantResult.rows[0].id;
      
      // Criar schema do tenant
      await db.createTenantSchema(tenantId);

      // Criar usuário administrador
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('123456', 12);
      
      const tenantDb = db.getTenantConnection(tenantId);
      await tenantDb.query(`
        INSERT INTO \${schema}.users (email, password_hash, name, account_type, is_active)
        VALUES ('admin@escritorio.com', $1, 'Dr. Advogado', 'gerencial', true)
      `, [passwordHash]);

      console.log('✅ Tenant de demonstração criado com sucesso!');
      console.log('📧 Email: admin@escritorio.com');
      console.log('🔑 Senha: 123456');
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Inicialização concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na inicialização:', error);
      process.exit(1);
    });
}

export { initializeDatabase };