interface KeywordProgressBarProps {
  fetched: number;
  total: number;
  done: boolean;
}

export default function KeywordProgressBar({ fetched, total, done }: KeywordProgressBarProps) {
  if (done || total === 0) return null;

  const pct = Math.min(100, Math.round((fetched / total) * 100));

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-card border border-border rounded-lg px-3 py-2 shadow-lg min-w-[180px]">
      <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
        <span>Etiquetas</span>
        <span>{fetched} / {total}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-rating rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
