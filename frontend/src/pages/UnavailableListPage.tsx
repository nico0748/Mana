import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar, ExternalLink, Trash2, Filter, ShoppingCart, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import { eventsApi, circlesApi, circleItemsApi } from '../lib/api';
import type { Circle, CircleItem, CircleItemOnlineStatus, DoujinEvent } from '../types';
import { ShoppingTabs } from '../components/shopping/ShoppingTabs';
import { ONLINE_STORES } from '../lib/onlineStores';

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

const effectiveItemStatus = (item: CircleItem, circle: Circle): CircleItem['status'] => {
  if (item.status === 'bought' || item.status === 'soldout') return item.status;
  return circle.status;
};

const onlineStatusLabel: Record<CircleItemOnlineStatus, string> = {
  unchecked:        '未確認',
  available_online: '通販で発見',
  unavailable:      '通販でも入手不可',
};

const onlineStatusClass: Record<CircleItemOnlineStatus, string> = {
  unchecked:        'bg-zinc-800 text-zinc-400 border-zinc-700',
  available_online: 'bg-green-400/10 text-green-400 border-green-400/30',
  unavailable:      'bg-rose-400/10 text-rose-400 border-rose-400/30',
};

type Entry = { item: CircleItem; circle: Circle };

const UnavailableListPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: events = [],      isLoading: l1 } = useQuery({ queryKey: ['events'],      queryFn: eventsApi.list });
  const { data: circles = [],     isLoading: l2 } = useQuery({ queryKey: ['circles'],     queryFn: circlesApi.list });
  const { data: circleItems = [], isLoading: l3 } = useQuery({ queryKey: ['circleItems'], queryFn: circleItemsApi.list });

  const [filter, setFilter] = useState<'all' | CircleItemOnlineStatus>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [queryByItem, setQueryByItem] = useState<Record<string, string>>({});

  const soldoutEntries: Entry[] = useMemo(() => {
    const circleMap = new Map(circles.map(c => [c.id, c]));
    return circleItems
      .map<Entry | null>(item => {
        const circle = circleMap.get(item.circleId);
        if (!circle) return null;
        if (effectiveItemStatus(item, circle) !== 'soldout') return null;
        return { item, circle };
      })
      .filter((x): x is Entry => x !== null)
      .filter(({ item }) => filter === 'all' ? true : (item.onlineStatus ?? 'unchecked') === filter);
  }, [circles, circleItems, filter]);

  const groupedByEvent = useMemo(() => {
    const groups = new Map<string, { event: DoujinEvent | null; entries: Entry[] }>();
    for (const entry of soldoutEntries) {
      const key = entry.circle.eventId ?? '__orphan__';
      if (!groups.has(key)) {
        const event = key === '__orphan__' ? null : (events.find(e => e.id === key) ?? null);
        groups.set(key, { event, entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    }
    return Array.from(groups.values());
  }, [soldoutEntries, events]);

  const handleOnlineStatusChange = async (item: CircleItem, status: CircleItemOnlineStatus) => {
    await circleItemsApi.update(item.id, { onlineStatus: status });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('このアイテムを買い物リストから削除しますか？')) return;
    await circleItemsApi.delete(itemId);
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  if (l1 || l2 || l3) {
    return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  }

  const totalCount = soldoutEntries.length;
  const counts = {
    unchecked:        soldoutEntries.filter(e => (e.item.onlineStatus ?? 'unchecked') === 'unchecked').length,
    available_online: soldoutEntries.filter(e => e.item.onlineStatus === 'available_online').length,
    unavailable:      soldoutEntries.filter(e => e.item.onlineStatus === 'unavailable').length,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-zinc-100">通販確認リスト</h1>
      </div>
      <div className="mb-4">
        <ShoppingTabs />
      </div>

      <div className="flex items-center justify-between mb-4 text-xs flex-wrap gap-2">
        <div className="text-zinc-500">
          {totalCount} 件（未確認 <span className="text-zinc-300 font-semibold">{counts.unchecked}</span> ·
          発見 <span className="text-green-400 font-semibold">{counts.available_online}</span> ·
          入手不可 <span className="text-rose-400 font-semibold">{counts.unavailable}</span>）
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
          <Filter className="w-3 h-3 ml-2 text-zinc-600" />
          {([
            { v: 'all',              l: '全て' },
            { v: 'unchecked',        l: '未確認' },
            { v: 'available_online', l: '発見' },
            { v: 'unavailable',      l: '入手不可' },
          ] as const).map(o => (
            <button
              key={o.v}
              onClick={() => setFilter(o.v)}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                filter === o.v ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>{filter === 'all' ? '完売アイテムがありません' : '該当するアイテムがありません'}</p>
          <p className="text-xs mt-1">即売会で「完売」にステータスを変更したアイテムが表示されます</p>
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
                    const expanded = expandedItemId === item.id;
                    const status = item.onlineStatus ?? 'unchecked';
                    const defaultQuery = item.title || circle.name;
                    const query = (queryByItem[item.id] ?? defaultQuery).trim();

                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-14 flex-shrink-0 rounded bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-700 text-[10px]">
                            {item.coverUrl ? (
                              <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>NO IMG</span>
                            )}
                          </div>

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
                            <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${onlineStatusClass[status]}`}>
                              {onlineStatusLabel[status]}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <button
                              onClick={() => setExpandedItemId(expanded ? null : item.id)}
                              className="px-2.5 py-1.5 text-[11px] rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-1"
                            >
                              <Search className="w-3 h-3" />
                              通販で探す
                              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                              title="リストから削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-zinc-800 space-y-3 overflow-hidden"
                          >
                            {/* Query input */}
                            <div>
                              <label className="block text-[11px] text-zinc-500 mb-1">検索キーワード</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={queryByItem[item.id] ?? defaultQuery}
                                  onChange={e =>
                                    setQueryByItem(prev => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  className="flex-1 bg-zinc-800/50 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-zinc-400"
                                  placeholder="タイトルやサークル名"
                                />
                                <button
                                  onClick={() =>
                                    setQueryByItem(prev => ({ ...prev, [item.id]: item.title }))
                                  }
                                  className="px-2 py-1.5 text-[11px] rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                                >
                                  作品名
                                </button>
                                <button
                                  onClick={() =>
                                    setQueryByItem(prev => ({ ...prev, [item.id]: circle.name }))
                                  }
                                  className="px-2 py-1.5 text-[11px] rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                                >
                                  サークル名
                                </button>
                              </div>
                            </div>

                            {/* Online store buttons */}
                            <div>
                              <p className="text-[11px] text-zinc-500 mb-1.5">通販サイトで検索</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ONLINE_STORES.map(store => (
                                  <a
                                    key={store.id}
                                    href={query ? store.buildSearchUrl(query) : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => { if (!query) e.preventDefault(); }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                                      query
                                        ? store.chipClass
                                        : 'bg-zinc-800/50 text-zinc-700 border-zinc-800 cursor-not-allowed'
                                    }`}
                                  >
                                    {store.name}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* Status mark */}
                            <div>
                              <p className="text-[11px] text-zinc-500 mb-1.5">確認結果</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {(['unchecked', 'available_online', 'unavailable'] as CircleItemOnlineStatus[]).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleOnlineStatusChange(item, s)}
                                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                                      status === s
                                        ? onlineStatusClass[s]
                                        : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                                    }`}
                                  >
                                    {onlineStatusLabel[s]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnavailableListPage;
