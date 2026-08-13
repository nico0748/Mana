import type { Circle } from '../types';
import type { MapCardPosition } from '../contexts/AppSettingsContext';
import { CARD_WIDTH_PCT, cardHeightPct, layoutCards, spaceLabel } from './mapCutCards';

/**
 * 会場マップ・ピン・お品書きカード・引き出し線を 1 枚の PNG に焼き込んで保存する。
 *
 * DOM のスクリーンショットではなく canvas に描き直しているので、画面のズーム状態や
 * スクロール位置に関係なく全体が入る。カードは画像の外側に出るため、余白を足した
 * キャンバスを用意して原点をずらして描く。
 */

export interface ExportOptions {
  mapImageUrl: string;
  circles: Circle[];
  /** カードを描くサークル（お品書き表示が ON のときだけ渡す） */
  cardCircles: Circle[];
  savedPositions: Record<string, MapCardPosition> | undefined;
  showPinNumbers: boolean;
  priorityById: Map<string, number>;
  fileName: string;
}

export interface ExportResult {
  /** カード画像のうち、CORS で canvas に描けず名前表示に代替したものの数 */
  skippedImages: number;
}

const STATUS_FILL: Record<string, string> = {
  pending: '#facc15',
  bought: '#10b981',
  soldout: '#ef4444',
};

/** 画像を読み込む。CORS で汚染される可能性があるものは crossOrigin を付けて試す */
function loadImage(src: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

/** data: URL は同一オリジン扱いで汚染しない。外部 URL だけ CORS が要る */
const needsCors = (src: string) => !src.startsWith('data:');

export async function exportMapImage(opts: ExportOptions): Promise<ExportResult> {
  const base = await loadImage(opts.mapImageUrl, needsCors(opts.mapImageUrl));
  const iw = base.naturalWidth;
  const ih = base.naturalHeight;
  const aspect = iw / ih;

  const cards = opts.cardCircles.length
    ? layoutCards(opts.cardCircles, opts.savedPositions, aspect)
    : [];
  const cardH = cardHeightPct(aspect);

  // カードが画像の外へどれだけはみ出すかを測って余白を決める
  let minX = 0, minY = 0, maxX = 100, maxY = 100;
  for (const c of cards) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + CARD_WIDTH_PCT);
    maxY = Math.max(maxY, c.y + cardH);
  }
  const padPct = 1;
  minX -= padPct; minY -= padPct; maxX += padPct; maxY += padPct;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((iw * (maxX - minX)) / 100);
  canvas.height = Math.round((ih * (maxY - minY)) / 100);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 百分率 → キャンバス座標
  const px = (p: number) => ((p - minX) / 100) * iw;
  const py = (p: number) => ((p - minY) / 100) * ih;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(base, px(0), py(0), iw, ih);

  // 引き出し線（カードの下、ピンの上に敷く）
  const lineWidth = Math.max(2, iw / 500);
  for (const c of cards) {
    ctx.strokeStyle = c.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(c.anchorX), py(c.anchorY));
    ctx.lineTo(px(c.pinX), py(c.pinY));
    ctx.stroke();
  }

  // カード
  let skippedImages = 0;
  const cardW = (CARD_WIDTH_PCT / 100) * iw;
  const cardHpx = (cardH / 100) * ih;
  const headerH = Math.max(10, cardHpx * 0.12);

  for (const c of cards) {
    const x = px(c.x);
    const y = py(c.y);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(x, y, cardW, cardHpx);

    let drewImage = false;
    if (c.circle.menuImageUrl) {
      try {
        const img = await loadImage(c.circle.menuImageUrl, needsCors(c.circle.menuImageUrl));
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + headerH, cardW, cardHpx - headerH);
        ctx.clip();
        // object-cover 相当。短辺に合わせて中央を切り出す
        const boxW = cardW;
        const boxH = cardHpx - headerH;
        const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, x + (boxW - dw) / 2, y + headerH + (boxH - dh) / 2, dw, dh);
        ctx.restore();
        drewImage = true;
      } catch {
        // 読み込めない画像は名前表示で代替し、書き出し自体は続行する
        skippedImages++;
      }
    }

    if (!drewImage) {
      ctx.fillStyle = '#d4d4d8';
      ctx.font = `${Math.max(9, cardW * 0.12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.circle.name.slice(0, 8), x + cardW / 2, y + cardHpx / 2, cardW - 4);
    }

    // ヘッダー（スペース番号）
    ctx.fillStyle = c.color;
    ctx.fillRect(x, y, cardW, headerH);
    ctx.fillStyle = '#09090b';
    ctx.font = `${headerH * 0.75}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(spaceLabel(c.circle) || c.circle.name, x + 2, y + headerH / 2, cardW - 4);

    // 枠線
    ctx.strokeStyle = c.color;
    ctx.lineWidth = Math.max(1.5, iw / 800);
    ctx.strokeRect(x, y, cardW, cardHpx);
  }

  // ピン
  const pinR = Math.max(4, iw / 220);
  for (const circle of opts.circles) {
    if (circle.mapX == null || circle.mapY == null) continue;
    const cx = px(circle.mapX);
    const cy = py(circle.mapY);

    ctx.beginPath();
    ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
    ctx.fillStyle = STATUS_FILL[circle.status] ?? '#71717a';
    ctx.fill();
    ctx.lineWidth = Math.max(1, pinR * 0.25);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const num = opts.priorityById.get(circle.id);
    if (opts.showPinNumbers && num != null) {
      // ピン内の数字は黒。白いマップ上の黄ピンでも読めるようにするため
      ctx.fillStyle = '#18181b';
      ctx.font = `bold ${pinR * 1.1}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), cx, cy);
    }
  }

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('画像の生成に失敗しました');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { skippedImages };
}

/** ファイル名に使えない文字を落とす */
export function safeFileName(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('_')
    .replace(/[\\/:*?"<>|]/g, '')
    .slice(0, 120) || 'map';
}
