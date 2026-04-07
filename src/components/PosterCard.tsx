import type { Title, WatchStatus } from '../lib/types';
import { WATCH_STATUS_LABELS } from '../lib/types';

interface PosterCardProps {
  title: Title;
  genres: Map<number, string>;
  status: WatchStatus;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onOpenDetail?: (title: Title) => void;
  activeKeywords?: string[];
  onToggleKeyword?: (kw: string) => void;
}

const STATUS_BG: Record<WatchStatus, string> = {
  none: '',
  pending: 'bg-blue-500/90',
  watching: 'bg-green-500/90',
  finished: 'bg-accent/90',
  dropped: 'bg-red-500/90',
  ignored: 'bg-gray-600/90',
};

export default function PosterCard({
  title,
  genres,
  status,
  onSetStatus,
  onOpenDetail,
  activeKeywords,
  onToggleKeyword,
}: PosterCardProps) {
  const genreNames = title.genreIds
    .map((id) => genres.get(id))
    .filter(Boolean)
    .slice(0, 3);

  const dimmed = status === 'finished' || status === 'dropped';
  const ignored = status === 'ignored';

  return (
    <div
      className={`bg-card rounded-lg overflow-hidden border border-border transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-lg hover:shadow-accent/10${
        dimmed ? ' opacity-45' : ''
      }${ignored ? ' opacity-30' : ''}`}
    >
      {/* Poster area */}
      <div
        className="relative aspect-[2/3] cursor-pointer"
        onClick={() => onOpenDetail?.(title)}
      >
        {title.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${title.posterPath}`}
            alt={title.title}
            loading="lazy"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
        )}

        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-card to-transparent" />

        {/* Rating badge */}
        <div className="absolute top-2 left-2 bg-rating/90 text-black text-xs font-bold px-1.5 py-0.5 rounded">
          ★ {title.voteAverage.toFixed(1)}
        </div>

        {/* Type badge */}
        <div className="absolute bottom-2 left-2 font-mono text-[10px] text-white/80">
          {title.mediaType === 'movie' ? 'FILM' : 'SERIE'} · {title.mediaType === 'tv' ? `desde ${title.releaseYear}` : title.releaseYear}
        </div>

        {/* Status badge */}
        {status !== 'none' && (
          <div className={`absolute top-2 right-2 ${STATUS_BG[status]} text-white text-xs font-mono px-1.5 py-0.5 rounded`}>
            {WATCH_STATUS_LABELS[status].short}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-3">
        <h3 className="font-display font-bold text-sm text-white line-clamp-1">
          {title.title}
        </h3>

        <p className="text-xs text-muted line-clamp-2 mt-1">
          {title.overview}
        </p>

        {genreNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genreNames.map((name) => (
              <span
                key={name}
                className="text-[10px] font-mono text-muted border border-border rounded px-1.5 py-0.5"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {title.keywords && title.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {title.keywords.slice(0, 4).map((keyword) => {
              const isActive = activeKeywords?.includes(keyword);
              return (
                <button
                  key={keyword}
                  onClick={(e) => { e.stopPropagation(); onToggleKeyword?.(keyword); }}
                  className={`text-[10px] font-mono rounded px-1.5 py-0.5 border transition ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'text-accent/70 border-accent/30 hover:border-accent hover:text-accent'
                  }`}
                >
                  {keyword}
                </button>
              );
            })}
          </div>
        )}

        {/* Status selector */}
        <select
          value={status}
          onChange={(e) => onSetStatus(title.id, e.target.value as WatchStatus)}
          className={`w-full text-xs font-mono py-1.5 rounded border mt-2 bg-card transition-colors cursor-pointer ${
            status === 'none'
              ? 'border-border text-muted'
              : `border-current ${WATCH_STATUS_LABELS[status].color}`
          }`}
        >
          <option value="none">— No vista</option>
          <option value="pending">📋 Pendiente</option>
          <option value="watching">▶ Viendo</option>
          <option value="finished">✓ Terminada</option>
          <option value="dropped">✕ Abandonada</option>
          <option value="ignored">🚫 Ignorada</option>
        </select>
      </div>
    </div>
  );
}
