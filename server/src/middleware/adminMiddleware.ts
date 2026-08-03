import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

/**
 * Confirms admin access from the current database role rather than trusting
 * the JWT claim alone, so demotions take effect before access-token expiry.
 */
export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const user = await User.findById(req.user.userId).select('role status');
    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.user.role = user.role;
    next();
  } catch {
    res.status(500).json({ error: 'Failed to authorize admin access' });
  }
}
