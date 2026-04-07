import { useRef } from 'react';
import type { WatchStatus } from '../lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: string;
  onRegionChange: (r: string) => void;
  onResync: () => void;
  watchMap: Map<number, WatchStatus>;
  onSetStatusBatch: (entries: [number, WatchStatus][]) => void;
  onClearWatched: () => void;
  onLogout: () => void;
}

const COUNTRIES = [
  { code: 'ES', label: 'España' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'MX', label: 'México' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CO', label: 'Colombia' },
  { code: 'CL', label: 'Chile' },
  { code: 'DE', label: 'Alemania' },
  { code: 'FR', label: 'Francia' },
  { code: 'IT', label: 'Italia' },
  { code: 'BR', label: 'Brasil' },
  { code: 'JP', label: 'Japón' },
  { code: 'KR', label: 'Corea del Sur' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  region,
  onRegionChange,
  onResync,
  watchMap,
  onSetStatusBatch,
  onClearWatched,
  onLogout,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const data = JSON.stringify(Array.from(watchMap.entries()));
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'antiflix-watchmap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const entries: [number, WatchStatus][] = JSON.parse(reader.result as string);
        if (Array.isArray(entries)) {
          onSetStatusBatch(entries.filter(
            (e) => Array.isArray(e) && typeof e[0] === 'number' && typeof e[1] === 'string',
          ));
        }
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
  };

  const statusCount = (s: WatchStatus) =>
    Array.from(watchMap.values()).filter((v) => v === s).length;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted hover:text-accent text-xl">×</button>

        <h2 className="font-display text-xl font-bold">Ajustes</h2>

        {/* Stats */}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-muted">
          <span className="text-blue-400">{statusCount('pending')} pendientes</span>
          <span className="text-green-400">{statusCount('watching')} viendo</span>
          <span className="text-accent">{statusCount('finished')} terminadas</span>
          <span className="text-red-400">{statusCount('dropped')} abandonadas</span>
          <span className="text-muted/50">{statusCount('ignored')} ignoradas</span>
        </div>

        {/* Region */}
        <div className="mt-4">
          <label className="font-mono text-xs text-muted">Region</label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="bg-bg border border-border rounded text-sm font-mono text-white px-3 py-2 w-full mt-1"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
        </div>

        {/* Resync */}
        <button
          onClick={() => { onResync(); onClose(); }}
          className="w-full mt-4 bg-accent/20 border border-accent text-accent font-mono text-xs py-2 rounded hover:bg-accent hover:text-white transition"
        >
          Resincronizar catalogo
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="w-full mt-4 bg-accent/20 border border-border text-muted font-mono text-xs py-2 rounded hover:bg-accent hover:text-white transition"
        >
          Exportar datos de seguimiento
        </button>

        {/* Import */}
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full mt-2 bg-accent/20 border border-border text-muted font-mono text-xs py-2 rounded hover:bg-accent hover:text-white transition"
        >
          Importar datos de seguimiento
        </button>

        {/* Clear */}
        <button
          onClick={() => {
            if (confirm('¿Borrar todos los datos de seguimiento?')) {
              onClearWatched();
              onClose();
            }
          }}
          className="w-full mt-6 border border-red-800/50 text-red-500/70 font-mono text-xs py-2 rounded hover:bg-red-900/20 transition"
        >
          Borrar datos de seguimiento
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full mt-2 border border-accent/50 text-accent/70 font-mono text-xs py-2 rounded hover:bg-accent/10 transition"
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
