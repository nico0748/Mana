import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Upload, MapPin, Edit2, Check, X, History, Route, LayoutGrid,
  ImageIcon, Trash2, Wand2, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { eventsApi, circlesApi, venueMapsApi } from '../lib/api';
import { traceImageToSvg } from '../lib/imageToSvg';
import { renderPdfPageToDataUrl } from '../lib/pdfUtils';
import type { Circle } from '../types';
import { clsx } from 'clsx';
import { VenueSchematicMap } from '../components/map/VenueSchematicMap';
import { useVenueGraph, applyOptimalRoute, EVENT_KEY } from '../hooks/useVenueRoute';
import { getSupportedEvents, getVenueLayout } from '../data/tokyoBigSight';

const statusColor: Record<string, string> = {
  pending: 'bg-zinc-300 border-zinc-200',
  bought: 'bg-emerald-500 border-emerald-300',
  soldout: 'bg-red-500 border-red-400',
};

const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const highlightId = searchParams.get('highlight');
  const defaultHall = searchParams.get('hall');

  const [mapMode, setMapMode] = useState<'image' | 'schematic'>('image');
  const [eventCode, setEventCode] = useState<string>(() => localStorage.getItem(EVENT_KEY) ?? 'c105');
  const [editMode, setEditMode] = useState(false);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showSvg, setShowSvg] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);

  // Zoom + pin popup state
  const [zoom, setZoom] = useState(1);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [outerSize, setOuterSize] = useState<{ w: number; h: number } | null>(null);

  // Event selection for map management
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    () => searchParams.get('eventId') ?? null
  );

  // Add-hall inline input
  const [showAddHall, setShowAddHall] = useState(false);
  const [newHallName, setNewHallName] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapOuterRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Track outer map area size for aspect-ratio coordinate fix
  useEffect(() => {
    const el = mapOuterRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setOuterSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data: events } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: circles } = useQuery({ queryKey: ['circles'], queryFn: circlesApi.list });
  const { data: venueMaps } = useQuery({ queryKey: ['venueMaps'], queryFn: venueMapsApi.list });

  // Auto-select event
  useEffect(() => {
    if (selectedEventId !== null) return;
    if (!events || !circles || !venueMaps) return;
    const urlEventId = searchParams.get('eventId');
    if (urlEventId) { setSelectedEventId(urlEventId); return; }
    const hasOrphans = circles.some(c => !c.eventId) || venueMaps.some(m => !m.eventId);
    if (!hasOrphans && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events?.length, circles?.length, venueMaps?.length]);

  useEffect(() => {
    localStorage.setItem(EVENT_KEY, eventCode);
  }, [eventCode]);

  const graph = useVenueGraph(eventCode);

  // ── Event-scoped data ──────────────────────────────────────────────────────

  const hasOrphanData =
    (circles ?? []).some(c => !c.eventId) ||
    (venueMaps ?? []).some(m => !m.eventId);

  const eventCircles = (circles ?? []).filter(c =>
    selectedEventId !== null ? c.eventId === selectedEventId : !c.eventId
  );

  const hallsFromCircles = eventCircles.map(c => c.hall).filter(Boolean) as string[];
  const hallsFromMaps = (venueMaps ?? [])
    .filter(m => selectedEventId !== null ? m.eventId === selectedEventId : !m.eventId)
    .map(m => m.hall);
  const halls = [...new Set([...hallsFromCircles, ...hallsFromMaps])];

  const [selectedHall, setSelectedHall] = useState<string>(defaultHall ?? '');

  useEffect(() => {
    setSelectedHall('');
    setShowSvg(false);
    setPdfFile(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setEditMode(false);
    setSelectedCircleId(null);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedHall && halls.length > 0) {
      setSelectedHall(defaultHall ?? halls[0]);
    }
  }, [halls.length, defaultHall, selectedHall]);

  useEffect(() => {
    setShowSvg(false);
    setPdfFile(null);
    setPdfPage(1);
    setPdfTotalPages(0);
  }, [selectedHall]);

  const hallCircles = eventCircles.filter(c => c.hall === selectedHall);
  const pendingCircles = hallCircles.filter(c => c.status === 'pending');
  const doneCircles = hallCircles.filter(c => c.status === 'bought' || c.status === 'soldout');
  const pinnedCircles = hallCircles.filter(c => c.mapX != null && c.mapY != null);
  const allPendingCircles = eventCircles.filter(c => c.status === 'pending');

  const currentMap = (venueMaps ?? []).find(
    m => m.hall === selectedHall && m.eventId === (selectedEventId ?? undefined)
  );

  // Reset zoom/pins when map changes
  useEffect(() => {
    setImgNaturalSize(null);
    setZoom(1);
    setActivePinId(null);
  }, [currentMap?.id]);

  const venueLayout = getVenueLayout(eventCode);
  const schematicHall = venueLayout?.halls.find(h => h.label === selectedHall) ?? null;
  const supportedEvents = getSupportedEvents();

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  }, []);

  const saveMapDataUrl = async (hall: string, imageDataUrl: string) => {
    const existing = (venueMaps ?? []).find(
      m => m.hall === hall && m.eventId === (selectedEventId ?? undefined)
    );
    if (existing) {
      await venueMapsApi.update(existing.id, { imageDataUrl, generatedSvg: undefined });
    } else {
      await venueMapsApi.upsert({
        eventId: selectedEventId ?? undefined,
        hall,
        imageDataUrl,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
    setShowSvg(false);
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

  const handleGenerateSvg = async () => {
    if (!currentMap || generating) return;
    setGenerating(true);
    try {
      const svgString = await traceImageToSvg(currentMap.imageDataUrl);
      await venueMapsApi.update(currentMap.id, { generatedSvg: svgString });
      queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
      setShowSvg(true);
    } catch (err) {
      console.error('SVG generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteMap = async () => {
    if (!currentMap) return;
    if (!confirm(`${selectedHall} のマップ画像を削除しますか？`)) return;
    await venueMapsApi.delete(currentMap.id);
    queryClient.invalidateQueries({ queryKey: ['venueMaps'] });
    setEditMode(false);
    setSelectedCircleId(null);
  };

  const handleOptimizeRoute = async () => {
    if (!graph || allPendingCircles.length === 0) return;
    setOptimizing(true);
    setOptimizeResult(null);
    try {
      const count = await applyOptimalRoute(graph, allPendingCircles);
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      setOptimizeResult(
        count === 0
          ? 'ルート計算できるサークルが見つかりませんでした。'
          : `${count}件のサークルを最適順に並び替えました。`
      );
    } finally {
      setOptimizing(false);
    }
  };

  // Click on the image container to place a pin
  // getBoundingClientRect() accounts for CSS transforms, so zoom is handled correctly
  const handleMapClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    setActivePinId(null);
    if (!editMode || !selectedCircleId || mapMode !== 'image') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    await circlesApi.update(selectedCircleId, { mapX: x, mapY: y });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
    setSelectedCircleId(null);
  }, [editMode, selectedCircleId, mapMode]);

  const handleRemovePin = async (circleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await circlesApi.update(circleId, { mapX: null, mapY: null });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  };

  const handleAddHall = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHallName.trim();
    if (!name) return;
    setSelectedHall(name);
    setNewHallName('');
    setShowAddHall(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 3.5rem)' }}>

      {/* ── Event selector row ──────────────────────────────────────────── */}
      {((events ?? []).length > 0 || hasOrphanData) && (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800/60 overflow-x-auto">
          <span className="text-xs text-zinc-600 flex-shrink-0">即売会</span>
          <span className="text-zinc-800 text-xs flex-shrink-0">|</span>
          {hasOrphanData && (
            <button
              onClick={() => setSelectedEventId(null)}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                selectedEventId === null
                  ? 'bg-emerald-500 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              )}
            >
              未分類
            </button>
          )}
          {(events ?? []).map(event => (
            <button
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                selectedEventId === event.id
                  ? 'bg-emerald-500 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {event.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Hall tabs + tools row ────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">

          {/* Hall tabs */}
          <div className="flex gap-1 flex-1 overflow-x-auto items-center min-w-0">
            {halls.length === 0 && !showAddHall ? (
              <span className="text-xs text-zinc-500 py-1.5 whitespace-nowrap">
                ホールを追加するか、サークルを登録するとタブが表示されます
              </span>
            ) : (
              halls.map(hall => (
                <button
                  key={hall}
                  onClick={() => setSelectedHall(hall)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                    selectedHall === hall
                      ? 'bg-emerald-500 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {hall || '未設定'}
                </button>
              ))
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

          {/* Mode toggle */}
          <div className="flex gap-1 flex-shrink-0 bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setMapMode('image')}
              className={clsx('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                mapMode === 'image' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
              title="画像MAP"
            >
              <ImageIcon className="w-3 h-3" />
              画像
            </button>
            <button
              onClick={() => setMapMode('schematic')}
              className={clsx('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                mapMode === 'schematic' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
              title="スキーマMAP"
            >
              <LayoutGrid className="w-3 h-3" />
              スキーマ
            </button>
          </div>

          {/* Image-mode tools */}
          {mapMode === 'image' && selectedHall && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {currentMap ? '更新' : 'MAP登録'}
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
                <button
                  onClick={handleGenerateSvg}
                  disabled={generating}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                    generating
                      ? 'text-zinc-600 bg-zinc-800 cursor-not-allowed'
                      : 'text-violet-400 hover:text-violet-300 bg-zinc-800 hover:bg-zinc-700')}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {generating ? '生成中...' : 'SVG'}
                </button>
              )}
              {currentMap?.generatedSvg && (
                <button
                  onClick={() => setShowSvg(v => !v)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                    showSvg
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200')}
                >
                  {showSvg ? '元画像' : 'SVG表示'}
                </button>
              )}
              {currentMap && (
                <button
                  onClick={handleDeleteMap}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 bg-zinc-800 hover:bg-red-950 rounded-md transition-colors"
                  title="マップ削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Schematic mode: event code + route optimize */}
        {mapMode === 'schematic' && (
          <div className="flex items-center gap-3 px-3 pb-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-500">会場データ:</span>
              {supportedEvents.map(ev => (
                <button
                  key={ev.code}
                  onClick={() => setEventCode(ev.code.toLowerCase())}
                  className={clsx(
                    'px-2 py-0.5 text-xs rounded font-medium transition-colors',
                    eventCode === ev.code.toLowerCase()
                      ? 'bg-emerald-500 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {ev.code}
                </button>
              ))}
            </div>
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || !graph || allPendingCircles.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Route className="w-3.5 h-3.5" />
              {optimizing ? '計算中...' : 'ルート最適化'}
            </button>
            {optimizeResult && (
              <span className="text-xs text-zinc-400">{optimizeResult}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Map area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 min-h-0">
        {mapMode === 'schematic' ? (
          schematicHall ? (
            <div className="w-full h-full p-2">
              <VenueSchematicMap
                hall={schematicHall}
                circles={hallCircles}
                highlightedCircleId={highlightId}
                onBlockClick={(blockName) => {
                  const target = hallCircles.find(c => c.block === blockName);
                  if (target) setSelectedCircleId(prev => prev === target.id ? null : target.id);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
              <LayoutGrid className="w-10 h-10" />
              <p className="text-sm">
                {selectedHall
                  ? `${selectedHall} のスキーマデータがありません`
                  : 'ホールを選択してください'}
              </p>
              <p className="text-xs text-zinc-700">スキーマMAPは東京ビッグサイト（コミケ）のみ対応</p>
            </div>
          )
        ) : (
          currentMap ? (
            <div ref={mapOuterRef} className="w-full h-full bg-zinc-950 overflow-hidden relative">
              {showSvg && currentMap.generatedSvg ? (
                <div
                  className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: currentMap.generatedSvg }}
                />
              ) : (
                <>
                  {/* Fallback image shown before imageBox is computed (object-contain, no letterbox correction) */}
                  <img
                    src={currentMap.imageDataUrl}
                    alt={`${selectedHall}マップ`}
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
                        editMode && selectedCircleId ? 'cursor-crosshair' : ''
                      )}
                      style={{
                        left: `${imageBox.cx}px`,
                        top: `${imageBox.cy}px`,
                        width: `${imageBox.w}px`,
                        height: `${imageBox.h}px`,
                        transform: `translate(-50%, -50%) scale(${zoom})`,
                        transformOrigin: 'center center',
                      }}
                      onClick={handleMapClick}
                    >
                      <img
                        src={currentMap.imageDataUrl}
                        alt={`${selectedHall}マップ`}
                        className="w-full h-full block"
                        draggable={false}
                      />

                      {/* Pins */}
                      {pinnedCircles.map(circle => (
                        <div
                          key={circle.id}
                          className="absolute"
                          style={{
                            left: `${circle.mapX}%`,
                            top: `${circle.mapY}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div
                            className="relative group"
                            onClick={e => {
                              e.stopPropagation();
                              if (!editMode) {
                                setActivePinId(id => id === circle.id ? null : circle.id);
                              }
                            }}
                          >
                            {circle.id === highlightId && (
                              <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-500/50"
                                animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              />
                            )}
                            <div className={clsx(
                              'rounded-full border shadow-lg transition-all opacity-85',
                              circle.id === highlightId
                                ? 'w-4 h-4 bg-emerald-500 border-emerald-200 ring-2 ring-emerald-500/50'
                                : 'w-2.5 h-2.5',
                              statusColor[circle.status] ?? 'bg-zinc-600 border-zinc-500'
                            )} />

                            {/* Popup: hover on desktop, tap on mobile */}
                            <div className={clsx(
                              'absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-opacity duration-150',
                              activePinId === circle.id
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'
                            )}>
                              <div className="bg-zinc-800 text-zinc-100 text-xs rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg border border-zinc-700 text-left">
                                <div className="font-bold font-mono">{circle.block}-{circle.number}</div>
                                <div className="text-zinc-300">{circle.name}</div>
                              </div>
                              <div className="w-2 h-2 bg-zinc-800 border-b border-r border-zinc-700 rotate-45 mx-auto -mt-1" />
                            </div>

                            {editMode && (
                              <button
                                onClick={(e) => handleRemovePin(circle.id, e)}
                                className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex shadow-md"
                              >
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

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
                    </div>
                  )}
                </>
              )}

              {generating && (
                <div className="absolute inset-0 bg-zinc-950/70 flex flex-col items-center justify-center gap-3 z-20">
                  <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-300">SVGを生成中...</p>
                  <p className="text-xs text-zinc-500">大きな画像は数秒かかります</p>
                </div>
              )}

              {/* Zoom controls */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                <button
                  onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.5).toFixed(1))))}
                  className="w-7 h-7 bg-zinc-800/90 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded text-base font-bold flex items-center justify-center shadow border border-zinc-700 leading-none"
                  title="ズームイン"
                >+</button>
                {zoom !== 1 && (
                  <button
                    onClick={() => setZoom(1)}
                    className="w-7 h-7 bg-zinc-800/90 text-zinc-500 hover:text-zinc-300 rounded text-xs font-mono flex items-center justify-center shadow border border-zinc-700"
                    title="ズームリセット"
                  >1×</button>
                )}
                <button
                  onClick={() => setZoom(z => Math.max(1, parseFloat((z - 0.5).toFixed(1))))}
                  className="w-7 h-7 bg-zinc-800/90 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded text-base font-bold flex items-center justify-center shadow border border-zinc-700 leading-none"
                  title="ズームアウト"
                >−</button>
              </div>
            </div>
          ) : (
            /* No map yet: upload prompt */
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
              <MapPin className="w-12 h-12" />
              <p className="text-sm">
                {selectedHall
                  ? `${selectedHall} のマップを登録してください`
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
          )
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
            {!showHistory && mapMode === 'image' && currentMap && (
              <button
                onClick={() => { setEditMode(e => !e); setSelectedCircleId(null); }}
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
          {!showHistory ? (
            pendingCircles.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-600">このホールの未購入サークルなし</div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {pendingCircles.map(circle => (
                  <div
                    key={circle.id}
                    onClick={() => editMode && setSelectedCircleId(id => id === circle.id ? null : circle.id)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                      editMode ? 'cursor-pointer hover:bg-zinc-800' : '',
                      editMode && selectedCircleId === circle.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : '',
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
                    {mapMode === 'image' && circle.mapX != null && (
                      <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
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
    </div>
  );
};

export default MapPage;
