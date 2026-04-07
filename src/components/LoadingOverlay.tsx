interface LoadingOverlayProps {
  titleProgress: { loaded: number; total: number; done: boolean };
  region: string;
  hidden?: boolean;
}

export default function LoadingOverlay({
  titleProgress,
  region,
  hidden,
}: LoadingOverlayProps) {
  if (titleProgress.done || hidden) return null;

  const titlePct = titleProgress.total > 0
    ? Math.min(100, Math.round((titleProgress.loaded / titleProgress.total) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex items-center justify-center">
      <div className="max-w-md w-full px-6 text-center">
        <h1 className="font-display font-black text-5xl animate-[pulse_2s_ease-in-out_infinite]">
          <span className="text-white">anti</span>
          <span className="text-accent">flix</span>
        </h1>
        <p className="font-mono text-[10px] text-muted tracking-[0.3em] uppercase mt-2">
          KILL THE ALGORITHM
        </p>

        <div className="mt-12">
          <div className="flex justify-between text-xs font-mono text-muted mb-1.5">
            <span>Títulos</span>
            <span>{titleProgress.loaded} / ~{titleProgress.total}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${titlePct}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted/60 font-mono mt-6">
          Descargando catálogo de Netflix ({region})...
        </p>
      </div>
    </div>
  );
}
