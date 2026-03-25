import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ShoppingBag, Navigation, ChevronRight, Lock } from 'lucide-react';
import { Button } from './ui/Button';

export const ONBOARDING_KEY = 'mana-onboarded';

const slides = [
  {
    icon: <BookOpen className="w-14 h-14 text-emerald-500" />,
    title: 'Mana Library へようこそ',
    description:
      '同人活動のライフサイクルをひとつのアプリで完結。コミケの準備から蔵書管理まで、まるごとサポートします。',
  },
  {
    icon: <ShoppingBag className="w-14 h-14 text-emerald-500" />,
    title: 'サークルを登録して予算管理',
    description:
      '行きたいサークルを事前に登録。アイテムと価格を追加して、当日の予算をあらかじめ把握できます。',
  },
  {
    icon: <Navigation className="w-14 h-14 text-emerald-500" />,
    title: '当日はナビモードで効率巡回',
    description:
      '次のサークルが自動で表示。買った・完売・スキップをワンタップで記録。ルート最適化で無駄のない動きができます。',
  },
  {
    icon: <Lock className="w-14 h-14 text-emerald-500" />,
    title: '蔵書管理 & 完全オフライン',
    description:
      'バーコードで即登録。同人誌も商業誌もすべて一棚に。アカウント不要・データはすべてあなたのデバイスに保存されます。',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const isLast = index === slides.length - 1;

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      goTo(index + 1);
    }
  };

  const slide = slides[index];

  const variants = {
    enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="mb-6 p-5 bg-emerald-500/10 rounded-2xl">
              {slide.icon}
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-3 leading-snug">
              {slide.title}
            </h2>
            <p className="text-zinc-400 leading-relaxed text-base">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-2 mt-10 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-emerald-500' : 'w-1.5 bg-zinc-700 hover:bg-zinc-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <Button className="w-full h-12" onClick={next}>
            {isLast ? (
              'はじめる'
            ) : (
              <span className="flex items-center justify-center gap-1">
                次へ <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
          {!isLast && (
            <button
              onClick={onComplete}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
