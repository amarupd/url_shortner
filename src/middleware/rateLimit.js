
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
dotenv.config();

const windowMs = Number(process.env.WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.MAX_RETRIES || 5);


export const anonymousShortenLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    req.ip;
  },
  skip: (req) => !!req.user,
  message: { error: 'Too many requests, please try again later.' },
});
