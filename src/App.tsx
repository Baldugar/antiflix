import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import AboutModal from './components/AboutModal'
import SettingsModal from './components/SettingsModal'
import PasswordGate from './components/PasswordGate'
import { fetchGenres, setApiKey } from './lib/tmdb'
import { localGet, localSet, clearAllCache } from './lib/cache'
import { loadWatchMap, saveWatchMap, subscribeWatchMap, isFirebaseConfigured } from './lib/firebase'
import type { WatchStatus } from './lib/types'

const Browse = lazy(() => import('./pages/Browse'))
const Moods = lazy(() => import('./pages/Moods'))

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (import.meta.env.VITE_TMDB_API_KEY) return true;
    const savedKey = localStorage.getItem('antiflix_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      return true;
    }
    return false;
  })

  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('antiflix_username') || 'local';
  })

  const handleAuthenticated = useCallback((apiKey: string, user: string) => {
    setApiKey(apiKey);
    setUsername(user);
    setAuthenticated(true);
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('antiflix_api_key');
    localStorage.removeItem('antiflix_username');
    setAuthenticated(false);
    window.location.reload();
  }, [])

  const [activeTab, setActiveTab] = useState<'browse' | 'moods' | 'about'>('browse')
  const [genres, setGenres] = useState<Map<number, string>>(new Map())

  const [watchMap, setWatchMap] = useState<Map<number, WatchStatus>>(() => {
    const saved = localGet<[number, WatchStatus][]>('antiflix_watchmap')
    if (saved) return new Map(saved)
    const oldWatched = localGet<number[]>('antiflix_watched')
    if (oldWatched) {
      const map = new Map<number, WatchStatus>()
      oldWatched.forEach(id => map.set(id, 'finished'))
      return map
    }
    return new Map()
  })

  const [region, setRegion] = useState<string>(() => {
    return localGet<string>('antiflix_region') ?? 'ES'
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  // Track whether a change is from Firebase (to avoid write-back loops)
  const fromRemoteRef = useRef(false)
  const initialSyncDoneRef = useRef(false)

  useEffect(() => {
    fetchGenres().then(setGenres)
  }, [])

  // Load from Firebase on login, then subscribe for real-time sync
  useEffect(() => {
    if (!authenticated || !isFirebaseConfigured()) return;
    initialSyncDoneRef.current = false;
    let unsub: (() => void) | null = null;

    (async () => {
      // Step 1: Load remote and merge with local
      const remote = await loadWatchMap(username);
      if (remote && remote.size > 0) {
        fromRemoteRef.current = true;
        setWatchMap((local) => {
          const merged = new Map(remote);
          // Local-only entries that aren't in remote get added
          for (const [id, status] of local) {
            if (!merged.has(id)) merged.set(id, status);
          }
          return merged;
        });
      } else {
        // No remote data — push local to Firebase
        setWatchMap((local) => {
          if (local.size > 0) saveWatchMap(username, local);
          return local;
        });
      }

      initialSyncDoneRef.current = true;

      // Step 2: Subscribe for future real-time updates
      unsub = subscribeWatchMap(username, (remoteMap) => {
        if (!initialSyncDoneRef.current) return;
        fromRemoteRef.current = true;
        setWatchMap(remoteMap);
      });
    })();

    return () => { unsub?.(); };
  }, [authenticated, username]);

  // Save locally + to Firebase on change
  useEffect(() => {
    localSet('antiflix_watchmap', [...watchMap])

    if (fromRemoteRef.current) {
      fromRemoteRef.current = false;
      return; // Don't write back what we just received
    }

    if (authenticated && isFirebaseConfigured()) {
      saveWatchMap(username, watchMap);
    }
  }, [watchMap, authenticated, username])

  useEffect(() => {
    localSet('antiflix_region', region)
  }, [region])

  const setStatus = useCallback((id: number, status: WatchStatus) => {
    setWatchMap(prev => {
      const next = new Map(prev)
      if (status === 'none') {
        next.delete(id)
      } else {
        next.set(id, status)
      }
      return next
    })
  }, [])

  const setStatusBatch = useCallback((entries: [number, WatchStatus][]) => {
    setWatchMap(prev => {
      const next = new Map(prev)
      for (const [id, status] of entries) {
        if (status === 'none') {
          next.delete(id)
        } else {
          next.set(id, status)
        }
      }
      return next
    })
  }, [])

  const clearWatchMap = useCallback(() => {
    setWatchMap(new Map())
  }, [])

  const handleRegionChange = useCallback((r: string) => {
    setRegion(r)
  }, [])

  const handleResync = useCallback(async () => {
    await clearAllCache()
    window.location.reload()
  }, [])

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'about') {
      setShowAbout(true)
    } else {
      setActiveTab(tab as 'browse' | 'moods')
    }
  }, [])

  const handleSelectMood = useCallback((mood: string) => {
    setActiveTab('browse')
    setSelectedMood(mood)
  }, [])

  if (!authenticated) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSettingsOpen={() => setShowSettings(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <span className="font-mono text-sm text-muted animate-pulse">Cargando...</span>
          </div>
        }>
          {activeTab === 'browse' && (
            <Browse
              genres={genres}
              watchMap={watchMap}
              onSetStatus={setStatus}
              onSetStatusBatch={setStatusBatch}
              region={region}
              initialMood={selectedMood}
              onClearMood={() => setSelectedMood(null)}
            />
          )}
          {activeTab === 'moods' && (
            <Moods onSelectMood={handleSelectMood} />
          )}
        </Suspense>
      </main>

      <Footer />

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        region={region}
        onRegionChange={handleRegionChange}
        onResync={handleResync}
        watchMap={watchMap}
        onSetStatusBatch={setStatusBatch}
        onClearWatched={clearWatchMap}
        onLogout={handleLogout}
        username={username}
      />
    </div>
  )
}

export default App
