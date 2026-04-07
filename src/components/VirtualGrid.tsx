import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { Title, WatchStatus } from '../lib/types';
import PosterCard from './PosterCard';

interface VirtualGridProps {
  titles: Title[];
  genres: Map<number, string>;
  watchMap: Map<number, WatchStatus>;
  onSetStatus: (id: number, status: WatchStatus) => void;
  onOpenDetail: (title: Title) => void;
  activeKeywords: string[];
  onToggleKeyword: (kw: string) => void;
}

const GAP = 16;
const COL_MIN_WIDTH = 250;
const MAX_COLS = 5;
// Info area below poster: ~180px estimate (title + overview + chips + button)
const INFO_HEIGHT = 180;

export default function VirtualGrid({
  titles,
  genres,
  watchMap,
  onSetStatus,
  onOpenDetail,
  activeKeywords,
  onToggleKeyword,
}: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(2);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      setContainerWidth(w);
      setColumns(Math.min(MAX_COLS, Math.max(2, Math.floor((w + GAP) / (COL_MIN_WIDTH + GAP)))));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cardWidth = containerWidth > 0
    ? (containerWidth - GAP * (columns - 1)) / columns
    : COL_MIN_WIDTH;

  // Row height = poster (2:3 aspect on cardWidth) + info area + gap
  const rowHeight = Math.round(cardWidth * 1.5) + INFO_HEIGHT + GAP;

  const rowCount = Math.ceil(titles.length / columns);

  // Track scroll position
  const [scrollOffset, setScrollOffset] = useState(0);
  const listTopRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateTop = () => {
      listTopRef.current = el.getBoundingClientRect().top + window.scrollY;
    };
    updateTop();

    const onScroll = () => {
      setScrollOffset(Math.max(0, window.scrollY - listTopRef.current));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { updateTop(); onScroll(); });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateTop);
    };
  }, []);

  const totalHeight = rowCount * rowHeight;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const startRow = Math.max(0, Math.floor(scrollOffset / rowHeight) - 2);
  const endRow = Math.min(rowCount, Math.ceil((scrollOffset + windowHeight) / rowHeight) + 2);

  const visibleRows = useMemo(() =>
    Array.from({ length: endRow - startRow }, (_, i) => startRow + i),
    [startRow, endRow],
  );

  const renderRow = useCallback((rowIndex: number) => {
    const start = rowIndex * columns;
    const rowTitles = titles.slice(start, start + columns);

    return (
      <div
        key={rowIndex}
        style={{
          position: 'absolute',
          top: rowIndex * rowHeight,
          left: 0,
          right: 0,
          height: rowHeight,
          display: 'flex',
          gap: GAP,
        }}
      >
        {rowTitles.map((title) => (
          <div key={title.id} style={{ width: cardWidth, flexShrink: 0 }}>
            <PosterCard
              title={title}
              genres={genres}
              status={watchMap.get(title.id) ?? 'none'}
              onSetStatus={onSetStatus}
              onOpenDetail={onOpenDetail}
              activeKeywords={activeKeywords}
              onToggleKeyword={onToggleKeyword}
            />
          </div>
        ))}
      </div>
    );
  }, [columns, cardWidth, rowHeight, titles, genres, watchMap, onSetStatus, onOpenDetail, activeKeywords, onToggleKeyword]);

  return (
    <div ref={containerRef} className="mt-4" style={{ height: totalHeight, position: 'relative' }}>
      {visibleRows.map(renderRow)}
    </div>
  );
}
