import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchFullCatalog, searchMulti, fetchKeywords, fetchActorTitleIds } from '../lib/tmdb';
import { cacheGet, cacheSet } from '../lib/cache';
import type { Title, FilterState } from '../lib/types';
import { MOOD_KEYWORDS } from '../lib/types';
import PosterCard from '../components/PosterCard';
import SkeletonCard from '../components/SkeletonCard';
import FilterToolbar from '../components/FilterToolbar';
import GenreFilters from '../components/GenreFilters';
import TagFilters from '../components/TagFilters';
import ActiveFilters from '../components/ActiveFilters';
import SurpriseModal from '../components/SurpriseModal';
import ImportPanel from '../components/ImportPanel';
import LoadingOverlay from '../components/LoadingOverlay';
import KeywordProgressBar from '../components/KeywordProgressBar';
import TitleDetailModal from '../components/TitleDetailModal';

import type { WatchStatus } from '../lib/types';

interface BrowseProps {
  genres: Map<number, string>;
  watchMap: Map<number, WatchStatus>;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onSetStatusBatch: (entries: [number, WatchStatus][]) => void;
  region: string;
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
  initialMood,
  onClearMood,
}: BrowseProps) {
  const [catalog, setCatalog] = useState<Title[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [searchResults, setSearchResults] = useState<Title[] | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [detailTitle, setDetailTitle] = useState<Title | null>(null);
  const [actorFilter, setActorFilter] = useState<{ id: number; name: string; titleIds: Set<number> } | null>(null);

  const [titleProgress, setTitleProgress] = useState({ loaded: 0, total: 0, done: false });
  const [kwProgress, setKwProgress] = useState({ fetched: 0, total: 0, done: false });
  const [checkingCache, setCheckingCache] = useState(true);
  const titlesLoaded = titleProgress.done;
  const keywordsLoaded = kwProgress.done;

  const fetchedKeywordsRef = useRef<Set<number>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeywordTitlesRef = useRef<Title[]>([]);
  const kwFetchingRef = useRef(false);
  const kwCancelledRef = useRef(false);

  useEffect(() => {
    if (initialMood) {
      setFilters(prev => ({ ...prev, mood: initialMood }));
      onClearMood?.();
    }
  }, [initialMood, onClearMood]);

  const processKeywordQueue = useCallback(async () => {
    if (kwFetchingRef.current) return;
    kwFetchingRef.current = true;

    const BATCH = 5;
    while (pendingKeywordTitlesRef.current.length > 0) {
      if (kwCancelledRef.current) break;

      const batch = pendingKeywordTitlesRef.current.splice(0, BATCH);

      const results = await Promise.all(
        batch.map(async (title) => {
          if (fetchedKeywordsRef.current.has(title.id)) return null;
          fetchedKeywordsRef.current.add(title.id);
          try {
            const kws = await fetchKeywords(title.id, title.mediaType);
            return { id: title.id, keywords: kws };
          } catch {
            return null;
          }
        }),
      );

      if (kwCancelledRef.current) break;

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

      setKwProgress((prev) => ({
        ...prev,
        fetched: fetchedKeywordsRef.current.size,
      }));
    }

    kwFetchingRef.current = false;

    const isDone = pendingKeywordTitlesRef.current.length === 0;
    setKwProgress((prev) => ({
      ...prev,
      fetched: fetchedKeywordsRef.current.size,
      done: isDone,
    }));

    // When all keywords are fetched, save the enriched catalog + keywords list to cache
    if (isDone) {
      setCatalog((current) => {
        cacheSet('antiflix_catalog_with_kw', current);
        return current;
      });
      setAllKeywords((current) => {
        cacheSet('antiflix_all_keywords', current);
        return current;
      });
    }
  }, []);

  useEffect(() => {
    setTitleProgress({ loaded: 0, total: 0, done: false });
    setKwProgress({ fetched: 0, total: 0, done: false });
    setCatalog([]);
    setAllKeywords([]);
    fetchedKeywordsRef.current = new Set();
    pendingKeywordTitlesRef.current = [];
    kwCancelledRef.current = false;

    // Try to restore fully-enriched catalog from cache first
    (async () => {
      const cachedWithKw = await cacheGet<Title[]>('antiflix_catalog_with_kw');
      const cachedKwList = await cacheGet<string[]>('antiflix_all_keywords');

      if (cachedWithKw && cachedWithKw.length > 0 && cachedKwList) {
        setCatalog(cachedWithKw);
        setAllKeywords(cachedKwList);
        cachedWithKw.forEach((t) => fetchedKeywordsRef.current.add(t.id));
        setTitleProgress({ loaded: cachedWithKw.length, total: cachedWithKw.length, done: true });
        setKwProgress({ fetched: cachedWithKw.length, total: cachedWithKw.length, done: true });
        setCheckingCache(false);
        return;
      }

      setCheckingCache(false);

      // No enriched cache — fetch from TMDB
      const seenIds = new Set<string>();

      fetchFullCatalog(region, ({ movies, tv, done, totalEstimated }) => {
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
          pendingKeywordTitlesRef.current.push(...newTitles);
          setKwProgress((prev) => ({ ...prev, total: seenIds.size }));
          processKeywordQueue();
        }

        if (done && deduped.length === 0) {
          setKwProgress({ fetched: 0, total: 0, done: true });
        }
      });
    })();

    return () => {
      kwCancelledRef.current = true;
    };
  }, [region, processKeywordQueue]);

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

    const dir = filters.sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => {
      switch (filters.sort) {
        case 'popularity': return (a.popularity - b.popularity) * dir;
        case 'rating': return (a.voteAverage - b.voteAverage) * dir;
        case 'year': return (a.releaseYear - b.releaseYear) * dir;
        default: return 0;
      }
    });

    return items;
  }, [searchResults, catalog, filters, watchMap, actorFilter]);


  // Infinite scroll
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, searchResults]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [titlesLoaded]);

  const visibleTitles = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  return (
    <>
      <LoadingOverlay
        titleProgress={titleProgress}
        region={region}
        hidden={checkingCache}
      />

      <KeywordProgressBar
        fetched={kwProgress.fetched}
        total={kwProgress.total}
        done={keywordsLoaded}
      />

      <div>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange({ search: e.target.value })}
          placeholder="Buscar películas y series..."
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-body text-white placeholder-muted focus:outline-none focus:border-accent mt-4"
        />

        {/* Status stats */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-[11px] font-mono">
          <span className="text-muted">{catalog.length} títulos</span>
          <span className="text-muted/50">·</span>
          {(() => {
            const counts = { pending: 0, watching: 0, finished: 0, dropped: 0, ignored: 0 };
            for (const s of watchMap.values()) {
              if (s in counts) counts[s as keyof typeof counts]++;
            }
            return (
              <>
                <span className="text-blue-400">{counts.pending} pendientes</span>
                <span className="text-green-400">{counts.watching} viendo</span>
                <span className="text-accent">{counts.finished} vistas</span>
                <span className="text-red-400">{counts.dropped} abandonadas</span>
                <span className="text-muted/50">{counts.ignored} ignoradas</span>
              </>
            );
          })()}
        </div>

        <FilterToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onSurprise={() => setShowSurprise(true)}
          onImport={() => setShowImport(true)}
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
            {catalog.length > 0
              ? catalog.slice(0, 20).map((title) => (
                  <PosterCard
                    key={title.id}
                    title={title}
                    genres={genres}
                    status={watchMap.get(title.id) ?? 'none'}
                    onSetStatus={onSetStatus}
                    onOpenDetail={setDetailTitle}
                    activeKeywords={filters.keywords}
                    onToggleKeyword={handleToggleTag}
                  />
                ))
              : Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted font-body text-sm">No se encontraron títulos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
              {visibleTitles.map((title) => (
                <PosterCard
                  key={title.id}
                  title={title}
                  genres={genres}
                  status={watchMap.get(title.id) ?? 'none'}
                  onSetStatus={onSetStatus}
                  onOpenDetail={setDetailTitle}
                />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                <span className="font-mono text-xs text-muted animate-pulse">
                  Cargando más...
                </span>
              </div>
            )}
          </>
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
    </>
  );
}
