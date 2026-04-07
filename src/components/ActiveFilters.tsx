import type { FilterState } from '../lib/types';
import { MOOD_LABELS } from '../lib/types';

interface ActiveFiltersProps {
  filters: FilterState;
  genres: Map<number, string>;
  actorName: string | null;
  onRemoveGenre: (id: number) => void;
  onRemoveKeyword: (kw: string) => void;
  onRemoveMood: () => void;
  onRemoveRating: () => void;
  onRemoveYear: () => void;
  onRemoveActor: () => void;
  onClearAll: () => void;
}

export default function ActiveFilters({
  filters,
  genres,
  actorName,
  onRemoveGenre,
  onRemoveKeyword,
  onRemoveMood,
  onRemoveRating,
  onRemoveYear,
  onRemoveActor,
  onClearAll,
}: ActiveFiltersProps) {
  const hasRating = filters.ratingMin > 0 || filters.ratingMax < 10;
  const hasYear = filters.yearMin > 1900 || filters.yearMax < new Date().getFullYear();
  const hasActive = filters.genres.length > 0 || filters.keywords.length > 0 || filters.mood !== null || hasRating || hasYear || !!actorName;

  if (!hasActive) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center py-2">
      {filters.genres.map((id) => (
        <span
          key={`genre-${id}`}
          className="bg-accent/20 text-accent text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1"
        >
          {genres.get(id) ?? id}
          <button onClick={() => onRemoveGenre(id)} className="hover:text-white">
            ×
          </button>
        </span>
      ))}

      {filters.keywords.map((kw) => (
        <span
          key={`kw-${kw}`}
          className="bg-accent/20 text-accent text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1"
        >
          {kw}
          <button onClick={() => onRemoveKeyword(kw)} className="hover:text-white">
            ×
          </button>
        </span>
      ))}

      {filters.mood && (
        <span className="bg-accent/20 text-accent text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1">
          {MOOD_LABELS[filters.mood]?.emoji} {MOOD_LABELS[filters.mood]?.label ?? filters.mood}
          <button onClick={onRemoveMood} className="hover:text-white">
            ×
          </button>
        </span>
      )}

      {hasRating && (
        <span className="bg-rating/20 text-rating text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1">
          ★ {filters.ratingMin.toFixed(1)} — {filters.ratingMax.toFixed(1)}
          <button onClick={onRemoveRating} className="hover:text-white">
            ×
          </button>
        </span>
      )}

      {hasYear && (
        <span className="bg-accent/20 text-accent text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1">
          {filters.yearMin} — {filters.yearMax}
          <button onClick={onRemoveYear} className="hover:text-white">
            ×
          </button>
        </span>
      )}

      {actorName && (
        <span className="bg-green-500/20 text-green-400 text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1">
          🎭 {actorName}
          <button onClick={onRemoveActor} className="hover:text-white">
            ×
          </button>
        </span>
      )}

      <button
        onClick={onClearAll}
        className="text-xs font-mono text-muted hover:text-accent underline"
      >
        Limpiar
      </button>
    </div>
  );
}
