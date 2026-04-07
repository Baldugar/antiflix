import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { WatchStatus } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyBoWTbKnsZLVaVd1rZ_uBLdAeO1hQNUtAA",
  authDomain: "antiflix-24fc3.firebaseapp.com",
  projectId: "antiflix-24fc3",
  storageBucket: "antiflix-24fc3.firebasestorage.app",
  messagingSenderId: "147439009255",
  appId: "1:147439009255:web:c8ece12da76a2b49e11142",
};

const hasConfig = true;

const app = hasConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

// --- Sync API ---

type WatchMapData = Record<string, WatchStatus>;

function mapToRecord(map: Map<number, WatchStatus>): WatchMapData {
  const record: WatchMapData = {};
  for (const [id, status] of map) {
    record[String(id)] = status;
  }
  return record;
}

function recordToMap(record: WatchMapData): Map<number, WatchStatus> {
  const map = new Map<number, WatchStatus>();
  for (const [id, status] of Object.entries(record)) {
    map.set(Number(id), status as WatchStatus);
  }
  return map;
}

export async function loadWatchMap(username: string): Promise<Map<number, WatchStatus> | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', username));
    if (snap.exists()) {
      const data = snap.data() as { watchMap?: WatchMapData };
      return data.watchMap ? recordToMap(data.watchMap) : new Map();
    }
    return null;
  } catch {
    return null;
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveWatchMap(username: string, map: Map<number, WatchStatus>): void {
  if (!db) return;
  // Debounce 2s to batch rapid changes
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await setDoc(doc(db, 'users', username), {
        watchMap: mapToRecord(map),
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (e) {
      console.error('Firebase save error:', e);
    }
  }, 2000);
}

export function subscribeWatchMap(
  username: string,
  onUpdate: (map: Map<number, WatchStatus>) => void,
): (() => void) | null {
  if (!db) return null;
  return onSnapshot(doc(db, 'users', username), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as { watchMap?: WatchMapData };
      if (data.watchMap) {
        onUpdate(recordToMap(data.watchMap));
      }
    }
  });
}

export function isFirebaseConfigured(): boolean {
  return hasConfig;
}
