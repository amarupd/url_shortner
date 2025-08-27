
import express from 'express';
import Url from '../models/Url.js';
import Click from '../models/Click.js';
import { authOptional } from '../middleware/auth.js';
import { anonymousShortenLimiter } from '../middleware/rateLimit.js';
import { generateShortCode } from '../utils/shortCode.js';
import { isValidUrl } from '../utils/validators.js';
import QRCode from 'qrcode';

const router = express.Router();

function baseUrl() {
  return process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

// Create short URL (anonymous allowed, rate limited)
router.post('/', authOptional, anonymousShortenLimiter, async (req, res, next) => {
  try {
    const { originalUrl, expiresAt } = req.body;
    if (!isValidUrl(originalUrl)) return res.status(400).json({ error: 'Invalid URL. Use http(s)://' });

    const userId = req.user?.id || null;


    // Duplicate handling per user (null for anonymous)
    let existing = await Url.findOne({ originalUrl, user: userId });
    if (existing) {
      return res.status(200).json({ shortUrl: `${baseUrl()}/${existing.shortCode}`, code: existing.shortCode });
    }

    let code, conflict = true, tries = 0;
    while (conflict) {
      code = generateShortCode();
      const byCode = await Url.findOne({ shortCode: code });
      if (!byCode) conflict = false;
      if (++tries > 5) throw new Error('Failed to generate unique code');
    }

    const doc = await Url.create({
      originalUrl,
      shortCode: code,
      user: userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({ shortUrl: `${baseUrl()}/${doc.shortCode}`, code: doc.shortCode });
  } catch (e) { next(e); }
});

// Bulk shortening (optional extra)
router.post('/bulk', authOptional, anonymousShortenLimiter, async (req, res, next) => {
  try {
    const { urls } = req.body; // [{ originalUrl, expiresAt? }, ...]
    if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls array required' });
    const userId = req.user?.id || null;

    const results = [];
    for (const item of urls) {
      const originalUrl = item.originalUrl;
      const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
      if (!isValidUrl(originalUrl)) {
        results.push({ originalUrl, error: 'Invalid URL' });
        continue;
      }
      let existing = await Url.findOne({ originalUrl, user: userId });
      if (existing) {
        results.push({ originalUrl, code: existing.shortCode, shortUrl: `${baseUrl()}/${existing.shortCode}` });
        continue;
      }
      let code, conflict = true;
      while (conflict) {
        code = generateShortCode();
        const byCode = await Url.findOne({ shortCode: code });
        if (!byCode) conflict = false;
      }
      const doc = await Url.create({ originalUrl, shortCode: code, user: userId, expiresAt });
      results.push({ originalUrl, code: doc.shortCode, shortUrl: `${baseUrl()}/${doc.shortCode}` });
    }

    res.json({ results });
  } catch (e) { next(e); }
});

// Get analytics for a URL (auth optional but URL must exist)
router.get('/:code/analytics', async (req, res, next) => {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });
    if (!url) return res.status(404).json({ error: 'Short code not found' });

    const urlId = url._id;
    const now = new Date();

    // Daily (last 30 days), Weekly (last 12 weeks), Monthly (last 12 months)
    const daily = await Click.aggregate([
      { $match: { url: urlId, timestamp: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const weekly = await Click.aggregate([
      { $match: { url: urlId, timestamp: { $gte: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const monthly = await Click.aggregate([
      { $match: { url: urlId, timestamp: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const byCountry = await Click.aggregate([
      { $match: { url: urlId } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    const byReferrer = await Click.aggregate([
      { $match: { url: urlId } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      url: { originalUrl: url.originalUrl, shortCode: url.shortCode, createdAt: url.createdAt, clickCount: url.clickCount },
      clicks: { daily, weekly, monthly },
      countries: byCountry,
      referrers: byReferrer,
    });
  } catch (e) { next(e); }
});

// Generate QR code for short URL
router.get('/:code/qr', async (req, res, next) => {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });
    if (!url) return res.status(404).json({ error: 'Short code not found' });
    const text = `${baseUrl()}/${url.shortCode}`;
    const png = await QRCode.toBuffer(text, { type: 'png', width: 512, margin: 1 });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) { next(e); }
});

export default router;
