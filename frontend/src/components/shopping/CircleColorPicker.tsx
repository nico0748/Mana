import React from 'react';
import { clsx } from 'clsx';
import { Check, Ban } from 'lucide-react';
import { CIRCLE_COLORS, colorLabel } from '../../lib/circleColors';

interface Props {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  /** 即売会ごとの色ラベル。あれば色名の代わりに表示する */
  labels?: Record<string, string> | null;
}

/**
 * サークルの色を選ぶスウォッチ列。
 * 色そのものより「その色に付けた名前」で選びたいので、ラベルがあれば
 * ツールチップと読み上げ名をラベルに差し替える。
 */
export const CircleColorPicker: React.FC<Props> = ({ value, onChange, labels }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {/* 色なしに戻す */}
    <button
      type="button"
      onClick={() => onChange(null)}
      aria-pressed={!value}
      title="色なし"
      aria-label="色なし"
      className={clsx(
        'w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
        !value
          ? 'border-zinc-300 bg-zinc-700 text-zinc-100'
          : 'border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400',
      )}
    >
      <Ban className="w-3.5 h-3.5" />
    </button>

    {CIRCLE_COLORS.map(c => {
      const selected = value === c.key;
      const name = colorLabel(c.key, labels);
      return (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          aria-pressed={selected}
          title={name}
          aria-label={name}
          className={clsx(
            'w-7 h-7 rounded-full flex items-center justify-center transition-transform',
            // 選択中は白リングで囲む。色そのものは変えないので見分けが付く
            selected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-105' : 'hover:scale-110',
          )}
          style={{ backgroundColor: c.hex }}
        >
          {selected && <Check className="w-4 h-4 text-zinc-950" />}
        </button>
      );
    })}
  </div>
);
