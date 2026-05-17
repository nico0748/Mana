import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Book } from "../../types";
import { BookGridCard } from "./BookGridCard";
import { ChevronRight } from "lucide-react";

export interface VirtualGroup {
  key: string;
  label: string;
  books: Book[];
}

interface Props {
  groups: VirtualGroup[];
  /** スクロールが起きる祖先要素。BookList 内では .flex-1.overflow-y-auto をそのまま渡す。 */
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => Promise<void>;
  onShare?: (book: Book) => void;
  onHeaderClick?: (groupKey: string) => void;
}

const TARGET_CARD_WIDTH = 140;
const GRID_GAP = 12;
const ROW_HEIGHT_ESTIMATE = 270;
const HEADER_HEIGHT_ESTIMATE = 56;

type Row =
  | { type: 'header'; key: string; label: string; count: number; groupKey: string }
  | { type: 'grid'; key: string; books: Book[] };

function computeColumns(containerWidth: number): number {
  const cols = Math.floor((containerWidth + GRID_GAP) / (TARGET_CARD_WIDTH + GRID_GAP));
  return Math.max(2, Math.min(8, cols));
}

export const VirtualBookGrid: React.FC<Props> = ({
  groups, scrollElementRef, onSelect, onEdit, onDelete, onShare, onHeaderClick,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  // 親コンテナの幅をウォッチして列数を決める。
  useLayoutEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;
    const update = () => setColumns(computeColumns(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 空グループはスキップしつつ、ヘッダー行と grid 行をフラット化。
  const rows = useMemo<Row[]>(() => {
    const items: Row[] = [];
    for (const group of groups) {
      if (group.books.length === 0) continue;
      items.push({
        type: 'header',
        key: `h-${group.key}`,
        label: group.label,
        count: group.books.length,
        groupKey: group.key,
      });
      for (let i = 0; i < group.books.length; i += columns) {
        items.push({
          type: 'grid',
          key: `r-${group.key}-${i}`,
          books: group.books.slice(i, i + columns),
        });
      }
    }
    return items;
  }, [groups, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (i) => rows[i].type === 'header' ? HEADER_HEIGHT_ESTIMATE : ROW_HEIGHT_ESTIMATE,
    overscan: 4,
  });

  // groups / columns が変わると行リスト全体が組み直されるので、内部キャッシュを破棄。
  // (これがないと別カテゴリへ切り替えた直後に古い高さが残ることがある)
  useEffect(() => {
    virtualizer.measure();
  }, [groups, columns, virtualizer]);

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="relative w-full">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map(vi => {
          const row = rows[vi.index];
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {row.type === 'header' ? (
                <button
                  onClick={() => onHeaderClick?.(row.groupKey)}
                  className="w-full flex items-center gap-3 mb-3 mt-2 group"
                >
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">
                    {row.label}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full tabular-nums group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors">
                    {row.count}
                  </span>
                  <div className="flex-1 h-px bg-zinc-800 group-hover:bg-zinc-700/50 transition-colors" />
                  {onHeaderClick && (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  )}
                </button>
              ) : (
                <div
                  className="grid pb-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: `${GRID_GAP}px`,
                  }}
                >
                  {row.books.map(book => (
                    <BookGridCard
                      key={book.id}
                      book={book}
                      onSelect={onSelect}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onShare={onShare}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
