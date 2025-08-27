
import { customAlphabet } from 'nanoid';

// 62-char alphabet for compact codes
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8);

export function generateShortCode() {
  return nanoid();
}
