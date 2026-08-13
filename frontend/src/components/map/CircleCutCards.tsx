import React, { useRef } from 'react';
import { clsx } from 'clsx';
import type { Circle } from '../../types';
import type { MapCardPosition } from '../../contexts/AppSettingsContext';
import { CARD_WIDTH_PCT, cardHeightPct, layoutCards, spaceLabel } from '../../lib/mapCutCards';

interface Props {
  circles: Circle[];
  /** 保存済みの手動配置。circleId → 座標(%) */
  saved: Record<string, MapCardPosition> | undefined;
  /** 会場マップ画像の 幅 / 高さ */
  imageAspect: number;
  /** ドラッグでカードを動かせるか */
  draggable: boolean;
  /** 現在のズーム倍率。ドラッグ量を画像座標へ戻すのに使う */
  zoom: number;
  /** 画像の表示サイズ(px)。ピクセル移動量を % に変換するのに使う */
  imageSize: { w: number; h: number };
  onMove: (circleId: string, pos: MapCardPosition) => void;
  onSelect?: (circleId: string) => void;
}

/**
 * 会場マップの余白にお品書きカードを並べ、引き出し線でピンと結ぶオーバーレイ。
 *
 * マップ画像と同じ拡大縮小の中に置くので、座標はすべて画像に対する百分率。
 * 余白へ出すため 0-100 の外も使う（親が overflow: visible である前提）。
 */
export const CircleCutCards: React.FC<Props> = ({
  circles, saved, imageAspect, draggable, zoom, imageSize, onMove, onSelect,
}) => {
  const cards = layoutCards(circles, saved, imageAspect);
  const cardH = cardHeightPct(imageAspect);

  // ドラッグ中の状態。pointer capture でカード外に出ても追従させる
  const drag = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, card: (typeof cards)[number]) => {
    if (!draggable) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      id: card.circle.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: card.x,
      originY: card.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || imageSize.w === 0 || imageSize.h === 0) return;
    e.stopPropagation();
    // 画面上の移動量 → ズームを戻して画像座標 → 百分率
    const dx = ((e.clientX - d.startX) / zoom / imageSize.w) * 100;
    const dy = ((e.clientY - d.startY) / zoom / imageSize.h) * 100;
    onMove(d.id, { x: d.originX + dx, y: d.originY + dy });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
  };

  return (
    <>
      {/* 引き出し線。viewBox を 0-100 にして百分率をそのまま座標として使う。
          preserveAspectRatio="none" で歪むぶん、線幅は non-scaling-stroke で一定に保つ。 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {cards.map(card => (
          <g key={card.circle.id}>
            <line
              x1={card.anchorX} y1={card.anchorY}
              x2={card.pinX} y2={card.pinY}
              stroke={card.color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
            {/* ピン側の端点。線がどのピンに繋がっているか見失わないよう小さな丸を置く */}
            <circle
              cx={card.pinX} cy={card.pinY} r={2}
              fill={card.color}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {cards.map(card => (
        <div
          key={card.circle.id}
          className={clsx(
            'absolute rounded-sm border-2 bg-zinc-900 shadow-lg overflow-hidden',
            draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          )}
          style={{
            left: `${card.x}%`,
            top: `${card.y}%`,
            width: `${CARD_WIDTH_PCT}%`,
            height: `${cardH}%`,
            borderColor: card.color,
          }}
          onPointerDown={e => handlePointerDown(e, card)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={e => { e.stopPropagation(); onSelect?.(card.circle.id); }}
        >
          {/* スペース番号。カード上端に細く乗せる */}
          <div
            className="w-full px-0.5 text-[6px] leading-[1.4] font-medium text-zinc-950 truncate"
            style={{ backgroundColor: card.color }}
          >
            {spaceLabel(card.circle) || card.circle.name}
          </div>
          {card.circle.menuImageUrl ? (
            <img
              src={card.circle.menuImageUrl}
              alt={`${card.circle.name} のお品書き`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-0.5">
              <span className="text-[6px] leading-tight text-zinc-300 text-center line-clamp-3">
                {card.circle.name}
              </span>
            </div>
          )}
        </div>
      ))}
    </>
  );
};
