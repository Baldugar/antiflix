interface GenreFiltersProps {
  genres: Map<number, string>;
  selectedGenres: number[];
  onToggleGenre: (genreId: number) => void;
}

export default function GenreFilters({
  genres,
  selectedGenres,
  onToggleGenre,
}: GenreFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {Array.from(genres.entries()).map(([id, name]) => {
        const active = selectedGenres.includes(id);
        return (
          <button
            key={id}
            onClick={() => onToggleGenre(id)}
            className={`text-xs font-mono px-2.5 py-1 rounded-full border transition ${
              active
                ? 'bg-accent border-accent text-white'
                : 'border-border text-muted hover:border-accent hover:text-accent'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
