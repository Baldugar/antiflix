import type { FilterState, MediaFilter, SortOption, WatchStatus } from '../lib/types';
import RatingFilter from './RatingFilter';
import YearFilter from './YearFilter';

interface FilterToolbarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onSurprise: () => void;
  onImport: () => void;
  resultCount: number;
}

const typeButtons: { label: string; value: MediaFilter }[] = [
  { label: 'TODO', value: 'all' },
  { label: 'PELIS', value: 'movie' },
  { label: 'SERIES', value: 'tv' },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Popularidad', value: 'popularity' },
  { label: 'Rating', value: 'rating' },
  { label: 'Año', value: 'year' },
];

export default function FilterToolbar({
  filters,
  onFilterChange,
  onSurprise,
  onImport,
  resultCount,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      {/* Type toggle */}
      <div className="flex rounded overflow-hidden border border-border">
        {typeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onFilterChange({ mediaType: btn.value })}
            className={`font-mono text-xs px-3 py-1.5 ${
              filters.mediaType === btn.value
                ? 'bg-accent text-white'
                : 'bg-card text-muted hover:text-accent'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <select
        value={filters.statusFilter}
        onChange={(e) => onFilterChange({ statusFilter: e.target.value as WatchStatus | 'all' })}
        className={`font-mono text-xs px-3 py-1.5 rounded border bg-card cursor-pointer ${
          filters.statusFilter !== 'all'
            ? 'border-accent text-accent'
            : 'border-border text-muted'
        }`}
      >
        <option value="all">Todos</option>
        <option value="none">No vistas</option>
        <option value="pending">Pendientes</option>
        <option value="watching">Viendo</option>
        <option value="finished">Terminadas</option>
        <option value="dropped">Abandonadas</option>
        <option value="ignored">Ignoradas</option>
      </select>

      {/* Hide ignored toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hideIgnored}
          onChange={(e) => onFilterChange({ hideIgnored: e.target.checked })}
          className="accent-accent"
        />
        <span className="font-mono text-xs text-muted">Ocultar ignoradas</span>
      </label>

      {/* Surprise button */}
      <button
        onClick={onSurprise}
        className="font-mono text-xs px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent hover:text-white transition"
      >
        🎲 SORPRÉNDEME
      </button>

      {/* Import button */}
      <button
        onClick={onImport}
        className="font-mono text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-accent hover:border-accent"
      >
        ↑ IMPORTAR
      </button>

      {/* Sort dropdown + direction */}
      <div className="ml-auto flex items-center gap-1">
        <select
          value={filters.sort}
          onChange={(e) => onFilterChange({ sort: e.target.value as SortOption })}
          className="bg-card border border-border rounded text-xs font-mono text-muted px-2 py-1.5"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            onFilterChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })
          }
          className="font-mono text-sm text-muted hover:text-accent px-1"
        >
          {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Result count */}
      <span className="text-xs text-muted font-mono">{resultCount} títulos</span>

      {/* Rating filter */}
      <div className="w-full sm:w-auto sm:min-w-[250px]">
        <RatingFilter
          min={filters.ratingMin}
          max={filters.ratingMax}
          onChange={(ratingMin, ratingMax) => onFilterChange({ ratingMin, ratingMax })}
        />
      </div>

      {/* Year filter */}
      <div className="w-full sm:w-auto sm:min-w-[250px]">
        <YearFilter
          min={filters.yearMin}
          max={filters.yearMax}
          absMin={1900}
          absMax={new Date().getFullYear()}
          onChange={(yearMin, yearMax) => onFilterChange({ yearMin, yearMax })}
        />
      </div>
    </div>
  );
}
