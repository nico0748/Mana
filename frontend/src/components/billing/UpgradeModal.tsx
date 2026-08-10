import React, { useState } from 'react';
import { Crown, X, Check } from 'lucide-react';
import { type ResourceKey } from '../../lib/api';
import { Button } from '../ui/Button';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';

interface Props {
  open: boolean;
  onClose: () => void;
  resource?: ResourceKey;
  limit?: number | null;
  current?: number;
}

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  books: '蔵書',
  circles: 'サークル',
  events: 'イベント',
  distributions: '頒布物',
  venueMaps: '会場マップ',
};

const PRO_FEATURES = [
  '蔵書 無制限 (Free は 200冊まで)',
  'サークル 無制限 (Free は 50)',
  'イベント 無制限 (Free は 3)',
  '頒布物・会場マップも無制限',
  '今後追加される Pro 限定機能',
];

export const UpgradeModal: React.FC<Props> = ({ open, onClose, resource, limit, current }) => {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pro プランへのアップグレード"
        tabIndex={-1}
        className="w-full max-w-md bg-zinc-900 rounded-2xl border border-violet-500/40 shadow-2xl shadow-violet-900/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-6 pb-4 bg-gradient-to-br from-violet-600/20 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs font-medium mb-3">
            <Crown className="w-3.5 h-3.5" />
            Pro プラン
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100">
            {resource
              ? `${RESOURCE_LABELS[resource]}の上限に達しました`
              : 'Pro にアップグレード'}
          </h2>
          {resource && limit != null && (
            <p className="text-sm text-zinc-400 mt-1">
              現在 {current ?? limit} 件 / 上限 {limit} 件 (Free)
            </p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-800/60 rounded-xl">
            <button
              onClick={() => setInterval('monthly')}
              aria-pressed={interval === 'monthly'}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                interval === 'monthly'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              月額
            </button>
            <button
              onClick={() => setInterval('yearly')}
              aria-pressed={interval === 'yearly'}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                interval === 'yearly'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              年額
              <span className="ml-1 text-[10px] text-violet-300">2ヶ月分お得</span>
            </button>
          </div>

          <div className="text-center">
            {interval === 'monthly' ? (
              <>
                <div className="text-3xl font-bold text-zinc-100">
                  ¥480
                  <span className="text-base font-normal text-zinc-500"> / 月</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">いつでもキャンセル可能</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-zinc-100">
                  ¥4,800
                  <span className="text-base font-normal text-zinc-500"> / 年</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">月あたり ¥400 (2ヶ月お得)</div>
              </>
            )}
          </div>

          <ul className="space-y-2">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200/90 leading-relaxed">
            Pro プランは現在準備中です。リリースまでもう少々お待ちください。
          </div>

          <div className="space-y-2">
            <Button
              disabled
              className="w-full bg-zinc-800 text-zinc-500 cursor-not-allowed"
            >
              <Crown className="w-4 h-4 mr-2" />
              近日公開
            </Button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
