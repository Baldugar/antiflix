export type WatchStatus = 'none' | 'pending' | 'watching' | 'finished' | 'dropped' | 'ignored';

export const WATCH_STATUS_LABELS: Record<WatchStatus, { label: string; short: string; color: string }> = {
  none: { label: 'No vista', short: '—', color: 'text-muted' },
  pending: { label: 'Pendiente', short: 'PEND', color: 'text-blue-400' },
  watching: { label: 'Viendo', short: 'VIENDO', color: 'text-green-400' },
  finished: { label: 'Terminada', short: 'VISTA', color: 'text-accent' },
  dropped: { label: 'Abandonada', short: 'DROP', color: 'text-red-400' },
  ignored: { label: 'Ignorada', short: 'IGN', color: 'text-muted/50' },
};

export const WATCH_STATUSES: WatchStatus[] = ['none', 'pending', 'watching', 'finished', 'dropped', 'ignored'];

export interface Title {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: 'movie' | 'tv';
  genreIds: number[];
  releaseYear: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string;
  keywords?: string[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface TitleDetail extends Title {
  tagline: string;
  runtime: number | null;
  numberOfSeasons: number | null;
  budget: number;
  revenue: number;
  spokenLanguages: string[];
  status: string;
  cast: CastMember[];
  director: string | null;
  trailerKey: string | null;
  images: { backdrops: string[]; posters: string[] };
  lastAirYear: number | null;
}

export interface Genre {
  id: number;
  name: string;
}

export type SortOption = 'popularity' | 'rating' | 'year';
export type SortDirection = 'asc' | 'desc';
export type MediaFilter = 'all' | 'movie' | 'tv';

export interface FilterState {
  mediaType: MediaFilter;
  genres: number[];
  keywords: string[];
  sort: SortOption;
  sortDir: SortDirection;
  statusFilter: WatchStatus | 'all';
  search: string;
  mood: string | null;
  ratingMin: number;
  ratingMax: number;
  yearMin: number;
  yearMax: number;
  hideIgnored: boolean;
}

export const MOOD_KEYWORDS: Record<string, { keywords: string[]; genres?: number[]; filter?: (t: Title) => boolean }> = {
  'mind-bending': {
    keywords: ['mind-bending', 'surreal', 'time travel', 'philosophical', 'experimental', 'twist', 'nonlinear', 'dream', 'parallel universe', 'puzzle'],
  },
  'terror-puro': {
    keywords: ['cosmic', 'folk horror', 'creature', 'ghost', 'haunted', 'vampire', 'slasher', 'possession', 'supernatural horror'],
    genres: [27],
  },
  'drama-humano': {
    keywords: ['grief', 'trauma', 'addiction', 'coming of age', 'family', 'identity', 'empowerment', 'biography', 'illness'],
  },
  'misterio-lento': {
    keywords: ['slow burn', 'mystery', 'detective', 'investigation', 'paranoia', 'conspiracy', 'noir', 'whodunit'],
  },
  'adrenalina': {
    keywords: ['survival', 'heist', 'chase', 'escape', 'fight', 'war', 'martial arts'],
    genres: [28],
  },
  'cine-de-autor': {
    keywords: ['arthouse', 'auteur', 'avant-garde', 'independent', 'criterion', 'experimental', 'visual'],
    filter: (t: Title) => t.popularity < 50,
  },
  'no-anglofono': {
    keywords: [],
    filter: (t: Title) => t.originalLanguage !== 'en',
  },
  'humor-oscuro': {
    keywords: ['dark comedy', 'satire', 'absurd', 'black humor', 'parody', 'mockumentary', 'dry humor'],
  },
};

export const MOOD_LABELS: Record<string, { emoji: string; label: string; description: string }> = {
  'mind-bending': { emoji: '🧠', label: 'Mind-bending', description: 'Viajes mentales, paradojas y realidades alternativas' },
  'terror-puro': { emoji: '😱', label: 'Terror puro', description: 'Horror sin concesiones ni jump scares baratos' },
  'drama-humano': { emoji: '🎭', label: 'Drama humano', description: 'Historias que tocan la fibra sensible' },
  'misterio-lento': { emoji: '🔍', label: 'Misterio lento', description: 'Tension que se cocina a fuego lento' },
  'adrenalina': { emoji: '⚡', label: 'Adrenalina', description: 'Accion pura, persecuciones y supervivencia' },
  'cine-de-autor': { emoji: '🎨', label: 'Cine de autor', description: 'Peliculas de autor, experimentales y de culto' },
  'no-anglofono': { emoji: '🌍', label: 'No anglofono', description: 'Lo mejor del cine en otros idiomas' },
  'humor-oscuro': { emoji: '😂', label: 'Humor oscuro', description: 'Comedia negra, satira y absurdo' },
};
