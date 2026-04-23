import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchFullCatalog, searchMulti, fetchKeywords, fetchActorTitleIds, isAbortError } from '../lib/tmdb';
import { cacheGet, cacheSet } from '../lib/cache';
import type { Title, FilterState } from '../lib/types';
import { MOOD_KEYWORDS } from '../lib/types';
import type { PlatformId } from '../lib/platforms';
import { getPlatform } from '../lib/platforms';
import SkeletonCard from '../components/SkeletonCard';
import VirtualGrid from '../components/VirtualGrid';
import FilterToolbar from '../components/FilterToolbar';
import GenreFilters from '../components/GenreFilters';
import TagFilters from '../components/TagFilters';
import ActiveFilters from '../components/ActiveFilters';
import SurpriseModal from '../components/SurpriseModal';
import ImportPanel from '../components/ImportPanel';
import LoadingOverlay from '../components/LoadingOverlay';
import KeywordProgressBar from '../components/KeywordProgressBar';
import TitleDetailModal from '../components/TitleDetailModal';
import StatsModal from '../components/StatsModal';

import type { WatchStatus } from '../lib/types';

interface BrowseProps {
  genres: Map<number, string>;
  watchMap: Map<number, WatchStatus>;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onSetStatusBatch: (entries: [number, WatchStatus][]) => void;
  region: string;
  platform: PlatformId;
  initialMood?: string | null;
  onClearMood?: () => void;
}

const INITIAL_FILTERS: FilterState = {
  mediaType: 'all',
  genres: [],
  keywords: [],
  sort: 'popularity',
  sortDir: 'desc',
  statusFilter: 'all',
  search: '',
  mood: null,
  ratingMin: 0,
  ratingMax: 10,
  yearMin: 1900,
  yearMax: new Date().getFullYear(),
  hideIgnored: true,
};

export default function Browse({
  genres,
  watchMap,
  onSetStatus,
  onSetStatusBatch,
  region,
  platform,
  initialMood,
  onClearMood,
}: BrowseProps) {
  const platformInfo = getPlatform(platform);
  const platformSuffix = `${platformInfo.providerId}_${region}`;
  const catalogWithKwKey = `antiflix_catalog_with_kw_${platformSuffix}`;
  const allKeywordsKey = `antiflix_all_keywords_${platformSuffix}`;
  const [catalog, setCatalog] = useState<Title[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [searchResults, setSearchResults] = useState<Title[] | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [detailTitle, setDetailTitle] = useState<Title | null>(null);
  const [actorFilter, setActorFilter] = useState<{ id: number; name: string; titleIds: Set<number> } | null>(null);

  const [titleProgress, setTitleProgress] = useState({ loaded: 0, total: 0, done: false });
  const [kwProgress, setKwProgress] = useState({ fetched: 0, total: 0, done: false });
  const [checkingCache, setCheckingCache] = useState(true);
  const titlesLoaded = titleProgress.done;
  const keywordsLoaded = kwProgress.done;

  const [randomSeed, setRandomSeed] = useState(Date.now());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (initialMood) {
      setFilters(prev => ({ ...prev, mood: initialMood }));
      onClearMood?.();
    }
  }, [initialMood, onClearMood]);

  useEffect(() => {
    // All state for this run is isolated in local variables, so a previous
    // run switching platform mid-flight cannot bleed into the new run's
    // catalog, keyword list, or cache keys.
    const controller = new AbortController();
    const cancelToken = { cancelled: false };
    const fetchedIds = new Set<number>();
    const pendingQueue: Title[] = [];
    let fetching = false;

    setTitleProgress({ loaded: 0, total: 0, done: false });
    setKwProgress({ fetched: 0, total: 0, done: false });
    setCatalog([]);
    setAllKeywords([]);
    setCheckingCache(true);

    const processKeywordQueue = async () => {
      if (fetching) return;
      fetching = true;

      const BATCH = 5;
      while (pendingQueue.length > 0) {
        if (cancelToken.cancelled) break;

        const batch = pendingQueue.splice(0, BATCH);

        const results = await Promise.all(
          batch.map(async (title) => {
            if (fetchedIds.has(title.id)) return null;
            fetchedIds.add(title.id);
            try {
              const kws = await fetchKeywords(title.id, title.mediaType, controller.signal);
              return { id: title.id, keywords: kws };
            } catch {
              return null;
            }
          }),
        );

        if (cancelToken.cancelled) break;

        const validResults = results.filter(
          (r): r is { id: number; keywords: string[] } => r !== null && r.keywords.length > 0,
        );

        if (validResults.length > 0) {
          setCatalog((prev) => {
            const map = new Map(validResults.map((r) => [r.id, r.keywords]));
            return prev.map((t) => (map.has(t.id) ? { ...t, keywords: map.get(t.id) } : t));
          });

          setAllKeywords((prev) => {
            const set = new Set(prev);
            for (const r of validResults) {
              for (const kw of r.keywords) set.add(kw);
            }
            return Array.from(set).sort();
          });
        }

        setKwProgress((prev) => ({ ...prev, fetched: fetchedIds.size }));
      }

      fetching = false;
      if (cancelToken.cancelled) return;

      const isDone = pendingQueue.length === 0;
      setKwProgress((prev) => ({ ...prev, fetched: fetchedIds.size, done: isDone }));

      if (isDone) {
        setCatalog((current) => {
          if (!cancelToken.cancelled) cacheSet(catalogWithKwKey, current);
          return current;
        });
        setAllKeywords((current) => {
          if (!cancelToken.cancelled) cacheSet(allKeywordsKey, current);
          return current;
        });
      }
    };

    (async () => {
      const cachedWithKw = await cacheGet<Title[]>(catalogWithKwKey);
      const cachedKwList = await cacheGet<string[]>(allKeywordsKey);
      if (cancelToken.cancelled) return;

      if (cachedWithKw && cachedWithKw.length > 0 && cachedKwList) {
        setCatalog(cachedWithKw);
        setAllKeywords(cachedKwList);
        cachedWithKw.forEach((t) => fetchedIds.add(t.id));
        setTitleProgress({ loaded: cachedWithKw.length, total: cachedWithKw.length, done: true });
        setKwProgress({ fetched: cachedWithKw.length, total: cachedWithKw.length, done: true });
        setCheckingCache(false);
        return;
      }

      setCheckingCache(false);

      // No enriched cache — fetch from TMDB
      const seenIds = new Set<string>();

      try {
        await fetchFullCatalog(
          region,
          platformInfo.providerId,
          ({ movies, tv, done, totalEstimated }) => {
            if (cancelToken.cancelled) return;
            // Deduplicate by mediaType + id
            const all = [...movies, ...tv];
            const deduped: Title[] = [];
            const keys = new Set<string>();
            for (const t of all) {
              const key = `${t.mediaType}_${t.id}`;
              if (!keys.has(key)) {
                keys.add(key);
                deduped.push(t);
              }
            }
            setCatalog(deduped);
            setTitleProgress({ loaded: deduped.length, total: totalEstimated, done });

            const newTitles = deduped.filter((t) => !seenIds.has(`${t.mediaType}_${t.id}`));
            newTitles.forEach((t) => seenIds.add(`${t.mediaType}_${t.id}`));

            if (newTitles.length > 0) {
              pendingQueue.push(...newTitles);
              setKwProgress((prev) => ({ ...prev, total: seenIds.size }));
              processKeywordQueue();
            }

            if (done && deduped.length === 0) {
              setKwProgress({ fetched: 0, total: 0, done: true });
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (!isAbortError(err)) console.error('fetchFullCatalog error', err);
      }
    })();

    return () => {
      cancelToken.cancelled = true;
      controller.abort();
    };
  }, [region, platformInfo.providerId, catalogWithKwKey, allKeywordsKey]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const query = filters.search.trim();
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      const results = await searchMulti(query);
      setSearchResults(results);
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [filters.search]);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    if (partial.sort === 'random') setRandomSeed(Date.now());
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleToggleGenre = useCallback((genreId: number) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter((g) => g !== genreId)
        : [...prev.genres, genreId],
    }));
  }, []);

  const handleToggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      keywords: prev.keywords.includes(tag)
        ? prev.keywords.filter((k) => k !== tag)
        : [...prev.keywords, tag],
    }));
  }, []);

  const handleRemoveGenre = useCallback((id: number) => {
    setFilters((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== id) }));
  }, []);

  const handleRemoveKeyword = useCallback((kw: string) => {
    setFilters((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k !== kw) }));
  }, []);

  const handleRemoveMood = useCallback(() => {
    setFilters((prev) => ({ ...prev, mood: null }));
  }, []);

  const handleRemoveRating = useCallback(() => {
    setFilters((prev) => ({ ...prev, ratingMin: 0, ratingMax: 10 }));
  }, []);

  const handleRemoveYear = useCallback(() => {
    setFilters((prev) => ({ ...prev, yearMin: 1900, yearMax: new Date().getFullYear() }));
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters((prev) => ({ ...prev, genres: [], keywords: [], mood: null, ratingMin: 0, ratingMax: 10, yearMin: 1900, yearMax: new Date().getFullYear() }));
    setActorFilter(null);
  }, []);

  const handleFilterByActor = useCallback(async (actorId: number, actorName: string) => {
    const titleIds = await fetchActorTitleIds(actorId);
    setActorFilter({ id: actorId, name: actorName, titleIds });
    setDetailTitle(null);
  }, []);

  const filtered = useMemo(() => {
    let items = searchResults ?? catalog;

    if (filters.mediaType !== 'all') {
      items = items.filter((t) => t.mediaType === filters.mediaType);
    }
    // Hide ignored when checkbox is on AND not explicitly filtering for ignored
    if (filters.hideIgnored && filters.statusFilter !== 'ignored') {
      items = items.filter((t) => (watchMap.get(t.id) ?? 'none') !== 'ignored');
    }
    // Status filter
    if (filters.statusFilter !== 'all') {
      items = items.filter((t) => (watchMap.get(t.id) ?? 'none') === filters.statusFilter);
    }
    if (filters.genres.length > 0) {
      items = items.filter((t) => filters.genres.every((g) => t.genreIds.includes(g)));
    }
    if (filters.keywords.length > 0) {
      items = items.filter((t) => t.keywords && filters.keywords.every((kw) => t.keywords!.includes(kw)));
    }
    if (filters.ratingMin > 0 || filters.ratingMax < 10) {
      items = items.filter((t) => t.voteAverage >= filters.ratingMin && t.voteAverage <= filters.ratingMax);
    }
    if (filters.yearMin > 1900 || filters.yearMax < new Date().getFullYear()) {
      items = items.filter((t) => t.releaseYear >= filters.yearMin && t.releaseYear <= filters.yearMax);
    }
    // Actor filter
    if (actorFilter) {
      items = items.filter((t) => actorFilter.titleIds.has(t.id));
    }
    if (filters.mood && MOOD_KEYWORDS[filters.mood]) {
      const mood = MOOD_KEYWORDS[filters.mood];
      items = items.filter((t) => {
        if (mood.genres && mood.genres.length > 0) {
          if (!mood.genres.some((g) => t.genreIds.includes(g))) return false;
        }
        if (mood.filter && !mood.filter(t)) return false;
        if (mood.keywords.length > 0) {
          if (!t.keywords || !mood.keywords.some((kw) => t.keywords!.includes(kw))) {
            if (!t.keywords) return mood.genres !== undefined || mood.filter !== undefined;
            return false;
          }
        }
        return true;
      });
    }

    if (filters.sort === 'random') {
      // Stable per-item hash: order depends on (id, seed) only, not list length,
      // so filtering out an item doesn't reshuffle the remaining ones.
      const hash = (id: number) => {
        let h = (id ^ randomSeed) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
        return (h ^ (h >>> 16)) >>> 0;
      };
      items = [...items].sort((a, b) => hash(a.id) - hash(b.id));
    } else {
      const dir = filters.sortDir === 'asc' ? 1 : -1;
      items = [...items].sort((a, b) => {
        switch (filters.sort) {
          case 'popularity': return (a.popularity - b.popularity) * dir;
          case 'rating': return (a.voteAverage - b.voteAverage) * dir;
          case 'year': return (a.releaseYear - b.releaseYear) * dir;
          default: return 0;
        }
      });
    }

    return items;
  }, [searchResults, catalog, filters, watchMap, actorFilter, randomSeed]);



  return (
    <>
      <LoadingOverlay
        titleProgress={titleProgress}
        region={region}
        platformLabel={platformInfo.label}
        hidden={checkingCache}
      />

      <KeywordProgressBar
        fetched={kwProgress.fetched}
        total={kwProgress.total}
        done={keywordsLoaded}
      />

      <div className="overflow-x-hidden">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange({ search: e.target.value })}
          placeholder="Buscar películas y series..."
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-body text-white placeholder-muted focus:outline-none focus:border-accent mt-4"
        />

        {/* Status stats (restricted to current platform catalog) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-[11px] font-mono items-center">
          <span className="text-muted">{catalog.length} títulos en {platformInfo.label}</span>
          <span className="text-muted/50">·</span>
          {(() => {
            const counts = { pending: 0, watching: 0, finished: 0, dropped: 0, ignored: 0 };
            for (const t of catalog) {
              const s = watchMap.get(t.id);
              if (s && s in counts) counts[s as keyof typeof counts]++;
            }
            return (
              <>
                <span className="text-blue-400">{counts.pending} pendientes</span>
                <span className="text-green-400">{counts.watching} viendo</span>
                <span className="text-accent">{counts.finished} terminadas</span>
                <span className="text-red-400">{counts.dropped} abandonadas</span>
                <span className="text-muted/50">{counts.ignored} ignoradas</span>
              </>
            );
          })()}
          <button
            onClick={() => setShowStats(true)}
            className="ml-auto text-muted hover:text-accent border border-border hover:border-accent rounded px-2 py-0.5 transition"
          >
            📊 Estadísticas
          </button>
        </div>

        <FilterToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onSurprise={() => setShowSurprise(true)}
          onImport={() => setShowImport(true)}
          onReshuffle={() => setRandomSeed(Date.now())}
          resultCount={filtered.length}
        />

        <GenreFilters genres={genres} selectedGenres={filters.genres} onToggleGenre={handleToggleGenre} />
        <TagFilters availableTags={allKeywords} selectedTags={filters.keywords} onToggleTag={handleToggleTag} loading={!keywordsLoaded} />
        <ActiveFilters
          filters={filters}
          genres={genres}
          actorName={actorFilter?.name ?? null}
          onRemoveGenre={handleRemoveGenre}
          onRemoveKeyword={handleRemoveKeyword}
          onRemoveMood={handleRemoveMood}
          onRemoveRating={handleRemoveRating}
          onRemoveYear={handleRemoveYear}
          onRemoveActor={() => setActorFilter(null)}
          onClearAll={handleClearAll}
        />

        {!titlesLoaded ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted font-body text-sm">No se encontraron títulos</p>
          </div>
        ) : (
          <VirtualGrid
            titles={filtered}
            genres={genres}
            watchMap={watchMap}
            onSetStatus={onSetStatus}
            onOpenDetail={setDetailTitle}
            activeKeywords={filters.keywords}
            onToggleKeyword={handleToggleTag}
          />
        )}
      </div>

      <SurpriseModal
        isOpen={showSurprise}
        onClose={() => setShowSurprise(false)}
        catalog={catalog}
        genres={genres}
        watchMap={watchMap}
        onSetStatus={onSetStatus}
        onOpenDetail={setDetailTitle}
      />

      <ImportPanel
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        catalog={catalog}
        onSetStatusBatch={onSetStatusBatch}
      />

      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        region={region}
        activePlatform={platform}
        activeCatalog={catalog}
        watchMap={watchMap}
      />

      <TitleDetailModal
        title={detailTitle}
        genres={genres}
        status={detailTitle ? (watchMap.get(detailTitle.id) ?? 'none') : 'none'}
        onSetStatus={onSetStatus}
        onClose={() => setDetailTitle(null)}
        activeKeywords={filters.keywords}
        onToggleKeyword={handleToggleTag}
        onFilterByActor={handleFilterByActor}
      />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 left-4 z-40 bg-card border border-border text-muted hover:text-accent hover:border-accent w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg transition"
          aria-label="Volver arriba"
        >
          ↑
        </button>
      )}
    </>
  );
}
