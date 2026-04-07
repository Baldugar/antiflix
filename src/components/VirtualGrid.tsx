import { useRef, useState, useEffect, useCallback } from 'react';
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
const ROW_HEIGHT = 520;

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
      setColumns(Math.min(5, Math.max(2, Math.floor((w + GAP) / (COL_MIN_WIDTH + GAP)))));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(titles.length / columns);
  const cardWidth = containerWidth > 0
    ? (containerWidth - GAP * (columns - 1)) / columns
    : COL_MIN_WIDTH;

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const start = index * columns;
    const rowTitles = titles.slice(start, start + columns);

    return (
      <div style={style} className="flex" >
        {rowTitles.map((title, i) => (
          <div
            key={title.id}
            style={{
              width: cardWidth,
              marginLeft: i > 0 ? GAP : 0,
              flexShrink: 0,
            }}
          >
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
  }, [columns, cardWidth, titles, genres, watchMap, onSetStatus, onOpenDetail, activeKeywords, onToggleKeyword]);

  // Calculate visible area based on window scroll
  const [scrollOffset, setScrollOffset] = useState(0);
  const [listTop, setListTop] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateTop = () => {
      setListTop(el.getBoundingClientRect().top + window.scrollY);
    };
    updateTop();

    const onScroll = () => {
      setScrollOffset(Math.max(0, window.scrollY - listTop));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateTop);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateTop);
    };
  }, [listTop]);

  const totalHeight = rowCount * ROW_HEIGHT;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Determine which rows are visible
  const startRow = Math.max(0, Math.floor(scrollOffset / ROW_HEIGHT) - 2);
  const endRow = Math.min(rowCount, Math.ceil((scrollOffset + windowHeight) / ROW_HEIGHT) + 2);

  return (
    <div ref={containerRef} className="mt-4" style={{ height: totalHeight, position: 'relative' }}>
      {Array.from({ length: endRow - startRow }, (_, i) => {
        const rowIndex = startRow + i;
        return (
          <Row
            key={rowIndex}
            index={rowIndex}
            style={{
              position: 'absolute',
              top: rowIndex * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
            }}
          />
        );
      })}
    </div>
  );
}
