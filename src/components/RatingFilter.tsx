interface RatingFilterProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

export default function RatingFilter({ min, max, onChange }: RatingFilterProps) {
  const pctMin = (min / 10) * 100;
  const pctMax = (max / 10) * 100;

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="font-mono text-xs text-muted whitespace-nowrap">
        ★ {min.toFixed(1)} — {max.toFixed(1)}
      </span>
      <div className="relative flex-1 h-6 flex items-center min-w-[120px]">
        <div className="absolute inset-x-0 h-2 bg-border rounded-full" />
        <div
          className="absolute h-2 bg-rating rounded-full"
          style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
        />
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={min}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v <= max) onChange(v, max);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-rating [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-rating [&::-moz-range-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v >= min) onChange(min, v);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-rating [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-rating [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
