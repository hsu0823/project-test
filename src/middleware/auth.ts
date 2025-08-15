//JWT驗證
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing Authorization Bearer token' });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = { sub: payload.sub };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}