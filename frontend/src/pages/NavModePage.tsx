import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Map, Route } from 'lucide-react';
import { circlesApi, circleItemsApi } from '../lib/api';
import type { Circle } from '../types';
import { Button } from '../components/ui/Button';
import { useVenueGraph, applyOptimalRoute, EVENT_KEY } from '../hooks/useVenueRoute';

const NavModePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [optimizing, setOptimizing] = useState(false);
  const eventCode = localStorage.getItem(EVENT_KEY) ?? 'c105';
  const graph = useVenueGraph(eventCode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  const { data: allCircles = [], isLoading } = useQuery({
    queryKey: ['circles'],
    queryFn: circlesApi.list,
  });
  const { data: circleItems = [] } = useQuery({
    queryKey: ['circleItems'],
    queryFn: circleItemsApi.list,
  });

  const circles: Circle[] = allCircles
    .filter(c =>
      (c.status === 'pending' || c.status === 'skipped') &&
      (!eventId || c.eventId === eventId)
    )
    .sort((a, b) => a.order - b.order);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Circle> }) =>
      circlesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['circles'] }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-zinc-400">読み込み中...</div>;
  }

  const total = circles.length;

  const handleOptimizeRoute = async () => {
    if (!graph || circles.length === 0) return;
    setOptimizing(true);
    try {
      await applyOptimalRoute(graph, circles);
      await queryClient.invalidateQueries({ queryKey: ['circles'] });
      setCurrentIndex(0);
    } finally {
      setOptimizing(false);
    }
  };

  const handleAction = async (status: Circle['status']) => {
    const circle = circles[currentIndex];
    if (!circle) return;
    await updateMutation.mutateAsync({ id: circle.id, data: { status, updatedAt: Date.now() } });
    if (currentIndex + 1 >= total) {
      setDone(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (done || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-4"
        >
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold text-zinc-100">おつかれさま！</h2>
          <p className="text-zinc-400">
            {total === 0 ? '購入予定のサークルがありません。' : 'すべてのサークルを回りました！'}
          </p>
          <Button onClick={() => navigate('/shopping')} className="mt-4">
            リストに戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  const circle = circles[currentIndex];
  const items = circleItems.filter(i => i.circleId === circle.id);

  const variants = {
    enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -80, opacity: 0 }),
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col min-h-[calc(100dvh-7.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/shopping')}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">戻る</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOptimizeRoute}
            disabled={optimizing || !graph}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-500 disabled:opacity-40 transition-colors"
            title="ルート最適化"
          >
            <Route className="w-3.5 h-3.5" />
            {optimizing ? '計算中' : '最適化'}
          </button>
          <Link
            to={`/map?hall=${encodeURIComponent(circle.hall)}&highlight=${circle.id}`}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-500 transition-colors"
          >
            <Map className="w-3.5 h-3.5" />
            MAP
          </Link>
          <span className="text-sm text-zinc-500">{currentIndex + 1} / {total}</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-emerald-500 rounded-full"
          animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="text-sm text-zinc-500 mb-2 font-medium tracking-wider uppercase">次はここ！</div>

      <AnimatePresence mode="wait" custom={1}>
        <motion.div
          key={circle.id}
          custom={1}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1"
        >
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-4">
            <div className="text-3xl font-bold text-emerald-500 tracking-widest mb-1 font-mono">
              {circle.hall} {circle.block}-{circle.number}
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-1">{circle.name}</h2>
            <p className="text-lg text-zinc-400 mb-4">{circle.author}</p>

            {circle.menuImageUrl && (
              <div className="mb-3">
                <img src={circle.menuImageUrl} alt="メニュー" className="w-full max-h-40 object-contain rounded-lg border border-zinc-800" />
              </div>
            )}

            {items.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                        item.type === 'shinkan' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.type === 'shinkan' ? '新刊' : '既刊'}
                      </span>
                      <span className="text-zinc-300">{item.title}</span>
                    </div>
                    <span className="text-zinc-400">¥{item.price.toLocaleString()} × {item.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <span className="text-sm font-semibold text-emerald-500">
                    小計: ¥{items.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}
                  </span>
                </div>
                {items.some(i => i.coverUrl) && (
                  <div className="flex gap-2 overflow-x-auto pt-2 pb-1 mt-2 border-t border-zinc-800">
                    {items.filter(i => i.coverUrl).map(item => (
                      <div key={item.id} className="flex-shrink-0">
                        <img src={item.coverUrl} alt={item.title} className="h-20 w-14 object-cover rounded-md border border-zinc-700" />
                        <p className="text-xs text-zinc-500 mt-1 w-14 truncate text-center">{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-3 mt-auto">
        <Button className="w-full h-14 text-lg font-bold" onClick={() => handleAction('bought')}>
          買った！
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-red-400 border-red-900 hover:bg-red-950 hover:border-red-800"
          onClick={() => handleAction('soldout')}
        >
          完売...
        </Button>
        <Button
          variant="ghost"
          className="w-full h-12 text-zinc-500 hover:text-zinc-300"
          onClick={() => handleAction('skipped')}
        >
          スキップ
        </Button>
      </div>
    </div>
  );
};

export default NavModePage;
