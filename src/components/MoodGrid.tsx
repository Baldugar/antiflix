import { MOOD_LABELS } from '../lib/types';

interface MoodGridProps {
  onSelectMood: (mood: string) => void;
}

export default function MoodGrid({ onSelectMood }: MoodGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(MOOD_LABELS).map(([key, { emoji, label, description }]) => (
        <button
          key={key}
          onClick={() => onSelectMood(key)}
          className="bg-card border border-border rounded-lg p-6 cursor-pointer transition-all hover:border-accent hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/5 text-center"
        >
          <div className="text-4xl">{emoji}</div>
          <div className="font-display font-bold text-white text-sm mt-3">{label}</div>
          <div className="text-xs text-muted mt-1">{description}</div>
        </button>
      ))}
    </div>
  );
}
