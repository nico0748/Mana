import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { db } from '../lib/db';
import type { Circle } from '../types';
import { Button } from '../components/ui/Button';

const NavModePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [done, setDone] = useState(false);

  const circles = useLiveQuery(
    () => db.circles.orderBy('order').filter(c => c.status === 'pending' || c.status === 'skipped').toArray(),
    []
  );
  const circleItems = useLiveQuery(() => db.circleItems.toArray(), []);

  if (circles === undefined) {
    return <div className="flex items-center justify-center min-h-screen text-zinc-400">読み込み中...</div>;
  }

  const total = circles.length;

  const handleAction = async (status: Circle['status']) => {
    const circle = circles[currentIndex];
    if (!circle) return;
    await db.circles.update(circle.id, { status, updatedAt: Date.now() });
    if (currentIndex + 1 >= total) {
      setDone(true);
    } else {
      setDirection(1);
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
          <CheckCircle className="w-16 h-16 text-yellow-400 mx-auto" />
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
  const items = (circleItems ?? []).filter(i => i.circleId === circle.id);

  const variants = {
    enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -80, opacity: 0 }),
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col min-h-[calc(100dvh-7.5rem)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/shopping')}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">戻る</span>
        </button>
        <span className="text-sm text-zinc-500">{currentIndex + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-yellow-400 rounded-full"
          animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="text-sm text-zinc-500 mb-2 font-medium tracking-wider uppercase">次はここ！</div>

      {/* Circle card with slide animation */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={circle.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1"
        >
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-4">
            <div className="text-3xl font-bold text-yellow-400 tracking-widest mb-1 font-mono">
              {circle.hall} {circle.block}-{circle.number}
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-1">{circle.name}</h2>
            <p className="text-lg text-zinc-400 mb-4">{circle.author}</p>

            {items.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                        item.type === 'shinkan' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.type === 'shinkan' ? '新刊' : '既刊'}
                      </span>
                      <span className="text-zinc-300">{item.title}</span>
                    </div>
                    <span className="text-zinc-400">¥{item.price.toLocaleString()} × {item.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <span className="text-sm font-semibold text-yellow-400">
                    小計: ¥{items.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="space-y-3 mt-auto">
        <Button
          className="w-full h-14 text-lg font-bold"
          onClick={() => {
            setDirection(1);
            handleAction('bought');
          }}
        >
          買った！
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-red-400 border-red-900 hover:bg-red-950 hover:border-red-800"
          onClick={() => {
            setDirection(1);
            handleAction('soldout');
          }}
        >
          完売...
        </Button>
        <Button
          variant="ghost"
          className="w-full h-12 text-zinc-500 hover:text-zinc-300"
          onClick={() => {
            setDirection(1);
            handleAction('skipped');
          }}
        >
          スキップ
        </Button>
      </div>
    </div>
  );
};

export default NavModePage;
