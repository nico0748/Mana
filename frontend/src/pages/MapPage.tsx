import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Upload, MapPin, Edit2, Check, X, History,
  Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus,
  RotateCcw, RotateCw, Crop, FileJson,
  Maximize2, Minimize2, ArrowUp, ArrowDown, MoveHorizontal,
  Image as ImageIcon, Download, Move, Lock, MoveDiagonal,
} from 'lucide-react';
import { eventsApi, circlesApi, venueMapsApi, circleItemsApi } from '../lib/api';
import { applyCircleStatusChange, applyItemStatusChange } from '../lib/offlineMutations';
import { renderPdfPageToDataUrl } from '../lib/pdfUtils';
import type { CircleItem, DoujinEvent, EventTemplate } from '../types';
import { clsx } from 'clsx';
import TemplateImportModal from '../components/map/TemplateImportModal';
import { useAppSettings } from '../contexts/AppSettingsContext';
import type { MapEventSortKey, MapHallSortKey, SortDir } from '../contexts/AppSettingsContext';
import { sortEvents, sortHalls, todayKey, moveItem, isManuallyOrdered, isPastEvent } from '../lib/mapHeaderSort';
import { CircleCutCards } from '../components/map/CircleCutCards';
import { cardPositionKey } from '../lib/mapCutCards';
import { colorHex, colorLabel } from '../lib/circleColors';
import { exportMapImage, safeFileName } from '../lib/mapExport';
import type { MapCardPosition } from '../contexts/AppSettingsContext';

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-400 border-yellow-200',
  bought: 'bg-emerald-500 border-emerald-300',
  soldout: 'bg-red-500 border-red-400',
};

const statusLabel: Record<string, string> = {
  pending: '未購入',
  bought: '購入済',
  soldout: '完売',
};

const EVENT_SORT_KEYS: MapEventSortKey[] = ['date', 'name', 'created'];
const EVENT_SORT_LABEL: Record<MapEventSortKey, string> = {
  date: '開催日', name: '名前', created: '登録順',
};
const HALL_SORT_KEYS: MapHallSortKey[] = ['name', 'created'];
const HALL_SORT_LABEL: Record<MapHallSortKey, string> = {
  name: '名前', created: '登録順',
};

const tabBtn = 'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0';
const toolBtn = 'flex items-center justify-center px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-shrink-0';

interface SortControlsProps {
  /** aria-label 用の対象名。「即売会」「ホール」 */
  target: string;
  sortLabel: string;
  dir: SortDir;
  /** 手動並べ替え順が保存済みか。true の間は基準・方向の指定は効かない */
  hasManualOrder: boolean;
  reorderMode: boolean;
  onCycleKey: () => void;
  onToggleDir: () => void;
  onToggleReorder: () => void;
  onResetOrder: () => void;
}

/** 二重ヘッダー右端の並べ替えコントロール（基準切り替え・昇降順・手動並べ替え） */
const SortControls: React.FC<SortControlsProps> = ({
  target, sortLabel, dir, hasManualOrder, reorderMode,
  onCycleKey, onToggleDir, onToggleReorder, onResetOrder,
}) => (
  <div className="flex items-center gap-0.5 flex-shrink-0">
    {hasManualOrder ? (
      <button
        onClick={onResetOrder}
        className={toolBtn}
        title={`${target}の手動並べ替えを解除して自動ソートに戻す`}
        aria-label={`${target}の手動並べ替えを解除`}
      >
        手動 <RotateCcw className="w-3 h-3 ml-1" />
      </button>
    ) : (
      <>
        <button
          onClick={onCycleKey}
          className={toolBtn}
          title={`${target}の並び順: ${sortLabel}（クリックで切り替え）`}
          aria-label={`${target}の並び順を切り替え。現在: ${sortLabel}`}
        >
          {sortLabel}
        </button>
        <button
          onClick={onToggleDir}
          className={toolBtn}
          title={dir === 'asc' ? '昇順' : '降順'}
          aria-label={`${target}を${dir === 'asc' ? '降順' : '昇順'}に切り替え`}
        >
          {dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      </>
    )}
    <button
      onClick={onToggleReorder}
      aria-pressed={reorderMode}
      title={`${target}を手動で並べ替え`}
      aria-label={`${target}の手動並べ替えモード`}
      className={clsx(
        'flex items-center justify-center p-1.5 rounded-md transition-colors flex-shrink-0',
        reorderMode
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
      )}
    >
      <MoveHorizontal className="w-3.5 h-3.5" />
    </button>
  </div>
);

interface ReorderArrowsProps {
  label: string;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMove: (delta: -1 | 1) => void;
}

/** 手動並べ替えモード中、各タブの右に出る ◀ ▶ */
const ReorderArrows: React.FC<ReorderArrowsProps> = ({ label, canMoveLeft, canMoveRight, onMove }) => (
  <>
    <button
      onClick={() => onMove(-1)}
      disabled={!canMoveLeft}
      aria-label={`${label} を前へ移動`}
      className="p-0.5 rounded hover:bg-black/20 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="w-3 h-3" />
    </button>
    <button
      onClick={() => onMove(1)}
      disabled={!canMoveRight}
      aria-label={`${label} を後ろへ移動`}
      className="p-0.5 rounded hover:bg-black/20 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <ChevronRight className="w-3 h-3" />
    </button>
  </>
);

const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const highlightId = searchParams.get('highlight');
  const defaultHall = searchParams.get('hall');
  const { settings, update } = useAppSettings();
  const markerSize = settings.mapMarkerSize;
  const markerShape = settings.mapMarkerShape;
  const completedVisibility = settings.mapCompletedVisibility;
  const showPinNumbers = settings.showMapPinNumbers;
  const showCutCards = settings.mapShowCutCards;
  const dragMode = settings.mapDragMode;

  // 二重ヘッダーの手動並べ替えモード（即売会・ホールで独立）
  const [eventReorderMode, setEventReorderMode] = useState(false);
  const [hallReorderMode, setHallReorderMode] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);

  // Zoom + pan state (pan は zoom > 1 のときに非表示領域にスライドできる)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [outerSize, setOuterSize] = useState<{ w: number; h: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // クリックで開くポップアップ。マップコンテナの overflow-hidden / scale 影響を受けない
  // よう、document.body に portal でレンダリングする。座標はクリック時の viewport 値。
  type Placement = {
    vertical: 'above' | 'below';
    horizontal: 'left' | 'center' | 'right';
  };
  const [clickedPopup, setClickedPopup] = useState<{
    circleId: string;
    pinX: number;
    pinY: number;
    pinR: number; // ピンの半径(viewport px)
    placement: Placement;
  } | null>(null);

  // Esc で全画面解除 / popup クローズ
  useEffect(() => {
    if (!fullscreen && !clickedPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (clickedPopup) setClickedPopup(null);
      else if (fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, clickedPopup]);

  // ピンクリック時に viewport との位置関係から見切れない popup の置き場所を決める
  const computePlacement = (rect: DOMRect): Placement => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const POPUP_W = 220;   // max-w-[220px]
    const POPUP_H = 280;   // header(50) + status(40) + items(max 160) + padding 余裕
    const M = 8;

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const vertical: 'above' | 'below' =
      spaceAbove >= POPUP_H + M ? 'above' :
      spaceBelow >= POPUP_H + M ? 'below' :
      spaceAbove >= spaceBelow ? 'above' : 'below';

    const cx = rect.left + rect.width / 2;
    const horizontal: 'left' | 'center' | 'right' =
      cx - POPUP_W / 2 < M ? 'left' :
      cx + POPUP_W / 2 > vw - M ? 'right' :
      'center';

    return { vertical, horizontal };
  };

  // Crop mode
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Event selection for map management
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    () => searchParams.get('eventId') ?? null
  );

  // Template import modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Add-hall inline input
  const [showAddHall, setShowAddHall] = useState(false);
  const [newHallName, setNewHallName] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapOuterElRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Track outer map area size for aspect-ratio coordinate fix (callback ref)
  const mapOuterRef = useCallback((el: HTMLDivElement | null) => {
    mapOuterElRef.current = el;
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setOuterSize({ w: width, h: height });
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // iOS Safari は orientation change 後にレイアウトが何段階かに分けて確定する
  // (browser chrome の伸縮、safe area、visualViewport 更新など)。
  // 1 回の getBoundingClientRect では捉えきれないため、複数のタイミングで
  // 再測定する。ResizeObserver はサイズ未変化なら何もしないので冗長でも害なし。
  // 加えて visualViewport.scroll/resize でも再描画 → popup の live-measure を
  // 走らせて URL bar の動的伸縮に追従させる。
  const [, bumpRerender] = useState(0);
  useEffect(() => {
    const updateSize = () => {
      if (mapOuterElRef.current) {
        const rect = mapOuterElRef.current.getBoundingClientRect();
        setOuterSize({ w: rect.width, h: rect.height });
      }
    };
    const forceRerender = () => bumpRerender(v => v + 1);
    const onResize = () => {
      updateSize();
      forceRerender();
      // 100/300/600ms で再測定 — iOS の遅延レイアウト確定をカバー
      window.setTimeout(() => { updateSize(); forceRerender(); }, 100);
      window.setTimeout(() => { updateSize(); forceRerender(); }, 300);
      window.setTimeout(() => { updateSize(); forceRerender(); }, 600);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    // visualViewport は iOS Safari でアドレスバー伸縮時の本命イベント
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', forceRerender);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', forceRerender);
    };
  }, []);

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: circles } = useQuery({ queryKey: ['circles'], queryFn: circlesApi.list });
  const { data: venueMaps } = useQuery({ queryKey: ['venueMaps'], queryFn: venueMapsApi.list });
  const { data: circleItems } = useQuery({ queryKey: ['circleItems'], queryFn: circleItemsApi.list });

  // ── 即売会タブの並び順 ──────────────────────────────────────────────────────
  // 開催日を過ぎた即売会は未実施の後ろへ自動的に送る。手動並べ替え済みならそちらが最優先。
  const today = useMemo(() => todayKey(), []);
  const eventsManuallyOrdered = isManuallyOrdered(events ?? []);
  const sortedEvents = useMemo(
    () => sortEvents(events ?? [], settings.mapEventSortKey, settings.mapEventSortDir, today),
    [events, settings.mapEventSortKey, settings.mapEventSortDir, today],
  );

  // Auto-select event
  useEffect(() => {
    if (selectedEventId !== null) return;
    if (!events || !circles || !venueMaps) return;
    const urlEventId = searchParams.get('eventId');
    if (urlEventId) { setSelectedEventId(urlEventId); return; }
    const hasOrphans = circles.some(c => !c.eventId) || venueMaps.some(m => !m.eventId);
    if (!hasOrphans && sortedEvents.length > 0) {
      // 並べ替え後の先頭 = 直近の未実施イベントを既定で開く
      setSelectedEventId(sortedEvents[0].id);
    }
  }, [events?.length, circles?.length, venueMaps?.length]);

  // ── Event-scoped data ──────────────────────────────────────────────────────

  const hasOrphanData =
    (circles ?? []).some(c => !c.eventId) ||
    (venueMaps ?? []).some(m => !m.eventId);

  const eventCircles = useMemo(
    () => (circles ?? []).filter(c =>
      selectedEventId !== null ? c.eventId === selectedEventId : !c.eventId
    ),
    [circles, selectedEventId],
  );

  // 即売会全体での優先順位（買い物リストの番号と完全一致させる）。
  // ホール跨ぎでも一意な通し番号で、ホール内では番号が飛ぶ仕様。
  const eventPriorityById = React.useMemo(() => {
    const sorted = [...eventCircles].sort((a, b) => a.order - b.order);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.id, i + 1));
    return map;
  }, [eventCircles]);

  // ホールは Circle / VenueMap から導出される文字列。この配列の順序が「登録順」になる。
  const halls = useMemo(() => {
    const fromCircles = eventCircles.map(c => c.hall).filter(Boolean) as string[];
    const fromMaps = (venueMaps ?? [])
      .filter(m => selectedEventId !== null ? m.eventId === selectedEventId : !m.eventId)
      .map(m => m.hall);
    return [...new Set([...fromCircles, ...fromMaps])];
  }, [eventCircles, venueMaps, selectedEventId]);

  // ホールの手動並べ替え順は即売会ごとに持つ（未分類は空文字キー）
  const hallOrderKey = selectedEventId ?? '';
  const manualHallOrder = settings.mapHallOrder[hallOrderKey];
  const hallsManuallyOrdered = !!manualHallOrder?.length;
  const sortedHalls = useMemo(
    () => sortHalls(halls, settings.mapHallSortKey, settings.mapHallSortDir, manualHallOrder),
    [halls, settings.mapHallSortKey, settings.mapHallSortDir, manualHallOrder],
  );

  const [selectedHall, setSelectedHall] = useState<string>(defaultHall ?? '');

  useEffect(() => {
    setSelectedHall('');
    setPdfFile(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setEditMode(false);
    setSelectedCircleId(null);
    setCropMode(false);
    setCropRect(null);
    setHallReorderMode(false);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedHall && sortedHalls.length > 0) {
      setSelectedHall(defaultHall ?? sortedHalls[0]);
    }
  }, [sortedHalls, defaultHall, selectedHall]);

  useEffect(() => {
    setPdfFile(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setCropMode(false);
    setCropRect(null);
  }, [selectedHall]);

  const hallCircles = eventCircles.filter(c => c.hall === selectedHall);
  const pendingCircles = hallCircles.filter(c => c.status === 'pending');
  const doneCircles = hallCircles.filter(c => c.status === 'bought' || c.status === 'soldout');
  const pinnedCircles = hallCircles.filter(c =>
    c.mapX != null
      && c.mapY != null
      && (completedVisibility !== 'hidden' || c.status === 'pending'),
  );

  const currentMap = (venueMaps ?? []).find(
    m => m.hall === selectedHall && m.eventId === (selectedEventId ?? undefined)
  );

  // Reset zoom/pan/popup when map changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setClickedPopup(null);
  }, [currentMap?.id]);

  // zoom = 1 のとき pan は意味がないので 0 にリセット
  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // 画像の自然サイズを programmatic に取得。React の <img onLoad> は data URL や
  // キャッシュヒット時に発火しないことがあり、初回ロードでピンが見えない原因に
  // なっていた。new Image() で確実に取得する。
  useEffect(() => {
    if (!currentMap?.imageDataUrl) {
      setImgNaturalSize(null);
      return;
    }
    setImgNaturalSize(null);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && mountedRef.current) {
        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.src = currentMap.imageDataUrl;
    // 同期的にデコード可能なケース（小さい data URL 等）
    if (img.complete && img.naturalWidth > 0) {
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
    return () => { cancelled = true; };
  }, [currentMap?.imageDataUrl]);

  // Compute image content box within outer container (eliminates letterbox coordinate mismatch)
  const imageBox = useMemo(() => {
    if (!outerSize || !imgNaturalSize) return null;
    const { w: cw, h: ch } = outerSize;
    const { w: iw, h: ih } = imgNaturalSize;
    const ir = iw / ih;
    const cr = cw / ch;
    let w: number, h: number;
    if (ir > cr) { w = cw; h = cw / ir; }
    else { h = ch; w = ch * ir; }
    return { w, h, cx: cw / 2, cy: ch / 2 };
  }, [outerSize, imgNaturalSize]);

  // pan の最大値: 画像が viewport からはみ出す半分の量
  const panLimit = imageBox && zoom > 1
    ? { x: (imageBox.w * (zoom - 1)) / 2, y: (imageBox.h * (zoom - 1)) / 2 }
    : null;

  // zoom 変化で pan が新しい上限を超えていたら clamp
  useEffect(() => {
    if (!panLimit) return;
    setPan(p => ({
      x: Math.max(-panLimit.x, Math.min(panLimit.x, p.x)),
      y: Math.max(-panLimit.y, Math.min(panLimit.y, p.y)),
    }));
    // panLimit object identity でなく実数で比較
  }, [panLimit?.x, panLimit?.y]);

  const panStep = imageBox ? Math.min(imageBox.w, imageBox.h) * 0.25 : 100;
  const clampPan = (x: number, y: number) => {
    if (!panLimit) return { x: 0, y: 0 };
    return {
      x: Math.max(-panLimit.x, Math.min(panLimit.x, x)),
      y: Math.max(-panLimit.y, Math.min(panLimit.y, y)),
    };
  };
  // ボタン: 矢印の向きが「見たい方向」。画像はその逆方向に動く
  const handlePanLeft  = () => setPan(p => clampPan(p.x + panStep, p.y));
  const handlePanRight = () => setPan(p => clampPan(p.x - panStep, p.y));
  const handlePanUp    = () => setPan(p => clampPan(p.x, p.y + panStep));
  const handlePanDown  = () => setPan(p => clampPan(p.x, p.y - panStep));

  // ズーム/全画面切替/コンテナサイズ変化(回転含む) で popup の位置を DOM から再測定。
  // 古い viewport 座標で popup が表示され続けてズレるのを防ぐ。
  useEffect(() => {
    if (!clickedPopup) return;
    const pinEl = document.querySelector<HTMLElement>(
      `[data-pin-id="${clickedPopup.circleId}"]`,
    );
    if (!pinEl) {
      setClickedPopup(null);
      return;
    }
    const rect = pinEl.getBoundingClientRect();
    setClickedPopup({
      circleId: clickedPopup.circleId,
      pinX: rect.left + rect.width / 2,
      pinY: rect.top + rect.height / 2,
      pinR: Math.max(rect.width, rect.height) / 2,
      placement: computePlacement(rect),
    });
    // clickedPopup を deps に入れると無限ループになるため除外（closure で参照）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, fullscreen, outerSize]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  }, []);

  // Callback ref for the fallback img.
  // onLoad does NOT re-fire when the browser serves a cached data URL.
  // This ref runs on every mount and immediately reads naturalWidth/Height if already complete,
  // which covers the cache-hit case that onLoad misses.
  const imgCallbackRef = useCallback((el: HTMLImageElement | null) => {
    if (!el) return;
    if (el.complete && el.naturalWidth > 0) {
      setImgNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
    }
    // onLoad covers the not-yet-decoded case
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMap?.id]); // re-evaluate when map changes (same timing as the reset useEffect)

  const handleRotate = async (dir: 'cw' | 'ccw') => {
    if (!currentMap || processing) return;
    setProcessing(true);
    try {
      const img = new Image();
      img.src = currentMap.imageDataUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d')!;
      if (dir === 'cw') {
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, canvas.height);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      // 90° 回転で X/Y 軸が入れ替わるので、ピン座標を変換する
      // CW  (時計回り): (x, y) → (100 - y, x)
      // CCW (反時計回り): (x, y) → (y, 100 - x)
      const pinned = hallCircles.filter(c => c.mapX != null && c.mapY != null);
      await Promise.all(pinned.map(c => {
        const newX = dir === 'cw' ? 100 - (c.mapY as number) : (c.mapY as number);
        const newY = dir === 'cw' ? (c.mapX as number) : 100 - (c.mapX as number);
        return circlesApi.update(c.id, { mapX: newX, mapY: newY });
      }));
      await saveMapDataUrl(selectedHall, dataUrl);
      setImgNaturalSize(null);
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    } finally {
      setProcessing(false);
    }
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCropStart({ x, y });
    setCropRect(null);
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropMode || !cropStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCropRect({ x: cropStart.x, y: cropStart.y, w: x - cropStart.x, h: y - cropStart.y });
  };

  const handleCropPointerUp = () => {
    if (!cropMode) return;
    setCropStart(null);
  };

  const handleApplyCrop = async () => {
    if (!currentMap || !cropRect || processing) return;
    const nx = Math.min(cropRect.x, cropRect.x + cropRect.w);
    const ny = Math.min(cropRect.y, cropRect.y + cropRect.h);
    const nw = Math.abs(cropRect.w);
    const nh = Math.abs(cropRect.h);
    if (nw < 1 || nh < 1) return;
    setProcessing(true);
    try {
      const img = new Image();
      img.src = currentMap.imageDataUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const sx = (nx / 100) * img.naturalWidth;
      const sy = (ny / 100) * img.naturalHeight;
      const sw = (nw / 100) * img.naturalWidth;
      const sh = (nh / 100) * img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      // Remap pin coordinates to new crop area; remove pins outside the crop
      await Promise.all(hallCircles.map(c => {
        if (c.mapX == null || c.mapY == null) return Promise.resolve();
        const newX = (c.mapX - nx) / nw * 100;
        const newY = (c.mapY - ny) / nh * 100;
        if (newX < 0 || newX > 100 || newY < 0 || newY > 100) {
          return circlesApi.update(c.id, { mapX: undefined, mapY: undefined });
        }
        return circlesApi.update(c.id, { mapX: newX, mapY: newY });
      }));
      await saveMapDataUrl(selectedHall, dataUrl);
      setImgNaturalSize(null);
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      setCropMode(false);
      setCropRect(null);
    } finally {
      setProcessing(false);
    }
  };

  const saveMapDataUrl = async (hall: string, imageDataUrl: string) => {
    const existing = (venueMaps ?? []).find(
      m => m.hall === hall && m.eventId === (selectedEventId ?? undefined)
    );
    if (existing) {
      await venueMapsApi.update(existing.id, { imageDataUrl });
    } else {
      await venueMapsApi.upsert({
        eventId: selectedEventId ?? undefined,
        hall,
        imageDataUrl,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedHall) return;
    const hall = selectedHall;
    if (file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfPage(1);
      const { dataUrl, totalPages } = await renderPdfPageToDataUrl(file, 1);
      setPdfTotalPages(totalPages);
      await saveMapDataUrl(hall, dataUrl);
    } else {
      setPdfFile(null);
      setPdfTotalPages(0);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (!mountedRef.current) return;
        await saveMapDataUrl(hall, ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePdfPageChange = async (newPage: number) => {
    if (!pdfFile || newPage < 1 || newPage > pdfTotalPages) return;
    setPdfPage(newPage);
    const { dataUrl } = await renderPdfPageToDataUrl(pdfFile, newPage);
    await saveMapDataUrl(selectedHall, dataUrl);
  };

  const handleDeleteMap = async () => {
    if (!currentMap) return;
    if (!confirm(`${selectedHall} の会場マップを削除しますか？`)) return;
    await venueMapsApi.delete(currentMap.id);
    queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
    setEditMode(false);
    setSelectedCircleId(null);
  };

  // Click on the image container to place a pin
  // getBoundingClientRect() accounts for CSS transforms, so zoom is handled correctly
  const handleMapClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    setClickedPopup(null);
    if (cropMode || !editMode || !selectedCircleId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    await circlesApi.update(selectedCircleId, { mapX: x, mapY: y });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
    setSelectedCircleId(null);
  }, [editMode, selectedCircleId, cropMode]);

  const handleRemovePin = async (circleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await circlesApi.update(circleId, { mapX: undefined, mapY: undefined });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  };

  const selectedEvent = sortedEvents.find(e => e.id === selectedEventId);
  const selectedEventName = selectedEvent?.name ?? '未分類';

  // ── お品書きカード ────────────────────────────────────────────────────────

  // カードを出すのはピンが打たれたサークル。お品書き画像が無いものは名前カードになる。
  const cardCircles = showCutCards ? pinnedCircles : [];
  const cardKey = cardPositionKey(selectedEventId, selectedHall);
  const savedCardPositions = settings.mapCardPositions[cardKey];
  const imageAspect = imgNaturalSize ? imgNaturalSize.w / imgNaturalSize.h : 1;

  const moveCard = (circleId: string, pos: MapCardPosition) => {
    update({
      mapCardPositions: {
        ...settings.mapCardPositions,
        [cardKey]: { ...settings.mapCardPositions[cardKey], [circleId]: pos },
      },
    });
  };

  const resetCardPositions = () => {
    const rest = { ...settings.mapCardPositions };
    delete rest[cardKey];
    update({ mapCardPositions: rest });
  };

  // ── 表示倍率のフィット ────────────────────────────────────────────────────

  // zoom=1 で画像全体が収まる（object-contain 相当）ので、全体表示は等倍に戻すだけ。
  const fitWhole = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // 横幅いっぱいまで拡大する。縦長の画像ほど倍率が大きくなる。
  const fitWidth = () => {
    if (!imageBox || !outerSize) return;
    const next = Math.min(4, Math.max(1, outerSize.w / imageBox.w));
    setZoom(next);
    setPan({ x: 0, y: 0 });
  };

  // ── 地図のドラッグパン ────────────────────────────────────────────────────

  const panDrag = useRef<
    { x: number; y: number; panX: number; panY: number; active: boolean } | null
  >(null);

  // 押した瞬間にポインタを捕捉するとピンのクリックを奪ってしまうので、
  // 一定距離動かして「ドラッグの意図あり」と判断できてから捕捉する。
  const PAN_DRAG_THRESHOLD_PX = 4;

  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 配置編集・切り抜き中は既存の操作を優先する
    if (dragMode !== 'map' || editMode || cropMode) return;
    panDrag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, active: false };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = panDrag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD_PX) return;
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setPan(clampPan(d.panX + dx, d.panY + dy));
  };

  const handleMapPointerUp = () => { panDrag.current = null; };

  // ── 画像として保存 ────────────────────────────────────────────────────────

  const [exporting, setExporting] = useState(false);

  const handleExportImage = async () => {
    if (!currentMap || exporting) return;
    setExporting(true);
    try {
      const { skippedImages } = await exportMapImage({
        mapImageUrl: currentMap.imageDataUrl,
        circles: pinnedCircles,
        cardCircles,
        savedPositions: savedCardPositions,
        showPinNumbers,
        priorityById: eventPriorityById,
        fileName: `${safeFileName([selectedEventName, selectedHall])}.png`,
      });
      if (skippedImages > 0) {
        // 外部ホストの画像は CORS 次第で canvas に描けない。落とさず知らせるだけにする。
        alert(`${skippedImages} 件のお品書き画像は読み込めなかったため、サークル名で書き出しました。`);
      }
    } catch (err) {
      console.error('[map] 画像の書き出しに失敗しました', err);
      alert('画像の書き出しに失敗しました。');
    } finally {
      setExporting(false);
    }
  };

  const handleAddHall = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHallName.trim();
    if (!name) return;
    setSelectedHall(name);
    setNewHallName('');
    setShowAddHall(false);
  };

  // ── 二重ヘッダーの並べ替え ──────────────────────────────────────────────────

  const cycleEventSortKey = () => {
    const i = EVENT_SORT_KEYS.indexOf(settings.mapEventSortKey);
    update({ mapEventSortKey: EVENT_SORT_KEYS[(i + 1) % EVENT_SORT_KEYS.length] });
  };

  const cycleHallSortKey = () => {
    const i = HALL_SORT_KEYS.indexOf(settings.mapHallSortKey);
    update({ mapHallSortKey: HALL_SORT_KEYS[(i + 1) % HALL_SORT_KEYS.length] });
  };

  const moveEvent = (id: string, delta: -1 | 1) => {
    const next = moveItem(sortedEvents, sortedEvents.findIndex(e => e.id === id), delta);
    if (!next) return;
    // 並べ替えは連打されるので、まず楽観更新して待ち時間をなくす。
    // 失敗しても最後の invalidate でサーバの値に戻るため、ここではログのみ。
    queryClient.setQueryData<DoujinEvent[]>(['events'], next.map((e, i) => ({ ...e, order: i })));
    void eventsApi.reorder(next.map(e => e.id))
      .catch(err => console.error('即売会の並べ替えに失敗しました', err))
      .finally(() => queryClient.invalidateQueries({ queryKey: ['events'] }));
  };

  const resetEventOrder = () => {
    void eventsApi.resetOrder()
      .then(() => setEventReorderMode(false))
      .catch(err => console.error('即売会の並べ替え解除に失敗しました', err))
      .finally(() => queryClient.invalidateQueries({ queryKey: ['events'] }));
  };

  const moveHall = (hall: string, delta: -1 | 1) => {
    const next = moveItem(sortedHalls, sortedHalls.indexOf(hall), delta);
    if (!next) return;
    update({ mapHallOrder: { ...settings.mapHallOrder, [hallOrderKey]: next } });
  };

  const resetHallOrder = () => {
    const rest = { ...settings.mapHallOrder };
    delete rest[hallOrderKey];
    update({ mapHallOrder: rest });
    setHallReorderMode(false);
  };

  const handleTemplateImport = async (
    template: EventTemplate,
    options: { includeCircles: boolean } = { includeCircles: false },
  ) => {
    const event = await eventsApi.create({
      name: template.name,
      date: template.date,
    });
    // テンプレートはマップ画像（imageDataUrl）込みで配布される。
    // 元の即売会で画像が登録されていなかったホールはここでは空文字のまま入る。
    await Promise.all(
      template.venueMaps.map(m =>
        venueMapsApi.upsert({
          eventId: event.id,
          hall: m.hall,
          imageDataUrl: m.imageDataUrl,
          generatedSvg: m.generatedSvg ?? undefined,
        })
      )
    );

    // ユーザーが「サークル情報も取り込む」を選んだ場合のみサークルを実体化する。
    // 状態は新規取り込みなので未購入 (pending) で開始。元のステータス・アイテムは持ち込まない。
    if (options.includeCircles && template.circles.length > 0) {
      await circlesApi.bulkCreate(
        template.circles.map(c => ({
          eventId: event.id,
          name: c.name,
          author: c.author,
          hall: c.hall,
          block: c.block,
          number: c.number,
          order: c.order,
          status: 'pending',
          xUrl: c.xUrl ?? undefined,
          menuImageUrl: c.menuImageUrl ?? undefined,
          mapX: c.mapX ?? undefined,
          mapY: c.mapY ?? undefined,
        }))
      );
      await queryClient.invalidateQueries({ queryKey: ['circles'] });
    }

    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
    setSelectedEventId(event.id);
  };

  // クリック popup の対象サークル
  const clickedCircle = clickedPopup
    ? pinnedCircles.find(c => c.id === clickedPopup.circleId) ?? null
    : null;
  const clickedItems = clickedCircle
    ? (circleItems ?? []).filter(i => i.circleId === clickedCircle.id)
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // モバイル: 3.5rem (上部ヘッダー) + 5rem (main の pb-20 = ボトムナビ分の余白) + safe-area-inset-bottom を差し引く
    // デスクトップ (sm+): ボトムナビなしなので header 分のみ差し引く
    <div className="flex flex-col h-[calc(100dvh-3.5rem-5rem-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-3.5rem)]">

      {/* ── Event selector row ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800/60 overflow-x-auto">
        <span className="text-xs text-zinc-600 flex-shrink-0">即売会</span>
        <span className="text-zinc-800 text-xs flex-shrink-0">|</span>
        {hasOrphanData && (
          <button
            onClick={() => setSelectedEventId(null)}
            aria-current={selectedEventId === null ? 'true' : undefined}
            className={clsx(
              tabBtn,
              selectedEventId === null
                ? 'bg-emerald-500 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            )}
          >
            未分類
          </button>
        )}
        {sortedEvents.map((event, i) => {
          const isActive = selectedEventId === event.id;
          const past = isPastEvent(event, today);
          return (
            <div
              key={event.id}
              className={clsx(
                'flex items-center flex-shrink-0 rounded-md',
                eventReorderMode && (isActive ? 'bg-emerald-500' : 'bg-zinc-800'),
              )}
            >
              <button
                onClick={() => setSelectedEventId(event.id)}
                aria-current={isActive ? 'true' : undefined}
                title={past ? `${event.name}（開催済み）` : event.name}
                className={clsx(
                  tabBtn,
                  isActive
                    ? 'bg-emerald-500 text-zinc-900'
                    : clsx('bg-zinc-800 hover:text-zinc-200', past ? 'text-zinc-600' : 'text-zinc-400'),
                  eventReorderMode && 'pr-1',
                )}
              >
                {event.name}
                {/* 開催済みは末尾に送られるので、理由がわかるよう控えめに印を付ける */}
                {past && <span className="ml-1 text-[10px] opacity-70">済</span>}
              </button>
              {eventReorderMode && (
                <div className={clsx('flex items-center pr-1', isActive ? 'text-zinc-900' : 'text-zinc-400')}>
                  <ReorderArrows
                    label={event.name}
                    canMoveLeft={i > 0}
                    canMoveRight={i < sortedEvents.length - 1}
                    onMove={delta => moveEvent(event.id, delta)}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div className="flex-1" />
        {sortedEvents.length > 1 && (
          <SortControls
            target="即売会"
            sortLabel={EVENT_SORT_LABEL[settings.mapEventSortKey]}
            dir={settings.mapEventSortDir}
            hasManualOrder={eventsManuallyOrdered}
            reorderMode={eventReorderMode}
            onCycleKey={cycleEventSortKey}
            onToggleDir={() => update({ mapEventSortDir: settings.mapEventSortDir === 'asc' ? 'desc' : 'asc' })}
            onToggleReorder={() => setEventReorderMode(v => !v)}
            onResetOrder={resetEventOrder}
          />
        )}
        <button
          onClick={() => setShowTemplateModal(true)}
          title="テンプレートから読み込む"
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-md transition-colors"
        >
          <FileJson size={12} />
          テンプレート
        </button>
      </div>

      {/* ── Hall tabs + tools row ────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">

          {/* Hall tabs */}
          <div className="flex gap-1 flex-1 overflow-x-auto items-center min-w-0">
            {sortedHalls.length === 0 && !showAddHall ? (
              <span className="text-xs text-zinc-500 py-1.5 whitespace-nowrap">
                ホールを追加するか、サークルを登録するとタブが表示されます
              </span>
            ) : (
              sortedHalls.map((hall, i) => {
                const isActive = selectedHall === hall;
                return (
                  <div
                    key={hall}
                    className={clsx(
                      'flex items-center flex-shrink-0 rounded-md',
                      hallReorderMode && (isActive ? 'bg-emerald-500' : 'bg-zinc-800'),
                    )}
                  >
                    <button
                      onClick={() => setSelectedHall(hall)}
                      aria-current={isActive ? 'true' : undefined}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                        isActive
                          ? 'bg-emerald-500 text-zinc-900'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200',
                        hallReorderMode && 'pr-1',
                      )}
                    >
                      {hall || '未設定'}
                    </button>
                    {hallReorderMode && (
                      <div className={clsx('flex items-center pr-1', isActive ? 'text-zinc-900' : 'text-zinc-400')}>
                        <ReorderArrows
                          label={hall || '未設定'}
                          canMoveLeft={i > 0}
                          canMoveRight={i < sortedHalls.length - 1}
                          onMove={delta => moveHall(hall, delta)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {showAddHall ? (
              <form onSubmit={handleAddHall} className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="text"
                  value={newHallName}
                  onChange={e => setNewHallName(e.target.value)}
                  placeholder="ホール名"
                  autoFocus
                  className="bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1 text-xs text-zinc-100 w-24 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <button
                  type="submit"
                  className="text-xs text-emerald-500 hover:text-emerald-400 px-1.5 py-1 rounded transition-colors"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddHall(false); setNewHallName(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-1 py-1 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddHall(true)}
                title="ホールを追加"
                className="p-1.5 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded-md transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {sortedHalls.length > 1 && (
            <SortControls
              target="ホール"
              sortLabel={HALL_SORT_LABEL[settings.mapHallSortKey]}
              dir={settings.mapHallSortDir}
              hasManualOrder={hallsManuallyOrdered}
              reorderMode={hallReorderMode}
              onCycleKey={cycleHallSortKey}
              onToggleDir={() => update({ mapHallSortDir: settings.mapHallSortDir === 'asc' ? 'desc' : 'asc' })}
              onToggleReorder={() => setHallReorderMode(v => !v)}
              onResetOrder={resetHallOrder}
            />
          )}

          {/* Image tools */}
          {selectedHall && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {currentMap ? '更新' : '会場マップを登録'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              {pdfTotalPages > 1 && (
                <div className="flex items-center gap-0.5 bg-zinc-800 rounded-md">
                  <button
                    onClick={() => handlePdfPageChange(pdfPage - 1)}
                    disabled={pdfPage <= 1}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-zinc-400 px-1 tabular-nums">{pdfPage}/{pdfTotalPages}</span>
                  <button
                    onClick={() => handlePdfPageChange(pdfPage + 1)}
                    disabled={pdfPage >= pdfTotalPages}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {currentMap && (
                <>
                  <button
                    onClick={() => handleRotate('ccw')}
                    disabled={processing}
                    title="左90°回転"
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRotate('cw')}
                    disabled={processing}
                    title="右90°回転"
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-40"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setCropMode(m => !m); setCropRect(null); setEditMode(false); setSelectedCircleId(null); }}
                    disabled={processing}
                    title="切り抜き"
                    className={clsx(
                      'p-1.5 rounded-md transition-colors disabled:opacity-40',
                      cropMode
                        ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700'
                    )}
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDeleteMap}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 bg-zinc-800 hover:bg-red-950 rounded-md transition-colors"
                    title="会場マップを削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Map area ────────────────────────────────────────────────────────── */}
      <div
        className={clsx(
          'overflow-hidden bg-zinc-950',
          fullscreen
            ? 'fixed inset-0 z-50'
            : 'flex-1 relative min-h-0',
        )}
      >
        {currentMap ? (
          <div
            ref={mapOuterRef}
            className={clsx(
              'w-full h-full bg-zinc-950 overflow-hidden relative',
              (editMode && selectedCircleId) || cropMode ? 'cursor-crosshair'
                : dragMode === 'map' ? 'cursor-grab active:cursor-grabbing' : '',
            )}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={handleMapPointerUp}
            onPointerCancel={handleMapPointerUp}
            // ネイティブ pinch-zoom を無効化 (iOS Safari でピン位置がズレる原因のため)。
            // ズームは右上の +/- ボタン、移動は zoom>1 時に出る方向ボタンで操作。
            // タップは touch-action の影響を受けない。
            style={{ touchAction: 'none' }}
          >
            {/* Fallback image shown before imageBox is computed (object-contain, no letterbox correction) */}
            <img
              ref={imgCallbackRef}
              src={currentMap.imageDataUrl}
              alt={`${selectedHall}の会場マップ`}
              className={clsx(
                'absolute inset-0 w-full h-full object-contain',
                imageBox ? 'invisible' : 'visible'
              )}
              draggable={false}
              onLoad={handleImgLoad}
            />

            {/* Main container: image + pins, centered at image content area, zoomed */}
            {imageBox && (
              <div
                ref={mapContainerRef}
                className={clsx(
                  'absolute select-none',
                  (editMode && selectedCircleId) || cropMode ? 'cursor-crosshair' : ''
                )}
                style={{
                  left: `${imageBox.cx}px`,
                  top: `${imageBox.cy}px`,
                  width: `${imageBox.w}px`,
                  height: `${imageBox.h}px`,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                  transformOrigin: 'center center',
                  // カードは画像の外（左右の余白）に出るのではみ出しを許可する
                  overflow: 'visible',
                }}
                onClick={handleMapClick}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
              >
                <img
                  src={currentMap.imageDataUrl}
                  alt={`${selectedHall}の会場マップ`}
                  className="w-full h-full block"
                  draggable={false}
                />

                {/* お品書きカードと引き出し線。ピンより先に描いてピンを前面に残す */}
                {showCutCards && imageBox && cardCircles.length > 0 && (
                  <CircleCutCards
                    circles={cardCircles}
                    saved={savedCardPositions}
                    imageAspect={imageAspect}
                    draggable={dragMode === 'circle' && !editMode && !cropMode}
                    zoom={zoom}
                    imageSize={{ w: imageBox.w, h: imageBox.h }}
                    onMove={moveCard}
                    onSelect={id => setSelectedCircleId(id)}
                  />
                )}

                {/* Pins */}
                {pinnedCircles.map(circle => {
                  const isHighlighted = circle.id === highlightId;
                  const isEditSelected = editMode && selectedCircleId === circle.id;
                  // 配置編集で「置くサークル」を選んでいる状態。この間はマップのタップを
                  // 邪魔しないよう、選択中以外のピンを不活性にする。
                  const isPlacing = editMode && selectedCircleId !== null;
                  const isBumped = isHighlighted || isEditSelected;
                  const isCompleted = circle.status !== 'pending';
                  // 塗りは購入ステータス（黄/緑/赤）のまま。サークル色は外周のリングで示すので、
                  // 「まだ買っていない」の読み取りを壊さずに色分けを重ねられる。
                  const circleHex = colorHex(circle.color);

                  // ピンサイズは数字あり/なしに関わらず常に旧仕様（小さなドット）を維持。
                  // 数字ありモードでは、その小さなドットの中央に小さなフォントで番号を表示する。
                  const sizeClass = isBumped
                    ? (markerSize === 'small' ? 'w-3 h-3' : markerSize === 'large' ? 'w-5 h-5' : 'w-4 h-4')
                    : (markerSize === 'small' ? 'w-2 h-2' : markerSize === 'large' ? 'w-4 h-4' : 'w-2.5 h-2.5');

                  // 優先順位番号は popup/hover では常に表示するため、ピン表示の有無に関わらず計算。
                  const priorityNumber = eventPriorityById.get(circle.id) ?? null;
                  // 小さいピンに収めるためフォントは極小。
                  // small/normal のドット (8-10px) では 1 桁がギリギリ。large (16-20px) でようやく 2 桁が見える程度。
                  // 3 桁以上は更に 1 段下げる。
                  const digits = priorityNumber == null ? 0 : String(priorityNumber).length;
                  const numFontClass = digits >= 3
                    ? (markerSize === 'large' ? 'text-[7px]' : 'text-[5px]')
                    : (markerSize === 'large' ? 'text-[9px]' : markerSize === 'small' ? 'text-[6px]' : 'text-[7px]');

                  return (
                  <div
                    key={circle.id}
                    className="absolute group"
                    style={{
                      left: `${circle.mapX}%`,
                      top: `${circle.mapY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <button
                      type="button"
                      className={clsx(
                        'relative flex h-11 w-11 items-center justify-center rounded-full',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                        // 配置するサークルを選んでいる間は、他のピンにタップを吸わせない。
                        // ピンは 44px の当たり判定を持つので、既存ピンの近くを狙うと
                        // マップではなくピンのクリックになり、そこへ置けなくなる。
                        isPlacing && !isEditSelected && 'pointer-events-none opacity-50',
                      )}
                      data-pin-id={circle.id}
                      aria-label={`${circle.name}、${circle.hall} ${circle.block}-${circle.number}、${statusLabel[circle.status] ?? '未購入'}${circle.color ? `、${colorLabel(circle.color, selectedEvent?.colorLabels)}` : ''}`}
                      aria-pressed={clickedPopup?.circleId === circle.id || isEditSelected}
                      onClick={e => {
                        e.stopPropagation();
                        if (editMode) {
                          setSelectedCircleId(id => id === circle.id ? null : circle.id);
                          return;
                        }
                        if (clickedPopup?.circleId === circle.id) {
                          setClickedPopup(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setClickedPopup({
                          circleId: circle.id,
                          pinX: rect.left + rect.width / 2,
                          pinY: rect.top + rect.height / 2,
                          pinR: Math.max(rect.width, rect.height) / 2,
                          placement: computePlacement(rect),
                        });
                      }}
                    >
                      {isHighlighted && (
                        <motion.div
                          className="absolute inset-[14px] rounded-full bg-emerald-500/50"
                          animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      )}
                      <span
                        style={circleHex
                          // ドットが小さいので box-shadow の spread でリングを描く。
                          // 内側に暗い縁を挟み、白いマップ上でも色の境目が見えるようにする。
                          ? { boxShadow: `0 0 0 1px #09090b, 0 0 0 3.5px ${circleHex}` }
                          : undefined}
                        className={clsx(
                        markerShape === 'circle' ? 'rounded-full' : 'rounded-md',
                        'border shadow-lg transition-all',
                        showPinNumbers
                          // 数字の色は zinc-900（ほぼ黒）。背景の白いマップに白文字だと滲んで読めず、
                          // また黄ピン (pending) では白文字のコントラスト比が 1.7:1 で WCAG AA も不合格。
                          // 黒に統一すると 全ステータス色 (黄/緑/赤) で AA 以上を確保できる。
                          ? 'opacity-95 flex items-center justify-center text-zinc-900 font-bold leading-none tabular-nums'
                          : 'opacity-85',
                        showPinNumbers ? numFontClass : null,
                        sizeClass,
                        isHighlighted
                          ? 'bg-emerald-500 border-emerald-200 ring-2 ring-emerald-500/50'
                          : isEditSelected
                            ? clsx(statusColor[circle.status] ?? 'bg-zinc-600 border-zinc-500', 'ring-2 ring-white/80')
                            : statusColor[circle.status] ?? 'bg-zinc-600 border-zinc-500',
                        completedVisibility === 'muted' && isCompleted && 'opacity-35 grayscale',
                      )}>
                        {showPinNumbers ? priorityNumber : null}
                      </span>
                    </button>

                      {/* Hover preview (desktop): block・name のみのコンパクト tooltip。
                          クリック時の本ポップアップは createPortal で外側に描画される。
                          このピンの click popup が開いている間は隠す（重複防止）。
                          配置編集中は、置きたい場所にカーソルを動かすたびに出て邪魔になるので隠す。 */}
                      {!editMode && clickedPopup?.circleId !== circle.id && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-150">
                          <div className="bg-zinc-800 text-zinc-100 text-xs rounded-lg shadow-xl border border-zinc-700 text-left min-w-[140px] max-w-[200px]">
                            <div className="px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5">
                                {priorityNumber != null && (
                                  <span className="inline-flex items-center justify-center min-w-[16px] h-[14px] px-1 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[9px] font-mono font-bold tabular-nums leading-none">
                                    #{priorityNumber}
                                  </span>
                                )}
                                <div className="font-mono text-zinc-500 text-[10px]">{circle.block}-{circle.number}</div>
                              </div>
                              <div className="text-zinc-200 font-medium truncate">{circle.name}</div>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-zinc-800 border-b border-r border-zinc-700 rotate-45 mx-auto -mt-1" />
                        </div>
                      )}

                      {/* 削除ボタンはピンのすぐ脇に出るので、配置中は出さない。
                          置きたい場所に重なってタップを奪ってしまうため。 */}
                      {editMode && !isPlacing && (
                        <button
                          type="button"
                          onClick={(e) => handleRemovePin(circle.id, e)}
                          aria-label={`${circle.name} のピンを削除`}
                          className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex group-focus-within:flex shadow-md focus-visible:flex"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                  </div>
                  );
                })}

                {/* Edit mode indicator */}
                {editMode && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {selectedCircleId
                        ? `「${hallCircles.find(c => c.id === selectedCircleId)?.name ?? ''}」の位置をタップ`
                        : '下のリストからサークルを選択'}
                    </div>
                  </div>
                )}

                {/* Crop overlay */}
                {cropMode && (
                  <>
                    <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                    {cropRect && (() => {
                      const nx = Math.min(cropRect.x, cropRect.x + cropRect.w);
                      const ny = Math.min(cropRect.y, cropRect.y + cropRect.h);
                      const nw = Math.abs(cropRect.w);
                      const nh = Math.abs(cropRect.h);
                      return (
                        <div
                          className="absolute border-2 border-white pointer-events-none"
                          style={{ left: `${nx}%`, top: `${ny}%`, width: `${nw}%`, height: `${nh}%` }}
                        >
                          <div className="absolute inset-0 bg-white/10" />
                        </div>
                      );
                    })()}
                    {cropRect && !cropStart && (
                      <div
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20"
                        onPointerDown={e => e.stopPropagation()}
                      >
                        <button
                          onClick={handleApplyCrop}
                          disabled={processing}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          切り抜き適用
                        </button>
                        <button
                          onClick={() => { setCropMode(false); setCropRect(null); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded-lg shadow-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          キャンセル
                        </button>
                      </div>
                    )}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <div className="bg-zinc-800 border border-zinc-600 text-zinc-100 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                        {cropStart ? 'ドラッグして切り抜き範囲を選択' : cropRect ? '範囲を確認して適用' : 'ドラッグして切り抜き範囲を選択'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Zoom + fullscreen controls — 統一スタイル: 40px / 高コントラスト / 半透明背景 */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
              <button
                onClick={() => setFullscreen(f => !f)}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors"
                title={fullscreen ? '全画面解除 (Esc)' : '全画面表示'}
                aria-label={fullscreen ? '全画面解除' : '全画面表示'}
              >
                {fullscreen
                  ? <Minimize2 className="w-5 h-5" />
                  : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.5).toFixed(1))))}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors text-2xl font-bold leading-none"
                title="ズームイン"
                aria-label="ズームイン"
              >+</button>
              {zoom !== 1 && (
                <button
                  onClick={() => setZoom(1)}
                  className="w-10 h-10 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors text-xs font-mono"
                  title="ズームリセット"
                  aria-label="ズームリセット"
                >1×</button>
              )}
              <button
                onClick={() => setZoom(z => Math.max(1, parseFloat((z - 0.5).toFixed(1))))}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors text-2xl font-bold leading-none"
                title="ズームアウト"
                aria-label="ズームアウト"
              >−</button>

              {/* フィット操作 */}
              <button
                onClick={fitWidth}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors"
                title="横幅に合わせる"
                aria-label="横幅に合わせる"
              >
                <MoveHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={fitWhole}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors"
                title="全体を表示"
                aria-label="全体を表示"
              >
                <MoveDiagonal className="w-5 h-5" />
              </button>
            </div>

            {/* 左上: お品書き表示 / ドラッグ対象 / 画像保存 */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              <button
                onClick={() => update({ mapShowCutCards: !showCutCards })}
                aria-pressed={showCutCards}
                className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg border backdrop-blur-sm transition-colors',
                  showCutCards
                    ? 'bg-emerald-500/90 text-zinc-950 border-emerald-400'
                    : 'bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 border-zinc-600/80',
                )}
                title={showCutCards ? 'お品書きを隠す' : 'お品書きを表示'}
                aria-label={showCutCards ? 'お品書きを隠す' : 'お品書きを表示'}
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <button
                onClick={handleExportImage}
                disabled={exporting}
                className="w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="表示中のマップを画像として保存"
                aria-label="マップを画像として保存"
              >
                <Download className="w-5 h-5" />
              </button>

              {/* ドラッグしたときに何が動くか。カードを置いたあと誤操作で
                  ずらさないよう「固定」に切り替えられるようにしている。 */}
              <div className="flex flex-col rounded-lg overflow-hidden border border-zinc-600/80 shadow-lg backdrop-blur-sm">
                {([
                  { value: 'circle', label: 'サークル', icon: <Move className="w-4 h-4" /> },
                  { value: 'map', label: '地図', icon: <MoveHorizontal className="w-4 h-4" /> },
                  { value: 'lock', label: '固定', icon: <Lock className="w-4 h-4" /> },
                ] as const).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => update({ mapDragMode: value })}
                    aria-pressed={dragMode === value}
                    title={`ドラッグで${label}を動かす`}
                    aria-label={`ドラッグ対象: ${label}`}
                    className={clsx(
                      'w-10 h-8 flex items-center justify-center transition-colors',
                      dragMode === value
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {showCutCards && savedCardPositions && Object.keys(savedCardPositions).length > 0 && (
                <button
                  onClick={resetCardPositions}
                  className="w-10 h-10 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm transition-colors"
                  title="カードの配置を自動に戻す"
                  aria-label="カードの配置を自動に戻す"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pan controls — zoom > 1 のとき表示。zoom/fullscreen ボタンと統一スタイル */}
            {zoom > 1 && panLimit && (
              <>
                <button
                  onClick={handlePanUp}
                  disabled={pan.y >= panLimit.y}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  title="上へ移動"
                  aria-label="上へ移動"
                >
                  <ChevronUp className="w-6 h-6" />
                </button>
                <button
                  onClick={handlePanDown}
                  disabled={pan.y <= -panLimit.y}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  title="下へ移動"
                  aria-label="下へ移動"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
                <button
                  onClick={handlePanLeft}
                  disabled={pan.x >= panLimit.x}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  title="左へ移動"
                  aria-label="左へ移動"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handlePanRight}
                  disabled={pan.x <= -panLimit.x}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-zinc-900/90 text-zinc-50 hover:bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg border border-zinc-600/80 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  title="右へ移動"
                  aria-label="右へ移動"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        ) : (
          /* No map yet: upload prompt */
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <MapPin className="w-12 h-12" />
            <p className="text-sm">
              {selectedHall
                ? `${selectedHall} の会場マップを登録してください`
                : 'ホールを選択してください'}
            </p>
            {selectedHall && (
              <label className="cursor-pointer px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                画像 / PDF をアップロード
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
            <p className="text-xs text-zinc-700 text-center max-w-xs leading-relaxed">
              PNG・JPG・PDF に対応。PDF は複数ページのパンフレットもページ送りで確認できます。
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom panel ────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
          <button
            onClick={() => setShowHistory(false)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
              !showHistory ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            サークル ({pendingCircles.length})
          </button>
          <button
            onClick={() => { setShowHistory(true); setEditMode(false); setSelectedCircleId(null); }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1',
              showHistory ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <History className="w-3 h-3" />
            履歴 ({doneCircles.length})
          </button>
          <div className="ml-auto">
            {currentMap && (
              <button
                // 配置編集の出入りで詳細ポップアップは畳む。
                // 開いたまま編集に入ると、ピンを置く場所にカードが被って邪魔になる。
                onClick={() => { setEditMode(e => !e); setSelectedCircleId(null); setClickedPopup(null); }}
                className={clsx(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                  editMode ? 'bg-zinc-700 border border-zinc-500 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {editMode ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                {editMode ? '完了' : '配置編集'}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '9rem' }}>
          {editMode ? (
            hallCircles.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-600">このホールにサークルなし</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {hallCircles.map(circle => (
                  <div
                    key={circle.id}
                    onClick={() => setSelectedCircleId(id => id === circle.id ? null : circle.id)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-800 transition-colors',
                      selectedCircleId === circle.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                    )}
                  >
                    <div className={clsx(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0 border',
                      statusColor[circle.status] ?? 'bg-zinc-600 border-zinc-500'
                    )} />
                    <span className="font-mono text-xs text-zinc-500 flex-shrink-0">{circle.block}-{circle.number}</span>
                    <span className="flex-1 truncate text-zinc-300">{circle.name}</span>
                    <MapPin className={clsx(
                      'w-3 h-3 flex-shrink-0',
                      circle.mapX != null ? 'text-emerald-500' : 'text-zinc-700'
                    )} />
                  </div>
                ))}
              </div>
            )
          ) : !showHistory ? (
            pendingCircles.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-600">このホールの未購入サークルなし</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {pendingCircles.map(circle => (
                  <div
                    key={circle.id}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                      circle.id === highlightId ? 'bg-emerald-500/5' : ''
                    )}
                  >
                    <div className={clsx(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0 border',
                      statusColor[circle.status] ?? 'bg-zinc-600 border-zinc-500'
                    )} />
                    <span className="font-mono text-xs text-zinc-500 flex-shrink-0">{circle.block}-{circle.number}</span>
                    <span className={clsx('flex-1 truncate',
                      circle.id === highlightId ? 'text-emerald-300 font-semibold' : 'text-zinc-300')}>
                      {circle.name}
                    </span>
                    {circle.mapX != null && (
                      <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            doneCircles.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-600">購入済みサークルなし</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {doneCircles.map(circle => (
                  <div key={circle.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className={clsx(
                      'px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0',
                      circle.status === 'bought' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-900/30 text-red-400'
                    )}>
                      {circle.status === 'bought' ? '購入済' : '完売'}
                    </span>
                    <span className="font-mono text-xs text-zinc-500 flex-shrink-0">{circle.block}-{circle.number}</span>
                    <span className="flex-1 truncate text-zinc-400">{circle.name}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Template import modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showTemplateModal && (
          <TemplateImportModal
            onClose={() => setShowTemplateModal(false)}
            onImport={handleTemplateImport}
          />
        )}
      </AnimatePresence>

      {/* ── Click popup (portal): map のコンテナ外にレンダリングして
            overflow-hidden / scale 影響を回避し、画面端でも見切れない ───── */}
      {clickedPopup && clickedCircle && createPortal(
        (() => {
          // ライブ測定: クリック時の保存座標ではなく、レンダリング時に DOM から
          // 実際のピン位置を取得する。iOS Safari の URL bar 動的伸縮や、orientation
          // 変更の遅延レイアウト確定の影響を popup が常に追従できる。
          const pinEl = document.querySelector<HTMLElement>(
            `[data-pin-id="${clickedPopup.circleId}"]`,
          );
          let pinX = clickedPopup.pinX;
          let pinY = clickedPopup.pinY;
          let pinR = clickedPopup.pinR;
          let placement = clickedPopup.placement;
          if (pinEl) {
            const rect = pinEl.getBoundingClientRect();
            pinX = rect.left + rect.width / 2;
            pinY = rect.top + rect.height / 2;
            pinR = Math.max(rect.width, rect.height) / 2;
            placement = computePlacement(rect);
          }

          const M = 8;          // viewport 端からの最低マージン
          const GAP = 6;        // ピンとポップアップの隙間
          const ARROW_HALF = 4; // 矢印の半幅
          const vw = window.innerWidth;

          // popup card 本体の位置
          const cardStyle: React.CSSProperties = { position: 'fixed', zIndex: 50 };
          const transforms: string[] = [];
          if (placement.vertical === 'above') {
            cardStyle.top = pinY - pinR - GAP;
            transforms.push('translateY(-100%)');
          } else {
            cardStyle.top = pinY + pinR + GAP;
          }
          if (placement.horizontal === 'center') {
            cardStyle.left = pinX;
            transforms.push('translateX(-50%)');
          } else if (placement.horizontal === 'left') {
            cardStyle.left = M;
          } else {
            cardStyle.right = M;
          }
          if (transforms.length) cardStyle.transform = transforms.join(' ');

          // 矢印は常にピンの真上/真下を指すよう popup 内で位置調整
          const arrowStyle: React.CSSProperties = {
            position: 'absolute',
            width: 8,
            height: 8,
            backgroundColor: 'rgb(39 39 42)', // bg-zinc-800
            transform: 'rotate(45deg)',
          };
          if (placement.horizontal === 'center') {
            arrowStyle.left = '50%';
            arrowStyle.marginLeft = -ARROW_HALF;
          } else if (placement.horizontal === 'left') {
            arrowStyle.left = pinX - M - ARROW_HALF;
          } else {
            arrowStyle.right = (vw - M) - pinX - ARROW_HALF;
          }
          if (placement.vertical === 'above') {
            arrowStyle.bottom = -ARROW_HALF;
            arrowStyle.borderRight = '1px solid rgb(63 63 70)';   // border-zinc-700
            arrowStyle.borderBottom = '1px solid rgb(63 63 70)';
          } else {
            arrowStyle.top = -ARROW_HALF;
            arrowStyle.borderLeft = '1px solid rgb(63 63 70)';
            arrowStyle.borderTop = '1px solid rgb(63 63 70)';
          }

          const itemStatusActive: Record<CircleItem['status'], string> = {
            pending: 'bg-zinc-600 text-zinc-200',
            bought: 'bg-emerald-500/20 text-emerald-400',
            soldout: 'bg-red-500/20 text-red-400',
          };

          const clickedPriorityNumber = eventPriorityById.get(clickedCircle.id);

          return (
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
              <div className="bg-zinc-800 text-zinc-100 text-xs rounded-lg shadow-xl border border-zinc-700 text-left min-w-[160px] max-w-[220px]">
                <div className="px-2.5 py-2 border-b border-zinc-700/60">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {/* 買い物リストの優先順位番号と一致するバッジ。ピンの数字表示がオフでも、
                        詳細ポップアップでは常に表示する（識別の助けになるため）。 */}
                    {clickedPriorityNumber != null && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-mono font-bold tabular-nums">
                        #{clickedPriorityNumber}
                      </span>
                    )}
                    <div className="font-mono text-zinc-500 text-[10px]">{clickedCircle.block}-{clickedCircle.number}</div>
                  </div>
                  <div className="text-zinc-200 font-medium truncate">{clickedCircle.name}</div>
                </div>
                <div className="flex gap-1 p-1.5 border-b border-zinc-700/40">
                  {([
                    { s: 'pending',  label: '未購入', active: 'bg-zinc-600 text-zinc-200'        },
                    { s: 'bought',   label: '購入済', active: 'bg-emerald-500/20 text-emerald-400' },
                    { s: 'soldout',  label: '完売',   active: 'bg-red-500/20 text-red-400'        },
                  ] as const).map(({ s, label, active }) => (
                    <button
                      key={s}
                      onClick={async (e) => {
                        e.stopPropagation();
                        // オフライン時はキューに積まれて、復帰時に自動同期される。
                        await applyCircleStatusChange(clickedCircle.id, s);
                      }}
                      className={clsx(
                        'flex-1 py-1 rounded text-[10px] font-medium transition-colors',
                        clickedCircle.status === s
                          ? active
                          : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {clickedItems.length > 1 && (
                  <div className="px-2 py-1.5 space-y-1.5 max-h-40 overflow-y-auto">
                    {clickedItems.map(item => {
                      const s = item.status ?? 'pending';
                      return (
                        <div key={item.id} className="space-y-0.5">
                          <div className="text-[10px] text-zinc-400 truncate">{item.title}</div>
                          <div className="flex gap-1">
                            {(['pending', 'bought', 'soldout'] as CircleItem['status'][]).map(st => (
                              <button
                                key={st}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await applyItemStatusChange(item.id, st);
                                }}
                                className={clsx(
                                  'flex-1 py-0.5 rounded text-[9px] font-medium transition-colors',
                                  s === st
                                    ? itemStatusActive[st]
                                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700'
                                )}
                              >
                                {st === 'pending' ? '未' : st === 'bought' ? '済' : '完売'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={arrowStyle} />
            </div>
          );
        })(),
        document.body,
      )}
    </div>
  );
};

export default MapPage;
