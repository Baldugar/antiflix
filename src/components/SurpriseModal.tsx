import { useState, useEffect } from 'react';
import type { Title, WatchStatus } from '../lib/types';

interface SurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  titles: Title[];
  genres: Map<number, string>;
  watchMap: Map<number, WatchStatus>;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onOpenDetail: (title: Title) => void;
}

function pickRandom(titles: Title[]): Title {
  return titles[Math.floor(Math.random() * titles.length)];
}

export default function SurpriseModal({
  isOpen,
  onClose,
  titles,
  genres,
  watchMap,
  onSetStatus,
  onOpenDetail,
}: SurpriseModalProps) {
  const [current, setCurrent] = useState<Title | null>(null);

  useEffect(() => {
    if (isOpen && titles.length > 0) {
      setCurrent(pickRandom(titles));
    }
    // Only pick when modal opens, not when titles update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || titles.length === 0) return null;
  if (!current) return null;

  const genreNames = current.genreIds
    .map((id) => genres.get(id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-0 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/70 hover:text-white text-xl"
        >
          ×
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Poster */}
          <div className="w-full md:w-1/3">
            {current.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w400${current.posterPath}`}
                alt={current.title}
                className="w-full aspect-[2/3] object-cover"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gradient-to-br from-card to-bg" />
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col flex-1">
            <span className="font-mono text-xs text-muted">
              {current.mediaType === 'movie' ? 'FILM' : 'SERIE'} ·{' '}
              {current.releaseYear}
            </span>
            <h3 className="font-display text-2xl font-bold text-white mt-1">
              {current.title}
            </h3>
            <span className="text-rating font-mono text-sm mt-1">
              ★ {current.voteAverage.toFixed(1)}
            </span>
            <p className="text-sm text-muted/90 mt-3 leading-relaxed">
              {current.overview}
            </p>

            {/* Genres */}
            {genreNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
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

            {/* Keywords */}
            {current.keywords && current.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {current.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="text-[10px] font-mono text-accent/70 border border-accent/30 rounded px-1.5 py-0.5"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-4 items-center">
              <button
                onClick={() => setCurrent(pickRandom(titles))}
                className="bg-accent text-white font-mono text-xs px-4 py-2 rounded hover:bg-accent/80"
              >
                OTRA VEZ 🎲
              </button>
              <button
                onClick={() => onOpenDetail(current)}
                className="border border-accent/50 text-accent font-mono text-xs px-4 py-2 rounded hover:bg-accent/10"
              >
                VER DETALLES
              </button>
              <select
                value={watchMap.get(current.id) ?? 'none'}
                onChange={(e) => onSetStatus(current.id, e.target.value as WatchStatus)}
                className="font-mono text-xs px-3 py-2 rounded border border-border bg-card text-white cursor-pointer"
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
        </div>
      </div>
    </div>
  );
}
