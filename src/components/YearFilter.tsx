interface YearFilterProps {
  min: number;
  max: number;
  absMin: number;
  absMax: number;
  onChange: (min: number, max: number) => void;
}

export default function YearFilter({ min, max, absMin, absMax, onChange }: YearFilterProps) {
  const range = absMax - absMin || 1;
  const pctMin = ((min - absMin) / range) * 100;
  const pctMax = ((max - absMin) / range) * 100;

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="font-mono text-xs text-muted whitespace-nowrap">
        {min} — {max}
      </span>
      <div className="relative flex-1 h-6 flex items-center min-w-[120px]">
        <div className="absolute inset-x-0 h-2 bg-border rounded-full" />
        <div
          className="absolute h-2 bg-accent/60 rounded-full"
          style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
        />
        <input
          type="range"
          min={absMin}
          max={absMax}
          step="1"
          value={min}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v <= max) onChange(v, max);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={absMin}
          max={absMax}
          step="1"
          value={max}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v >= min) onChange(min, v);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
