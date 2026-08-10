import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, BookPlus, CheckCircle2, Trash2, Filter, Sparkles } from 'lucide-react';
import { eventsApi, circlesApi, circleItemsApi, booksApi } from '../lib/api';
import type { Circle, CircleItem, DoujinEvent } from '../types';
import { ShoppingTabs } from '../components/shopping/ShoppingTabs';
import { AddToLibraryFromItemModal } from '../components/shopping/AddToLibraryFromItemModal';

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

const effectiveItemStatus = (item: CircleItem, circle: Circle): CircleItem['status'] => {
  if (item.status === 'bought' || item.status === 'soldout') return item.status;
  return circle.status;
};

type Entry = { item: CircleItem; circle: Circle };

const PurchasedListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: events = [],       isLoading: l1 } = useQuery({ queryKey: ['events'],       queryFn: eventsApi.list });
  const { data: circles = [],      isLoading: l2 } = useQuery({ queryKey: ['circles'],      queryFn: circlesApi.list });
  const { data: circleItems = [],  isLoading: l3 } = useQuery({ queryKey: ['circleItems'],  queryFn: circleItemsApi.list });
  const { data: books = [] }                       = useQuery({ queryKey: ['books'],        queryFn: booksApi.list });

  const [editing, setEditing] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'added'>('all');

  const purchasedEntries: Entry[] = useMemo(() => {
    const circleMap = new Map(circles.map(c => [c.id, c]));
    return circleItems
      .map<Entry | null>(item => {
        const circle = circleMap.get(item.circleId);
        if (!circle) return null;
        if (effectiveItemStatus(item, circle) !== 'bought') return null;
        return { item, circle };
      })
      .filter((x): x is Entry => x !== null)
      .filter(({ item }) => {
        if (filter === 'pending') return !item.addedToLibraryBookId;
        if (filter === 'added')   return !!item.addedToLibraryBookId;
        return true;
      });
  }, [circles, circleItems, filter]);

  const groupedByEvent = useMemo(() => {
    const groups = new Map<string, { event: DoujinEvent | null; entries: Entry[] }>();
    for (const entry of purchasedEntries) {
      const key = entry.circle.eventId ?? '__orphan__';
      if (!groups.has(key)) {
        const event = key === '__orphan__' ? null : (events.find(e => e.id === key) ?? null);
        groups.set(key, { event, entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    }
    return Array.from(groups.values());
  }, [purchasedEntries, events]);

  const totalAddedCount = purchasedEntries.filter(e => e.item.addedToLibraryBookId).length;
  const totalCount = purchasedEntries.length;

  const handleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
    queryClient.invalidateQueries({ queryKey: ['books'] });
    setEditing(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('このアイテムを買い物リストから削除しますか？\n（蔵書には影響しません）')) return;
    await circleItemsApi.delete(itemId);
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleUnlink = async (item: CircleItem) => {
    if (!confirm('蔵書登録の紐づけを解除しますか？\n（蔵書側の本は残ります）')) return;
    await circleItemsApi.update(item.id, { addedToLibraryBookId: null });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  if (l1 || l2 || l3) {
    return <div className="text-center py-8 text-zinc-400">読み込み中…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-zinc-100">購入済みリスト</h1>
      </div>
      <div className="mb-4">
        <ShoppingTabs />
      </div>

      {/* Stats + filter */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div className="text-zinc-500">
          {totalCount} 件中 <span className="text-green-400 font-semibold">{totalAddedCount}</span> 件 蔵書登録済
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
          <Filter className="w-3 h-3 ml-2 text-zinc-600" />
          {([
            { v: 'all',     l: '全て' },
            { v: 'pending', l: '未登録' },
            { v: 'added',   l: '登録済' },
          ] as const).map(o => (
            <button
              key={o.v}
              onClick={() => setFilter(o.v)}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                filter === o.v
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>{filter === 'added' ? '蔵書登録済のアイテムがありません' : '購入済みのアイテムがありません'}</p>
          <p className="text-xs mt-1">即売会で「購入済」にステータスを変更したアイテムが表示されます</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByEvent.map(({ event, entries }) => (
            <section
              key={event?.id ?? 'orphan'}
              className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
            >
              <header className="px-4 py-3 border-b border-zinc-800">
                {event ? (
                  <>
                    <h2 className="text-sm font-bold text-zinc-100">{event.name}</h2>
                    {event.date && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <h2 className="text-sm font-medium text-zinc-500">未分類のサークル</h2>
                )}
                <div className="text-xs text-zinc-600 mt-1">{entries.length} アイテム</div>
              </header>

              <ul className="divide-y divide-zinc-800/60">
                <AnimatePresence initial={false}>
                  {entries.map(({ item, circle }) => {
                    const linked = item.addedToLibraryBookId
                      ? books.find(b => b.id === item.addedToLibraryBookId)
                      : null;
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="p-3 flex items-start gap-3"
                      >
                        {/* Cover thumb */}
                        <div className="w-10 h-14 flex-shrink-0 rounded bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-700 text-[10px]">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>NO IMG</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0 ${
                              item.type === 'shinkan' ? 'bg-blue-400/10 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {item.type === 'shinkan' ? '新刊' : item.type === 'kikan' ? '既刊' : item.type}
                            </span>
                            <span className="text-sm text-zinc-100 truncate font-medium">{item.title}</span>
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {circle.name}
                            <span className="text-zinc-700 mx-1">·</span>
                            <span className="font-mono">{circle.hall} {circle.block}-{circle.number}</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            ¥{item.price.toLocaleString()} × {item.quantity}
                          </div>
                          {linked && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-green-400/10 text-green-400 border border-green-400/20">
                              <CheckCircle2 className="w-3 h-3" />
                              蔵書登録済: {linked.title}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {item.addedToLibraryBookId ? (
                            <button
                              onClick={() => handleUnlink(item)}
                              className="px-2.5 py-1.5 text-[11px] rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                              title="蔵書との紐づけを解除"
                            >
                              紐づけ解除
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditing({ item, circle })}
                              className="px-2.5 py-1.5 text-[11px] rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white transition-colors flex items-center gap-1 font-medium active:scale-95"
                            >
                              <BookPlus className="w-3 h-3" />
                              蔵書に追加
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                            title="リストから削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <AddToLibraryFromItemModal
            item={editing.item}
            circle={editing.circle}
            existingBooks={books}
            onClose={() => setEditing(null)}
            onAdded={handleAdded}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchasedListPage;
