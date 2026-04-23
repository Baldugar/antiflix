import type { Title, Genre, TitleDetail, CastMember } from './types';
import { cacheGet, cacheSet, cacheGetRaw, cacheSetRaw, cacheDelete } from './cache';

const BASE_URL = 'https://api.themoviedb.org/3';
let _apiKey: string = (import.meta.env.VITE_TMDB_API_KEY as string) || '';

export function setApiKey(key: string): void {
  _apiKey = key;
}

export function getApiKey(): string {
  return _apiKey;
}

// --- Throttled request queue (~25 req/s, well under TMDB's ~40/s limit) ---
// On 429, back off and retry.

const RATE_LIMIT = 25;
const RATE_WINDOW = 1_000;
const MAX_RETRIES = 3;
const timestamps: number[] = [];

interface QueueEntry {
  resolve: (v: Response) => void;
  reject: (e: unknown) => void;
  url: string;
  signal?: AbortSignal;
}
const queue: QueueEntry[] = [];
let processing = false;

function makeAbortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function processQueue(): void {
  if (processing || queue.length === 0) return;
  processing = true;

  const now = Date.now();
  while (timestamps.length > 0 && now - timestamps[0] > RATE_WINDOW) {
    timestamps.shift();
  }

  if (timestamps.length >= RATE_LIMIT) {
    const waitTime = RATE_WINDOW - (now - timestamps[0]) + 50;
    setTimeout(() => {
      processing = false;
      processQueue();
    }, waitTime);
    return;
  }

  const entry = queue.shift()!;

  // Drop already-aborted requests without spending the rate-limit slot
  if (entry.signal?.aborted) {
    entry.reject(makeAbortError());
    processing = false;
    processQueue();
    return;
  }

  timestamps.push(Date.now());
  processing = false;

  fetchWithRetry(entry.url, MAX_RETRIES, entry.signal)
    .then(entry.resolve)
    .catch(entry.reject)
    .finally(() => processQueue());
}

async function fetchWithRetry(url: string, retries: number, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(url, { signal });
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    if (signal?.aborted) throw makeAbortError();
    return fetchWithRetry(url, retries - 1, signal);
  }
  return res;
}

function throttledFetch(url: string, signal?: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const entry: QueueEntry = { resolve, reject, url, signal };

    if (signal) {
      const onAbort = () => {
        const idx = queue.indexOf(entry);
        if (idx >= 0) queue.splice(idx, 1);
        reject(makeAbortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    queue.push(entry);
    processQueue();
  });
}

// --- URL builder ---

export function apiUrl(path: string, params: Record<string, string | number> = {}): string {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', _apiKey);
  url.searchParams.set('language', 'es-ES');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

// --- Genres ---

export async function fetchGenres(): Promise<Map<number, string>> {
  const cached = await cacheGet<[number, string][]>('antiflix_genres');
  if (cached) return new Map(cached);

  const [movieRes, tvRes] = await Promise.all([
    throttledFetch(apiUrl('/genre/movie/list')),
    throttledFetch(apiUrl('/genre/tv/list')),
  ]);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  const map = new Map<number, string>();
  for (const g of (movieData.genres as Genre[])) {
    map.set(g.id, g.name);
  }
  for (const g of (tvData.genres as Genre[])) {
    if (!map.has(g.id)) map.set(g.id, g.name);
  }

  await cacheSet('antiflix_genres', Array.from(map.entries()));
  return map;
}

// --- Map API item to Title ---

export function mapToTitle(item: Record<string, unknown>, mediaType: 'movie' | 'tv'): Title {
  const dateStr = (mediaType === 'movie' ? item.release_date : item.first_air_date) as string | undefined;
  const releaseYear = dateStr ? parseInt(dateStr.substring(0, 4), 10) || 0 : 0;

  return {
    id: item.id as number,
    title: (mediaType === 'movie' ? item.title : item.name) as string,
    originalTitle: (mediaType === 'movie' ? item.original_title : item.original_name) as string,
    overview: (item.overview as string) || '',
    posterPath: (item.poster_path as string | null) ?? null,
    backdropPath: (item.backdrop_path as string | null) ?? null,
    mediaType,
    genreIds: (item.genre_ids as number[]) || [],
    releaseYear,
    voteAverage: (item.vote_average as number) || 0,
    voteCount: (item.vote_count as number) || 0,
    popularity: (item.popularity as number) || 0,
    originalLanguage: (item.original_language as string) || '',
  };
}

// --- Catalog page ---

export async function fetchCatalogPage(
  type: 'movie' | 'tv',
  page: number,
  region: string,
  providerId: number,
  signal?: AbortSignal,
): Promise<{ results: Title[]; totalPages: number; totalResults: number }> {
  const url = apiUrl(`/discover/${type}`, {
    with_watch_providers: providerId,
    watch_region: region,
    page,
    sort_by: 'popularity.desc',
  });

  const res = await throttledFetch(url, signal);
  const data = await res.json();

  return {
    results: ((data.results as Record<string, unknown>[]) || []).map((item) =>
      mapToTitle(item, type),
    ),
    totalPages: (data.total_pages as number) || 0,
    totalResults: (data.total_results as number) || 0,
  };
}

// --- Full catalog ---

interface CatalogProgress {
  movies: Title[];
  tv: Title[];
  done: boolean;
  totalEstimated: number;
}

interface CatalogProgressCache {
  movies: Title[];
  tv: Title[];
  moviePagesDone: number[];
  tvPagesDone: number[];
  movieTotalPages: number;
  tvTotalPages: number;
  movieTotalResults: number;
  tvTotalResults: number;
}

export function isAbortError(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError';
}

export async function fetchFullCatalog(
  region: string,
  providerId: number,
  onProgress: (progress: CatalogProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const suffix = `${providerId}_${region}`;
  const tsKey = `antiflix_catalog_ts_${suffix}`;
  const moviesKey = `antiflix_catalog_movies_${suffix}`;
  const tvKey = `antiflix_catalog_tv_${suffix}`;
  const progressKey = `antiflix_catalog_progress_${suffix}`;

  const checkAbort = () => {
    if (signal?.aborted) throw makeAbortError();
  };

  // Fresh complete cache?
  const tsMeta = await cacheGetRaw<{ ts: number }>(tsKey);
  if (tsMeta && Date.now() - tsMeta.ts < 24 * 60 * 60 * 1000) {
    const cachedMovies = await cacheGet<Title[]>(moviesKey);
    const cachedTv = await cacheGet<Title[]>(tvKey);
    if (cachedMovies && cachedTv) {
      onProgress({
        movies: cachedMovies,
        tv: cachedTv,
        done: true,
        totalEstimated: cachedMovies.length + cachedTv.length,
      });
      return;
    }
  }

  // Resume from prior partial progress, if any
  const partial = await cacheGet<CatalogProgressCache>(progressKey);
  let allMovies: Title[] = partial?.movies ?? [];
  let allTv: Title[] = partial?.tv ?? [];
  const moviePagesDone = new Set<number>(partial?.moviePagesDone ?? []);
  const tvPagesDone = new Set<number>(partial?.tvPagesDone ?? []);
  let movieTotalPages = partial?.movieTotalPages ?? 0;
  let tvTotalPages = partial?.tvTotalPages ?? 0;
  let movieTotalResults = partial?.movieTotalResults ?? 0;
  let tvTotalResults = partial?.tvTotalResults ?? 0;

  // Discover totalPages for any type we've never fetched
  if (movieTotalPages === 0) {
    const res = await fetchCatalogPage('movie', 1, region, providerId, signal);
    checkAbort();
    if (!moviePagesDone.has(1)) {
      allMovies = allMovies.concat(res.results);
      moviePagesDone.add(1);
    }
    movieTotalPages = Math.min(res.totalPages, 500);
    movieTotalResults = res.totalResults;
  }
  if (tvTotalPages === 0) {
    const res = await fetchCatalogPage('tv', 1, region, providerId, signal);
    checkAbort();
    if (!tvPagesDone.has(1)) {
      allTv = allTv.concat(res.results);
      tvPagesDone.add(1);
    }
    tvTotalPages = Math.min(res.totalPages, 500);
    tvTotalResults = res.totalResults;
  }

  const totalEstimated = movieTotalResults + tvTotalResults;
  onProgress({ movies: allMovies, tv: allTv, done: false, totalEstimated });

  // Build pending list (skips pages already cached)
  const remainingPages: Array<{ type: 'movie' | 'tv'; page: number }> = [];
  for (let p = 1; p <= movieTotalPages; p++) {
    if (!moviePagesDone.has(p)) remainingPages.push({ type: 'movie', page: p });
  }
  for (let p = 1; p <= tvTotalPages; p++) {
    if (!tvPagesDone.has(p)) remainingPages.push({ type: 'tv', page: p });
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE);

    // Use settled wrapper so a single abort/error doesn't lose the rest of the batch
    const settled = await Promise.all(
      batch.map((entry) =>
        fetchCatalogPage(entry.type, entry.page, region, providerId, signal)
          .then((res) => ({ ok: true as const, entry, results: res.results }))
          .catch((err) => ({ ok: false as const, entry, err })),
      ),
    );

    for (const s of settled) {
      if (!s.ok) continue;
      if (s.entry.type === 'movie') {
        allMovies = allMovies.concat(s.results);
        moviePagesDone.add(s.entry.page);
      } else {
        allTv = allTv.concat(s.results);
        tvPagesDone.add(s.entry.page);
      }
    }

    // Persist progress so a switch-away doesn't lose what we just fetched
    await cacheSet<CatalogProgressCache>(progressKey, {
      movies: allMovies,
      tv: allTv,
      moviePagesDone: [...moviePagesDone],
      tvPagesDone: [...tvPagesDone],
      movieTotalPages,
      tvTotalPages,
      movieTotalResults,
      tvTotalResults,
    });

    // Emit progress for what we just got, then check abort (so partial save is durable)
    onProgress({ movies: allMovies, tv: allTv, done: false, totalEstimated });
    checkAbort();
  }

  // Final write + clear progress
  await Promise.all([
    cacheSet(moviesKey, allMovies),
    cacheSet(tvKey, allTv),
    cacheSetRaw(tsKey, { ts: Date.now() }),
    cacheDelete(progressKey),
  ]);

  onProgress({ movies: allMovies, tv: allTv, done: true, totalEstimated });
}

// --- Keywords ---

export async function fetchKeywords(
  id: number,
  mediaType: 'movie' | 'tv',
  signal?: AbortSignal,
): Promise<string[]> {
  const cacheKey = `antiflix_keywords_${id}`;
  const cached = await cacheGet<string[]>(cacheKey);
  if (cached) return cached;

  const url = apiUrl(`/${mediaType}/${id}/keywords`);
  const res = await throttledFetch(url, signal);
  const data = await res.json();

  const raw = mediaType === 'movie'
    ? (data.keywords as Array<{ name: string }>) || []
    : (data.results as Array<{ name: string }>) || [];

  const keywords = raw.map((k) => k.name);
  await cacheSet(cacheKey, keywords);
  return keywords;
}

// --- Title detail ---

export async function fetchTitleDetail(
  id: number,
  mediaType: 'movie' | 'tv',
): Promise<TitleDetail> {
  const cacheKey = `antiflix_detail_${id}`;
  const cached = await cacheGet<TitleDetail>(cacheKey);
  if (cached) return cached;

  const [detailRes, creditsRes, imagesRes, videosRes] = await Promise.all([
    throttledFetch(apiUrl(`/${mediaType}/${id}`)),
    throttledFetch(apiUrl(`/${mediaType}/${id}/credits`)),
    throttledFetch(apiUrl(`/${mediaType}/${id}/images`, { include_image_language: 'es,en,null' })),
    throttledFetch(apiUrl(`/${mediaType}/${id}/videos`)),
  ]);

  const [detail, credits, images, videos] = await Promise.all([
    detailRes.json(),
    creditsRes.json(),
    imagesRes.json(),
    videosRes.json(),
  ]);

  const keywords = await fetchKeywords(id, mediaType);

  const cast: CastMember[] = ((credits.cast as Array<Record<string, unknown>>) || [])
    .slice(0, 15)
    .map((c) => ({
      id: c.id as number,
      name: c.name as string,
      character: c.character as string,
      profilePath: (c.profile_path as string | null) ?? null,
    }));

  const crew = (credits.crew as Array<Record<string, unknown>>) || [];
  const directorEntry = crew.find((c) => c.job === 'Director' || c.job === 'Creator');
  const director = directorEntry ? (directorEntry.name as string) : null;

  const videoResults = (videos.results as Array<Record<string, unknown>>) || [];
  const trailer = videoResults.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
  );
  const trailerKey = trailer ? (trailer.key as string) : null;

  const backdrops = ((images.backdrops as Array<Record<string, unknown>>) || [])
    .slice(0, 12)
    .map((img) => img.file_path as string);
  const posters = ((images.posters as Array<Record<string, unknown>>) || [])
    .slice(0, 6)
    .map((img) => img.file_path as string);

  const dateStr = (mediaType === 'movie' ? detail.release_date : detail.first_air_date) as string | undefined;
  const releaseYear = dateStr ? parseInt(dateStr.substring(0, 4), 10) || 0 : 0;

  const spokenLangs = ((detail.spoken_languages as Array<Record<string, unknown>>) || [])
    .map((l) => (l.english_name || l.name) as string);

  const titleDetail: TitleDetail = {
    id: detail.id as number,
    title: (mediaType === 'movie' ? detail.title : detail.name) as string,
    originalTitle: (mediaType === 'movie' ? detail.original_title : detail.original_name) as string,
    overview: (detail.overview as string) || '',
    posterPath: (detail.poster_path as string | null) ?? null,
    backdropPath: (detail.backdrop_path as string | null) ?? null,
    mediaType,
    genreIds: ((detail.genres as Array<{ id: number }>) || []).map((g) => g.id),
    releaseYear,
    voteAverage: (detail.vote_average as number) || 0,
    voteCount: (detail.vote_count as number) || 0,
    popularity: (detail.popularity as number) || 0,
    originalLanguage: (detail.original_language as string) || '',
    keywords,
    tagline: (detail.tagline as string) || '',
    runtime: mediaType === 'movie' ? ((detail.runtime as number) || null) : null,
    numberOfSeasons: mediaType === 'tv' ? ((detail.number_of_seasons as number) || null) : null,
    budget: (detail.budget as number) || 0,
    revenue: (detail.revenue as number) || 0,
    spokenLanguages: spokenLangs,
    status: (detail.status as string) || '',
    cast,
    director,
    trailerKey,
    images: { backdrops, posters },
    lastAirYear: mediaType === 'tv' && detail.last_air_date
      ? parseInt((detail.last_air_date as string).substring(0, 4), 10) || null
      : null,
  };

  await cacheSet(cacheKey, titleDetail);
  return titleDetail;
}

// --- Actor credits ---

export async function fetchActorTitleIds(actorId: number): Promise<Set<number>> {
  const cacheKey = `antiflix_actor_${actorId}`;
  const cached = await cacheGet<number[]>(cacheKey);
  if (cached) return new Set(cached);

  const [movieRes, tvRes] = await Promise.all([
    throttledFetch(apiUrl(`/person/${actorId}/movie_credits`)),
    throttledFetch(apiUrl(`/person/${actorId}/tv_credits`)),
  ]);

  const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);

  const ids = new Set<number>();
  for (const item of ((movieData.cast as Array<{ id: number }>) || [])) ids.add(item.id);
  for (const item of ((tvData.cast as Array<{ id: number }>) || [])) ids.add(item.id);

  await cacheSet(cacheKey, [...ids]);
  return ids;
}

// --- Search ---

export async function searchMulti(query: string): Promise<Title[]> {
  const url = apiUrl('/search/multi', { query });
  const res = await throttledFetch(url);
  const data = await res.json();

  return ((data.results as Array<Record<string, unknown>>) || [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => mapToTitle(item, item.media_type as 'movie' | 'tv'));
}
