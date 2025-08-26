import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  accountType: 'simples' | 'composta' | 'gerencial';
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
  tenantId: string;
  db: any;
}

export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key',
    expiresIn: '15m',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: '7d',
  },
};

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateTokens(payload: JWTPayload) {
    const accessToken = jwt.sign(payload, jwtConfig.accessToken.secret, {
      expiresIn: jwtConfig.accessToken.expiresIn,
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      jwtConfig.refreshToken.secret,
      { expiresIn: jwtConfig.refreshToken.expiresIn }
    );

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    return jwt.verify(token, jwtConfig.accessToken.secret) as JWTPayload;
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    return jwt.verify(token, jwtConfig.refreshToken.secret) as { userId: string };
  }
}

export const authService = new AuthService();

// Middleware de autenticação
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = await authService.verifyAccessToken(token);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado', 
        code: 'TOKEN_EXPIRED' 
      });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware de validação de tipo de conta
export const requireAccountType = (allowedTypes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userAccountType = req.user.accountType;

    if (!allowedTypes.includes(userAccountType)) {
      return res.status(403).json({
        error: 'Acesso negado - tipo de conta insuficiente',
        required: allowedTypes,
        current: userAccountType,
      });
    }

    next();
  };
};

// Middleware de tenant
export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant não identificado' });
  }

  // Configurar conexão com schema específico do tenant
  req.db = global.db.getTenantConnection(tenantId);
  next();
};