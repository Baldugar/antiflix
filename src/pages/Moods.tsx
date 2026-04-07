import MoodGrid from '../components/MoodGrid';

interface MoodsProps {
  onSelectMood: (mood: string) => void;
}

export default function Moods({ onSelectMood }: MoodsProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-white text-center">
        Explora por estado de animo
      </h1>
      <p className="text-sm text-muted text-center mt-2">
        Elige un mood y descubre titulos que encajan
      </p>
      <div className="mt-8">
        <MoodGrid onSelectMood={onSelectMood} />
      </div>
    </div>
  );
}
