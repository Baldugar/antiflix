import { useState, useMemo } from 'react';

interface TagFiltersProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  loading?: boolean;
}

const VISIBLE_COUNT = 100;

export default function TagFilters({
  availableTags,
  selectedTags,
  onToggleTag,
  loading,
}: TagFiltersProps) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return availableTags;
    const q = search.toLowerCase().trim();
    return availableTags.filter((tag) => tag.toLowerCase().includes(q));
  }, [availableTags, search]);

  // Selected tags always shown first
  const sorted = useMemo(() => {
    const selected = filtered.filter((t) => selectedTags.includes(t));
    const rest = filtered.filter((t) => !selectedTags.includes(t));
    return [...selected, ...rest];
  }, [filtered, selectedTags]);

  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hasMore = sorted.length > VISIBLE_COUNT && !showAll;

  return (
    <details>
      <summary className="font-mono text-xs text-muted cursor-pointer hover:text-accent">
        Etiquetas ({availableTags.length} disponibles)
        {loading && (
          <span className="ml-2 text-rating animate-pulse">cargando...</span>
        )}
      </summary>

      <div className="pt-2">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
          placeholder="Buscar etiquetas..."
          className="w-full bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-white placeholder-muted focus:outline-none focus:border-accent mb-2"
        />

        {filtered.length === 0 ? (
          <p className="text-xs text-muted/50 font-mono py-2">
            No se encontraron etiquetas
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 max-h-[240px] overflow-y-auto">
              {visible.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition ${
                      active
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'border-border text-muted/70 hover:border-accent/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                className="text-[10px] font-mono text-muted hover:text-accent mt-2"
              >
                Mostrar {sorted.length - VISIBLE_COUNT} más...
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}
