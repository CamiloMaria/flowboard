const COLUMN_CARD_COUNTS = [4, 3, 3];

function SkeletonCard() {
  return (
    <div className="bg-bg-card rounded-[8px] h-[52px] animate-shimmer" />
  );
}

function SkeletonColumn({ cardCount }: { cardCount: number }) {
  return (
    <div className="w-[280px] min-w-[280px] bg-bg-surface rounded-[12px] p-3 flex flex-col gap-2">
      {/* Header skeleton */}
      <div className="p-3 flex items-center justify-between">
        <div className="bg-bg-card rounded-[8px] h-5 w-28 animate-shimmer" />
        <div className="bg-bg-card rounded-full h-4 w-4 animate-shimmer" />
      </div>

      {/* Card skeletons */}
      {Array.from({ length: cardCount }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-bg-base">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 px-6 bg-bg-surface border-b border-border-subtle">
        <div className="bg-bg-card rounded-[8px] h-7 w-48 animate-shimmer" />
        <div className="bg-bg-card rounded-[8px] h-4 w-24 animate-shimmer" />
      </div>

      {/* Board skeleton */}
      <div className="flex-1 overflow-hidden p-6 flex gap-4">
        {COLUMN_CARD_COUNTS.map((count, i) => (
          <SkeletonColumn key={i} cardCount={count} />
        ))}
      </div>

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-image: linear-gradient(
            90deg,
            var(--color-bg-card) 0%,
            var(--color-bg-card-hover) 50%,
            var(--color-bg-card) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
