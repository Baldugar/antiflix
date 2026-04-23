import { useEffect, useState } from 'react';
import type { Title, WatchStatus } from '../lib/types';
import type { PlatformId } from '../lib/platforms';
import { PLATFORMS } from '../lib/platforms';
import { cacheGet } from '../lib/cache';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: string;
  activePlatform: PlatformId;
  activeCatalog: Title[];
  watchMap: Map<number, WatchStatus>;
}

const STATUSES: { key: WatchStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Pendientes', color: 'text-blue-400' },
  { key: 'watching', label: 'Viendo', color: 'text-green-400' },
  { key: 'finished', label: 'Terminadas', color: 'text-accent' },
  { key: 'dropped', label: 'Abandonadas', color: 'text-red-400' },
  { key: 'ignored', label: 'Ignoradas', color: 'text-muted/70' },
];

type Row = {
  platformId: PlatformId;
  label: string;
  total: number;
  counts: Record<WatchStatus, number>;
  cached: boolean;
};

export default function StatsModal({
  isOpen,
  onClose,
  region,
  activePlatform,
  activeCatalog,
  watchMap,
}: StatsModalProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const results: Row[] = await Promise.all(
        PLATFORMS.map(async (p) => {
          const key = `antiflix_catalog_with_kw_${p.providerId}_${region}`;
          const catalog =
            p.id === activePlatform
              ? activeCatalog
              : (await cacheGet<Title[]>(key)) ?? [];
          const counts: Record<WatchStatus, number> = {
            none: 0,
            pending: 0,
            watching: 0,
            finished: 0,
            dropped: 0,
            ignored: 0,
          };
          for (const t of catalog) {
            const s = watchMap.get(t.id) ?? 'none';
            counts[s]++;
          }
          return {
            platformId: p.id,
            label: p.label,
            total: catalog.length,
            counts,
            cached: catalog.length > 0,
          };
        }),
      );
      if (!cancelled) {
        setRows(results);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, region, activePlatform, activeCatalog, watchMap]);

  if (!isOpen) return null;

  const totals: Record<WatchStatus, number> = {
    none: 0,
    pending: 0,
    watching: 0,
    finished: 0,
    dropped: 0,
    ignored: 0,
  };
  const uniqueWatched = new Set<WatchStatus>();
  for (const s of watchMap.values()) {
    totals[s]++;
    uniqueWatched.add(s);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start md:items-center justify-center p-0 md:p-4">
        <div
          className="bg-card md:border md:border-border md:rounded-lg max-w-3xl w-full relative flex flex-col min-h-screen md:min-h-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 text-white/70 hover:text-white text-xl"
          >
            ×
          </button>

          <div className="p-6">
            <h3 className="font-display text-xl font-bold text-white">Estadísticas</h3>
            <p className="font-mono text-[10px] text-muted mt-1 uppercase tracking-wider">
              Plataforma × Estado · {region}
            </p>

            {loading ? (
              <p className="text-sm text-muted font-mono mt-6">Cargando...</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted font-normal">Plataforma</th>
                      {STATUSES.map((s) => (
                        <th key={s.key} className={`text-right py-2 px-2 font-normal ${s.color}`}>
                          {s.label}
                        </th>
                      ))}
                      <th className="text-right py-2 px-2 text-white font-normal">Catálogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.platformId} className="border-b border-border/50">
                        <td className="py-2 px-2">
                          <span className={r.platformId === activePlatform ? 'text-accent' : 'text-white'}>
                            {r.label}
                          </span>
                          {!r.cached && (
                            <span className="ml-2 text-[9px] text-muted/60 uppercase">sin caché</span>
                          )}
                        </td>
                        {STATUSES.map((s) => (
                          <td key={s.key} className={`text-right py-2 px-2 ${s.color} ${r.counts[s.key] === 0 ? 'opacity-40' : ''}`}>
                            {r.counts[s.key]}
                          </td>
                        ))}
                        <td className="text-right py-2 px-2 text-muted">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="py-2 px-2 text-muted uppercase text-[10px] tracking-wider">Total global</td>
                      {STATUSES.map((s) => (
                        <td key={s.key} className={`text-right py-2 px-2 ${s.color}`}>
                          {totals[s.key]}
                        </td>
                      ))}
                      <td className="py-2 px-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="text-[10px] text-muted/60 font-mono mt-6 leading-relaxed">
              Los totales por plataforma solo cuentan títulos que están en su catálogo cacheado.
              El "Total global" refleja todos los títulos con estado en tu cuenta (independiente
              de en qué plataforma estén).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
