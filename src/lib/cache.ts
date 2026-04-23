const TTL_24H = 24 * 60 * 60 * 1000;
const DB_NAME = 'antiflix';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

// ─── IndexedDB ──────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function idbGet<T>(key: string): Promise<T | null> {
  return openDB().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      }),
  ).catch(() => null);
}

function idbSet<T>(key: string, value: T): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => resolve(undefined);
      }),
  ).catch(() => undefined);
}

function idbDelete(key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => resolve(undefined);
      }),
  ).catch(() => undefined);
}

function idbClear(): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => resolve(undefined);
      }),
  ).catch(() => undefined);
}

// ─── Async cache (IndexedDB) — for large data ──────────────

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = await idbGet<CacheEntry<T>>(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_24H) {
    idbDelete(key);
    return null;
  }
  return entry.data;
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  await idbSet<CacheEntry<T>>(key, { data, ts: Date.now() });
}

export async function cacheGetRaw<T>(key: string): Promise<T | null> {
  return idbGet<T>(key);
}

export async function cacheSetRaw<T>(key: string, data: T): Promise<void> {
  await idbSet(key, data);
}

export async function cacheDelete(key: string): Promise<void> {
  await idbDelete(key);
}

// ─── Sync helpers (localStorage) — for tiny data ───────────

export function localGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function localSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── Clear all cached data ─────────────────────────────────

export async function clearAllCache(): Promise<void> {
  await idbClear();
}
