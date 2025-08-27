
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
  } catch (e) {
    // ignore invalid token for optional
  }
  next();
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('_id email role');
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = { id: String(user._id), email: user.email, role: user.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
