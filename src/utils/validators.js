
import validator from 'validator';

export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Allow http(s) only
  return validator.isURL(trimmed, { protocols: ['http','https'], require_protocol: true });
}
