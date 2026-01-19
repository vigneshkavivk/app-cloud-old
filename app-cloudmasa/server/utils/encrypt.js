// server/utils/encrypt.js
import crypto from 'crypto';

// 🔑 MUST be 32 bytes (256 bits) — set via .env in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : Buffer.from('a32characterlongsecretkey123456789012', 'utf8'); // 32-byte fallback

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 ASCII)');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size is 96 bits (12 bytes)

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {{ iv: string, content: string, authTag: string }} Hex-encoded
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    content: encrypted,
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts using AES-256-GCM
 * @param {{ iv: string, content: string, authTag: string }} encryptedData
 * @returns {string} Decrypted plaintext
 * @throws {Error} If authentication fails (tampering detected)
 */
export function decrypt(encryptedData) {
  const { iv, content, authTag } = encryptedData;
  
  if (!iv || !content || !authTag) {    
    throw new Error('Missing iv, content, or authTag in encrypted data');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
