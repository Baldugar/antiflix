import { useState, useEffect, useCallback } from 'react';
import type { Title, WatchStatus } from '../lib/types';

interface SurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Title[];
  genres: Map<number, string>;
  watchMap: Map<number, WatchStatus>;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onOpenDetail: (title: Title) => void;
}

export default function SurpriseModal({
  isOpen,
  onClose,
  catalog,
  genres,
  watchMap,
  onSetStatus,
  onOpenDetail,
}: SurpriseModalProps) {
  const [current, setCurrent] = useState<Title | null>(null);
  const [history, setHistory] = useState<Title[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const pool = catalog.filter((t) => (watchMap.get(t.id) ?? 'none') !== 'ignored');

  const pickRandom = useCallback(() => {
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setCurrent((prev) => {
      if (prev) setHistory((h) => [prev, ...h].slice(0, 100));
      return pick;
    });
  }, [pool]);

  useEffect(() => {
    if (isOpen && pool.length > 0 && !current) {
      pickRandom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    setCurrent(null);
    setHistory([]);
    setShowHistory(false);
    onClose();
  };

  if (!isOpen || pool.length === 0 || !current) return null;

  const genreNames = current.genreIds
    .map((id) => genres.get(id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center p-0 md:p-4">
      <div className="bg-card md:border md:border-border md:rounded-lg max-w-4xl w-full p-0 relative md:overflow-hidden flex min-h-screen md:min-h-0">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white text-xl"
          >
            ×
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Poster */}
            <div className="w-full md:w-1/3 flex-shrink-0">
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
            <div className="p-6 flex flex-col flex-1 min-w-0">
              <span className="font-mono text-xs text-muted">
                {current.mediaType === 'movie' ? 'FILM' : 'SERIE'} · {current.releaseYear}
              </span>
              <h3 className="font-display text-2xl font-bold text-white mt-1">
                {current.title}
              </h3>
              <span className="text-rating font-mono text-sm mt-1">
                ★ {current.voteAverage.toFixed(1)}
              </span>
              <p className="text-sm text-muted/90 mt-3 leading-relaxed line-clamp-4">
                {current.overview}
              </p>

              {genreNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {genreNames.map((name) => (
                    <span key={name} className="text-[10px] font-mono text-muted border border-border rounded px-1.5 py-0.5">
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {current.keywords && current.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {current.keywords.slice(0, 6).map((keyword) => (
                    <span key={keyword} className="text-[10px] font-mono text-accent/70 border border-accent/30 rounded px-1.5 py-0.5">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1" />

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <button
                  onClick={pickRandom}
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
                {history.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="font-mono text-[10px] text-muted hover:text-accent ml-auto"
                  >
                    {showHistory ? 'Ocultar' : `Historial (${history.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && history.length > 0 && (
          <div className="w-48 border-l border-border bg-bg overflow-y-auto max-h-[70vh] flex-shrink-0 hidden md:block">
            <p className="font-mono text-[10px] text-muted px-3 pt-3 pb-1 uppercase tracking-wider">Historial</p>
            {history.map((t, i) => (
              <button
                key={`${t.id}-${i}`}
                onClick={() => setCurrent(t)}
                className="w-full text-left px-3 py-2 hover:bg-card transition flex gap-2 items-center"
              >
                {t.posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${t.posterPath}`}
                    alt=""
                    className="w-8 h-12 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 bg-border/30 rounded flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-white line-clamp-1">{t.title}</p>
                  <p className="text-[10px] text-muted">{t.releaseYear} · ★ {t.voteAverage.toFixed(1)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
