interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-accent text-xl"
        >
          ×
        </button>

        <h2 className="font-display font-black text-2xl">
          <span className="text-white">anti</span>
          <span className="text-accent">flix</span>
        </h2>

        <p className="text-sm text-muted mt-4">
          antiflix es un proyecto personal y no comercial.
        </p>

        <div className="border-t border-border my-4" />

        <div>
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
            alt="TMDB"
            className="max-w-[100px]"
          />
          <p className="text-xs text-muted mt-2">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            https://www.themoviedb.org
          </a>
        </div>

        <p className="text-xs text-muted/50 mt-4">v0.1.0</p>
      </div>
    </div>
  );
}
