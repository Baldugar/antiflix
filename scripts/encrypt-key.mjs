import { webcrypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [,, apiKey, password] = process.argv;
if (!apiKey || !password) {
  console.error('Usage: node scripts/encrypt-key.mjs <TMDB_API_KEY> <PASSWORD>');
  process.exit(1);
}

const encoder = new TextEncoder();
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));

const keyMaterial = await webcrypto.subtle.importKey(
  'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'],
);

const derivedKey = await webcrypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);

const encrypted = await webcrypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  derivedKey,
  encoder.encode(apiKey),
);

const toBase64 = (buf) => Buffer.from(buf).toString('base64');

const payload = {
  salt: toBase64(salt),
  iv: toBase64(iv),
  ciphertext: toBase64(encrypted),
};

const outPath = resolve(__dirname, '..', 'src', 'lib', 'encrypted-key.json');
writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`Encrypted key written to ${outPath}`);
