import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, UserEntity } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'hydrowatch_super_secure_jwt_secret_key_2026';
const TOKEN_EXPIRY = '24h';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: 'resident' | 'utilityAnalyst';
  name: string;
  propertyId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(user: UserEntity): string {
  const payload: AuthUserPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    propertyId: user.propertyId,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function authenticateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header with Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRole(allowedRoles: Array<'resident' | 'utilityAnalyst'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated user' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}

export function requirePropertyAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated user' });
    return;
  }

  // Utility analysts have system-wide access to all properties
  if (req.user.role === 'utilityAnalyst') {
    next();
    return;
  }

  // Residents can only access their assigned property
  const requestedPropertyId =
    req.params.propertyId || req.body.propertyId || req.query.propertyId;

  if (!requestedPropertyId || req.user.propertyId !== requestedPropertyId) {
    res.status(403).json({
      error: `Access forbidden: Residents are only permitted to access their own authorized property (${req.user.propertyId || 'none assigned'}).`,
    });
    return;
  }

  next();
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
