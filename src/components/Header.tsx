import type { PlatformId } from '../lib/platforms';
import { PLATFORMS } from '../lib/platforms';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsOpen: () => void;
  platform: PlatformId;
  onPlatformChange: (p: PlatformId) => void;
}

const tabs = [
  { label: "EXPLORAR", value: "browse" },
  { label: "MOODS", value: "moods" },
  { label: "ACERCA DE", value: "about" },
] as const;

export default function Header({
  activeTab,
  onTabChange,
  onSettingsOpen,
  platform,
  onPlatformChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-bg border-b border-border px-6 py-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl">
            <span className="text-white">anti</span>
            <span className="text-accent">flix</span>
          </h1>
          <p className="font-mono text-xs text-muted tracking-[0.3em] uppercase">
            KILL THE ALGORITHM
          </p>
        </div>

        <button
          onClick={onSettingsOpen}
          className="text-muted hover:text-accent transition"
          aria-label="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
          </svg>
        </button>
      </div>

      <nav className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`font-mono text-sm tracking-wider transition ${
              activeTab === tab.value
                ? "text-accent border-b-2 border-accent pb-1"
                : "text-muted hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPlatformChange(p.id)}
              className={`font-mono text-[11px] tracking-wider px-2 py-1 rounded transition ${
                platform === p.id
                  ? "bg-accent text-white"
                  : "text-muted hover:text-accent border border-border"
              }`}
              title={p.label}
            >
              {p.short}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
