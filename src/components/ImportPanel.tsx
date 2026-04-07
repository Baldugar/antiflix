import { useState, useRef } from 'react';
import { findBestMatch, parseNetflixCSV } from '../lib/fuzzyMatch';
import type { Title, WatchStatus } from '../lib/types';

interface MatchItem {
  netflixTitle: string;
  id: number;
  matchedTitle: string;
  score: number;
  status: WatchStatus;
}

interface ImportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Title[];
  onSetStatusBatch: (entries: [number, WatchStatus][]) => void;
}

export default function ImportPanel({
  isOpen,
  onClose,
  catalog,
  onSetStatusBatch,
}: ImportPanelProps) {
  const [csvText, setCsvText] = useState('');
  const [pending, setPending] = useState<MatchItem[]>([]);
  const [classified, setClassified] = useState<MatchItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const netflixTitles = parseNetflixCSV(csvText);
      const candidates = catalog.map((t) => ({ id: t.id, title: t.title }));

      const items: MatchItem[] = [];
      for (const nt of netflixTitles) {
        const match = findBestMatch(nt, candidates);
        if (match) {
          items.push({
            netflixTitle: nt,
            id: match.id,
            matchedTitle: match.title,
            score: match.score,
            status: 'finished',
          });
        }
      }
      setPending(items);
      setClassified([]);
      setAnalyzing(false);
    }, 50);
  };

  const classifyOne = (index: number, status: WatchStatus) => {
    const item = { ...pending[index], status };
    setPending((prev) => prev.filter((_, i) => i !== index));
    setClassified((prev) => [item, ...prev]);
  };

  const classifyAll = (status: WatchStatus) => {
    const items = pending.map((m) => ({ ...m, status }));
    setClassified((prev) => [...items, ...prev]);
    setPending([]);
  };

  const unclassify = (index: number) => {
    const item = classified[index];
    setClassified((prev) => prev.filter((_, i) => i !== index));
    setPending((prev) => [...prev, item]);
  };

  const changeClassified = (index: number, status: WatchStatus) => {
    setClassified((prev) =>
      prev.map((m, i) => (i === index ? { ...m, status } : m)),
    );
  };

  const handleImport = () => {
    const entries: [number, WatchStatus][] = classified
      .filter((m) => m.status !== 'none')
      .map((m) => [m.id, m.status]);
    onSetStatusBatch(entries);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setPending([]);
      setClassified([]);
      setCsvText('');
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setPending([]);
    setClassified([]);
    setCsvText('');
    setSuccess(false);
    onClose();
  };

  const hasParsed = pending.length > 0 || classified.length > 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-3 right-3 text-muted hover:text-accent text-xl">×</button>

        <h3 className="font-display text-lg font-bold">Importar historial de Netflix</h3>

        {!hasParsed && (
          <>
            <p className="mt-2 text-xs text-muted">
              Ve a tu cuenta de Netflix → Ajustes → Descargar tus datos. Busca el
              archivo ViewingActivity.csv y subelo o pega su contenido aqui.
            </p>

            <div className="mt-3 flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-accent text-accent font-mono text-xs px-4 py-2 rounded hover:bg-accent hover:text-white transition"
              >
                Subir CSV
              </button>
              {csvText && (
                <span className="text-xs text-muted font-mono self-center">
                  {csvText.split('\n').length} lineas
                </span>
              )}
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="...o pega aqui el contenido del CSV"
              className="w-full h-28 bg-bg border border-border rounded p-3 text-xs font-mono text-white resize-none placeholder-muted mt-3 focus:outline-none focus:border-accent"
            />

            <button
              onClick={handleAnalyze}
              disabled={!csvText.trim() || analyzing}
              className="mt-3 border border-accent text-accent font-mono text-xs px-4 py-2 rounded hover:bg-accent hover:text-white transition disabled:opacity-50"
            >
              {analyzing ? 'Analizando...' : 'Analizar'}
            </button>
          </>
        )}

        {/* Pending items */}
        {pending.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted font-mono">
                {pending.length} pendientes de clasificar
              </p>
              <div className="flex gap-1">
                <span className="text-[10px] text-muted font-mono mr-1">Todos como:</span>
                <button onClick={() => classifyAll('finished')} className="text-[10px] font-mono text-accent border border-accent/30 rounded px-1.5 py-0.5 hover:bg-accent/10">Terminada</button>
                <button onClick={() => classifyAll('watching')} className="text-[10px] font-mono text-green-400 border border-green-500/30 rounded px-1.5 py-0.5 hover:bg-green-500/10">Viendo</button>
                <button onClick={() => classifyAll('pending')} className="text-[10px] font-mono text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5 hover:bg-blue-500/10">Pendiente</button>
                <button onClick={() => classifyAll('dropped')} className="text-[10px] font-mono text-red-400 border border-red-500/30 rounded px-1.5 py-0.5 hover:bg-red-500/10">Abandonada</button>
              </div>
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-1">
              {pending.map((m, i) => (
                <div key={`${m.id}-${i}`} className="flex items-center gap-2 py-1.5 border-b border-border">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white truncate block">{m.matchedTitle}</span>
                    <span className="text-[10px] text-muted truncate block">{m.netflixTitle} · {Math.round(m.score * 100)}%</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => classifyOne(i, 'finished')} title="Terminada" className="text-accent hover:bg-accent/10 rounded px-1.5 py-0.5 text-xs">✓</button>
                    <button onClick={() => classifyOne(i, 'watching')} title="Viendo" className="text-green-400 hover:bg-green-500/10 rounded px-1.5 py-0.5 text-xs">▶</button>
                    <button onClick={() => classifyOne(i, 'pending')} title="Pendiente" className="text-blue-400 hover:bg-blue-500/10 rounded px-1.5 py-0.5 text-xs">📋</button>
                    <button onClick={() => classifyOne(i, 'dropped')} title="Abandonada" className="text-red-400 hover:bg-red-500/10 rounded px-1.5 py-0.5 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classified items */}
        {classified.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted font-mono mb-2">
              {classified.length} clasificados
            </p>

            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {classified.map((m, i) => (
                <div key={`${m.id}-${i}`} className="flex items-center gap-2 py-1 border-b border-border/50">
                  <select
                    value={m.status}
                    onChange={(e) => changeClassified(i, e.target.value as WatchStatus)}
                    className="text-[10px] font-mono bg-card border border-border rounded px-1 py-0.5 cursor-pointer text-white"
                  >
                    <option value="finished">✓ Terminada</option>
                    <option value="watching">▶ Viendo</option>
                    <option value="pending">📋 Pendiente</option>
                    <option value="dropped">✕ Abandonada</option>
                    <option value="none">— Quitar</option>
                  </select>
                  <span className="text-xs text-white truncate flex-1">{m.matchedTitle}</span>
                  <button
                    onClick={() => unclassify(i)}
                    className="text-[10px] text-muted hover:text-accent font-mono flex-shrink-0"
                    title="Devolver a pendientes"
                  >
                    ↩
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              className="mt-3 bg-accent text-white font-mono text-xs px-4 py-2 rounded hover:bg-accent/80 transition"
            >
              IMPORTAR ({classified.filter((m) => m.status !== 'none').length})
            </button>

            {success && (
              <p className="text-xs text-accent font-mono mt-2 animate-pulse">
                Importado correctamente.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
