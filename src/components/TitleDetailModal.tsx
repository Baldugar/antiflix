import { useState, useEffect } from 'react';
import type { Title, TitleDetail, WatchStatus } from '../lib/types';
import { fetchTitleDetail } from '../lib/tmdb';
import ImageLightbox from './ImageLightbox';

interface TitleDetailModalProps {
  title: Title | null;
  genres: Map<number, string>;
  status: WatchStatus;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onClose: () => void;
  activeKeywords: string[];
  onToggleKeyword: (kw: string) => void;
  onFilterByActor: (actorId: number, actorName: string) => void;
}

const currencyFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function TitleDetailModal({
  title,
  genres,
  status,
  onSetStatus,
  onClose,
  activeKeywords,
  onToggleKeyword,
  onFilterByActor,
}: TitleDetailModalProps) {
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    if (!title) { setDetail(null); return; }
    setLoading(true);
    fetchTitleDetail(title.id, title.mediaType).then((d) => {
      setDetail(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [title]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!title) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [title]);

  if (!title) return null;

  const d = detail;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/90"
      onClick={onClose}
    >
      <div
        className="max-w-5xl mx-auto min-h-full bg-bg relative"
        onClick={(e) => e.stopPropagation()}
      >

      {/* Close button — always visible, especially needed on mobile */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-[55] bg-black/60 text-white/80 hover:text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-mono backdrop-blur-sm"
      >
        ✕
      </button>

      <div className="relative w-full aspect-video max-h-[60vh] overflow-hidden">
        {(d?.backdropPath || title.backdropPath) ? (
          <img
            src={`https://image.tmdb.org/t/p/w1280${d?.backdropPath || title.backdropPath}`}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />

        <div className="absolute bottom-0 left-6 translate-y-1/3 w-48 hidden md:block">
          {title.posterPath && (
            <img
              src={`https://image.tmdb.org/t/p/w342${title.posterPath}`}
              alt={title.title}
              className="rounded-lg shadow-2xl border border-border"
            />
          )}
        </div>
      </div>

      <div className="px-6 pb-12 pt-4 md:pl-60">
        {loading ? (
          <div className="py-12">
            <p className="text-muted font-mono text-sm animate-pulse">Cargando detalles...</p>
          </div>
        ) : d ? (
          <>
            <h2 className="font-display text-3xl font-bold text-white">{d.title}</h2>
            {d.originalTitle !== d.title && (
              <p className="text-muted text-sm italic mt-1">{d.originalTitle}</p>
            )}
            {d.tagline && (
              <p className="text-muted/70 italic text-sm mt-1">"{d.tagline}"</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm font-mono text-muted">
              <span>
                {d.mediaType === 'tv'
                  ? `${d.releaseYear}–${d.status === 'Ended' || d.status === 'Canceled' ? (d.lastAirYear ?? '?') : 'presente'}`
                  : d.releaseYear}
              </span>
              {d.runtime && <span>{d.runtime} min</span>}
              {d.numberOfSeasons && <span>{d.numberOfSeasons} temporada{d.numberOfSeasons > 1 ? 's' : ''}</span>}
              <span className="text-rating font-bold">★ {d.voteAverage.toFixed(1)}</span>
              <span>{d.originalLanguage.toUpperCase()}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {d.genreIds.map((gid) => (
                <span key={gid} className="text-xs font-mono text-muted border border-border rounded px-2 py-0.5">
                  {genres.get(gid) ?? gid}
                </span>
              ))}
            </div>

            {d.director && (
              <p className="text-sm text-muted mt-3">
                <span className="text-white">{d.mediaType === 'movie' ? 'Dirigida' : 'Creada'} por </span>
                {d.director}
              </p>
            )}

            <p className="text-sm text-muted/90 leading-relaxed mt-4">{d.overview}</p>

            {d.trailerKey && (
              <div className="mt-6">
                <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Trailer</h3>
                <div className="aspect-video max-w-3xl rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${d.trailerKey}`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {d.cast.length > 0 && (
              <div className="mt-6">
                <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Reparto</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {d.cast.map((c) => (
                    <div
                      key={c.id}
                      className="flex-shrink-0 w-28 text-center cursor-pointer group"
                      onClick={() => onFilterByActor(c.id, c.name)}
                    >
                      {c.profilePath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${c.profilePath}`}
                          alt={c.name}
                          className="w-full aspect-[2/3] object-cover rounded group-hover:ring-2 group-hover:ring-accent transition"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-border/30 rounded flex items-center justify-center text-muted/30 text-3xl group-hover:ring-2 group-hover:ring-accent transition">
                          ?
                        </div>
                      )}
                      <p className="text-xs font-bold text-white mt-1 line-clamp-1 group-hover:text-accent transition">{c.name}</p>
                      <p className="text-xs text-muted line-clamp-1">{c.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const allImages = [
                ...d.images.backdrops.map((p) => `https://image.tmdb.org/t/p/original${p}`),
                ...d.images.posters.map((p) => `https://image.tmdb.org/t/p/original${p}`),
              ];
              const backdropCount = d.images.backdrops.length;

              return (
                <>
                  {d.images.backdrops.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Galería</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {d.images.backdrops.map((path, i) => (
                          <img
                            key={path}
                            src={`https://image.tmdb.org/t/p/w780${path}`}
                            alt=""
                            className="rounded cursor-pointer hover:opacity-80 transition"
                            loading="lazy"
                            onClick={() => setLightbox({ images: allImages, index: i })}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {d.images.posters.length > 1 && (
                    <div className="mt-4">
                      <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Pósters</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {d.images.posters.map((path, i) => (
                          <img
                            key={path}
                            src={`https://image.tmdb.org/t/p/w342${path}`}
                            alt=""
                            className="h-48 rounded cursor-pointer hover:opacity-80 transition flex-shrink-0"
                            loading="lazy"
                            onClick={() => setLightbox({ images: allImages, index: backdropCount + i })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {(d.budget > 0 || d.revenue > 0 || d.spokenLanguages.length > 0) && (
              <div className="mt-6">
                <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Datos técnicos</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {d.budget > 0 && (
                    <div>
                      <span className="text-muted">Presupuesto: </span>
                      <span className="text-white">{currencyFmt.format(d.budget)}</span>
                    </div>
                  )}
                  {d.revenue > 0 && (
                    <div>
                      <span className="text-muted">Recaudación: </span>
                      <span className="text-white">{currencyFmt.format(d.revenue)}</span>
                    </div>
                  )}
                  {d.spokenLanguages.length > 0 && (
                    <div>
                      <span className="text-muted">Idiomas: </span>
                      <span className="text-white">{d.spokenLanguages.join(', ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted">Estado: </span>
                    <span className="text-white">{d.status}</span>
                  </div>
                </div>
              </div>
            )}

            {d.keywords && d.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-6">
                {d.keywords.map((kw) => {
                  const isActive = activeKeywords.includes(kw);
                  return (
                    <button
                      key={kw}
                      onClick={() => onToggleKeyword(kw)}
                      className={`text-[10px] font-mono rounded px-1.5 py-0.5 border transition cursor-pointer ${
                        isActive
                          ? 'bg-accent text-white border-accent'
                          : 'text-accent/70 border-accent/30 hover:border-accent hover:text-accent'
                      }`}
                    >
                      {kw}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <select
                value={status}
                onChange={(e) => onSetStatus(d.id, e.target.value as WatchStatus)}
                className="font-mono text-sm px-6 py-2.5 rounded border border-border bg-card text-white cursor-pointer"
              >
                <option value="none">— No vista</option>
                <option value="pending">📋 Pendiente</option>
                <option value="watching">▶ Viendo</option>
                <option value="finished">✓ Terminada</option>
                <option value="dropped">✕ Abandonada</option>
                <option value="ignored">🚫 Ignorada</option>
              </select>
            </div>
          </>
        ) : null}
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      </div>
    </div>
  );
}
