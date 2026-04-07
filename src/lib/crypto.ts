import encryptedPayload from './encrypted-key.json';

const fromBase64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
};

export async function decryptApiKey(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const salt = fromBase64(encryptedPayload.salt);
  const iv = fromBase64(encryptedPayload.iv);
  const ciphertext = fromBase64(encryptedPayload.ciphertext);

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    ciphertext,
  );

  return decoder.decode(decrypted);
}

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`,
    );
    return res.ok;
  } catch {
    return false;
  }
}
