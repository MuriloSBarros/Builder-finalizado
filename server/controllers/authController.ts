import { Request, Response } from 'express';
import { authService } from '../config/auth';
import { db } from '../config/database';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      // For demo purposes, use hardcoded credentials
      if (email === 'admin@escritorio.com' && password === '123456') {
        // Get demo tenant
        const { rows: tenants } = await db.query('admin.tenants', {
          eq: { admin_email: email }
        });

        if (tenants.length === 0) {
          return res.status(401).json({ error: 'Tenant não encontrado' });
        }

        const tenant = tenants[0];

        // Get user
        const { rows: users } = await db.query('users', {
          eq: { email, tenant_id: tenant.id }
        });

        if (users.length === 0) {
          return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const user = users[0];

        // Generate tokens
        const tokens = authService.generateTokens({
          userId: user.id,
          tenantId: tenant.id,
          accountType: user.account_type,
          email: user.email,
          name: user.name,
        });

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
      } else {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { name, email, password, firmName, oabNumber } = req.body;

      // Validate required fields
      if (!name || !email || !password || !firmName || !oabNumber) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios' 
        });
      }

      // Check if email already exists
      const { rows: existingTenants } = await db.query('admin.tenants', {
        eq: { admin_email: email }
      });

      if (existingTenants.length > 0) {
        return res.status(400).json({ 
          error: 'Email já cadastrado' 
        });
      }

      // Create tenant
      const tenant = await db.insert('admin.tenants', {
        name: firmName,
        admin_email: email,
        oab_number: oabNumber,
        is_active: true,
      });

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Create user
      const user = await db.insert('users', {
        tenant_id: tenant.id,
        email,
        password_hash: passwordHash,
        name,
        account_type: 'gerencial',
        is_active: true,
      });

      // Generate tokens
      const tokens = authService.generateTokens({
        userId: user.id,
        tenantId: tenant.id,
        accountType: user.account_type,
        email: user.email,
        name: user.name,
      });

      res.status(201).json({
        message: 'Conta criada com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountType: user.account_type,
        },
        tenant: {
          id: tenant.id,
          name: firmName,
        },
        tokens,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token necessário' });
      }

      // Verify refresh token
      const decoded = await authService.verifyRefreshToken(refreshToken);

      // Get user (simplified for demo)
      const { rows: users } = await db.query('users', {
        eq: { id: decoded.userId }
      });

      if (users.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const user = users[0];

      // Generate new tokens
      const newTokens = authService.generateTokens({
        userId: user.id,
        tenantId: user.tenant_id,
        accountType: user.account_type,
        email: user.email,
        name: user.name,
      });

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
      // In a full implementation, you would invalidate the refresh token
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Logout error:', error);
      res.json({ message: 'Logout realizado com sucesso' });
    }
  }
}

export const authController = new AuthController();