export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Poster placeholder */}
      <div className="aspect-[2/3] bg-border/30 animate-pulse" />

      {/* Info area */}
      <div className="p-3">
        {/* Title bar */}
        <div className="h-4 bg-border/30 rounded animate-pulse w-3/4" />

        {/* Overview bars */}
        <div className="h-3 bg-border/20 rounded animate-pulse mt-2" />
        <div className="h-3 bg-border/20 rounded animate-pulse mt-2 w-1/2" />

        {/* Chip area */}
        <div className="flex gap-1 mt-2">
          <div className="h-5 w-12 bg-border/20 rounded animate-pulse" />
          <div className="h-5 w-12 bg-border/20 rounded animate-pulse" />
          <div className="h-5 w-12 bg-border/20 rounded animate-pulse" />
        </div>

        {/* Button */}
        <div className="h-8 bg-border/20 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}
