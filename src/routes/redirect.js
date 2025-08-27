
import express from 'express';
import Url from '../models/Url.js';
import Click from '../models/Click.js';
import UAParser from 'ua-parser-js';
import geoip from 'geoip-lite';

const router = express.Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });
    if (!url) return res.status(404).json({ error: 'Short code not found' });

    // Handle expiration
    if (url.expiresAt && url.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Short URL expired' });
    }

    // Track analytics
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    const ref = req.get('referer') || 'Direct';

    let country = 'Unknown';
    try {
      const geo = geoip.lookup(ip);
      if (geo && geo.country) country = geo.country;
    } catch (e) {
      // ignore geoip errors
    }

    await Click.create({
      url: url._id,
      country,
      referrer: ref,
      userAgent: ua,
      ip
    });

    url.clickCount += 1;
    await url.save();

    return res.redirect(url.originalUrl);
  } catch (e) { next(e); }
});

export default router;
