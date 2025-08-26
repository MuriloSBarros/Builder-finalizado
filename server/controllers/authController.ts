import { Request, Response } from 'express';
import { authService } from '../config/auth';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, firmName, oabNumber } = req.body;

      // Validar dados obrigatórios
      if (!name || !email || !password || !firmName || !oabNumber) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios' 
        });
      }

      // Verificar se email já existe
      const existingUser = await db.query(
        'SELECT id FROM admin.tenants WHERE admin_email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Email já cadastrado' 
        });
      }

      // Criar tenant
      const tenantId = uuidv4();
      const tenantResult = await db.query(`
        INSERT INTO admin.tenants (id, name, admin_email, oab_number, is_active, created_at)
        VALUES ($1, $2, $3, $4, true, NOW())
        RETURNING *
      `, [tenantId, firmName, email, oabNumber]);

      // Criar schema do tenant
      await db.createTenantSchema(tenantId);

      // Hash da senha
      const passwordHash = await authService.hashPassword(password);

      // Criar usuário administrador no schema do tenant
      const tenantDb = db.getTenantConnection(tenantId);
      const userResult = await tenantDb.query(`
        INSERT INTO \${schema}.users (
          email, password_hash, name, account_type, is_active, created_at
        ) VALUES ($1, $2, $3, 'gerencial', true, NOW())
        RETURNING id, email, name, account_type
      `, [email, passwordHash, name]);

      const user = userResult.rows[0];

      // Gerar tokens
      const tokens = authService.generateTokens({
        userId: user.id,
        tenantId: tenantId,
        accountType: user.account_type,
        email: user.email,
        name: user.name,
      });

      // Salvar refresh token
      const refreshTokenHash = await authService.hashPassword(tokens.refreshToken);
      await tenantDb.query(`
        INSERT INTO \${schema}.refresh_tokens (user_id, token_hash, expires_at, is_active)
        VALUES ($1, $2, NOW() + INTERVAL '7 days', true)
      `, [user.id, refreshTokenHash]);

      res.status(201).json({
        message: 'Conta criada com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountType: user.account_type,
        },
        tenant: {
          id: tenantId,
          name: firmName,
        },
        tokens,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      // Buscar tenant pelo email do admin
      const tenantResult = await db.query(
        'SELECT id, name FROM admin.tenants WHERE admin_email = $1 AND is_active = true',
        [email]
      );

      if (tenantResult.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const tenant = tenantResult.rows[0];
      const tenantDb = db.getTenantConnection(tenant.id);

      // Buscar usuário no schema do tenant
      const userResult = await tenantDb.query(`
        SELECT id, email, password_hash, name, account_type, is_active
        FROM \${schema}.users 
        WHERE email = $1
      `, [email]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Conta desativada' });
      }

      // Verificar senha
      const isValidPassword = await authService.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Atualizar último login
      await tenantDb.query(`
        UPDATE \${schema}.users 
        SET last_login = NOW() 
        WHERE id = $1
      `, [user.id]);

      // Gerar tokens
      const tokens = authService.generateTokens({
        userId: user.id,
        tenantId: tenant.id,
        accountType: user.account_type,
        email: user.email,
        name: user.name,
      });

      // Salvar refresh token
      const refreshTokenHash = await authService.hashPassword(tokens.refreshToken);
      await tenantDb.query(`
        INSERT INTO \${schema}.refresh_tokens (user_id, token_hash, expires_at, is_active)
        VALUES ($1, $2, NOW() + INTERVAL '7 days', true)
      `, [user.id, refreshTokenHash]);

      res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountType: user.account_type,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token necessário' });
      }

      // Verificar refresh token
      const decoded = await authService.verifyRefreshToken(refreshToken);

      // Buscar tenant do usuário - precisa buscar em todos os tenants
      const tenantResult = await db.query(`
        SELECT t.id, t.name 
        FROM admin.tenants t
        WHERE t.is_active = true
      `);

      let user = null;
      let tenant = null;

      for (const t of tenantResult.rows) {
        try {
          const tenantDb = db.getTenantConnection(t.id);
          const userResult = await tenantDb.query(`
            SELECT id, email, name, account_type, is_active
            FROM \${schema}.users 
            WHERE id = $1 AND is_active = true
          `, [decoded.userId]);

          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            tenant = t;
            break;
          }
        } catch (error) {
          // Schema pode não existir, continuar procurando
          continue;
        }
      }

      if (!user || !tenant) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const tenantDb = db.getTenantConnection(tenant.id);

      // Verificar se refresh token existe no banco
      const storedTokens = await tenantDb.query(`
        SELECT id, token_hash FROM \${schema}.refresh_tokens 
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
      `, [decoded.userId]);

      let validToken = null;
      for (const stored of storedTokens.rows) {
        const isValid = await authService.verifyPassword(refreshToken, stored.token_hash);
        if (isValid) {
          validToken = stored;
          break;
        }
      }

      if (!validToken) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }

      // Invalidar o refresh token usado (rotação)
      await tenantDb.query(`
        UPDATE \${schema}.refresh_tokens 
        SET is_active = false 
        WHERE id = $1
      `, [validToken.id]);

      // Gerar novos tokens
      const newTokens = authService.generateTokens({
        userId: user.id,
        tenantId: tenant.id,
        accountType: user.account_type,
        email: user.email,
        name: user.name,
      });

      // Salvar novo refresh token
      const newRefreshTokenHash = await authService.hashPassword(newTokens.refreshToken);
      await tenantDb.query(`
        INSERT INTO \${schema}.refresh_tokens (user_id, token_hash, expires_at, is_active)
        VALUES ($1, $2, NOW() + INTERVAL '7 days', true)
      `, [user.id, newRefreshTokenHash]);

      res.json({
        message: 'Token renovado com sucesso',
        tokens: newTokens,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Refresh token inválido' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const authHeader = req.headers['authorization'];
      const accessToken = authHeader && authHeader.split(' ')[1];

      if (accessToken) {
        try {
          const decoded = await authService.verifyAccessToken(accessToken);
          const tenantDb = db.getTenantConnection(decoded.tenantId);

          // Invalidar todos os refresh tokens do usuário
          await tenantDb.query(`
            UPDATE \${schema}.refresh_tokens 
            SET is_active = false 
            WHERE user_id = $1
          `, [decoded.userId]);
        } catch (error) {
          // Token pode estar expirado, ignorar erro
        }
      }

      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Logout error:', error);
      res.json({ message: 'Logout realizado com sucesso' });
    }
  }
}

export const authController = new AuthController();