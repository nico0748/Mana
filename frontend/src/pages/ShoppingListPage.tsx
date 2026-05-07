import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trash2, Navigation, ChevronDown, ChevronUp, ChevronsUp,
  BookPlus, Check, Calendar, Pencil, FileSpreadsheet, FileDown, PanelLeft, ExternalLink,
  Download, Upload, FileJson, Share2, UploadCloud, AlertTriangle, MapPin, Loader2,
} from 'lucide-react';
import type { Circle, CircleItem, DoujinEvent, VenueMap } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageSidebar } from '../components/layout/PageSidebar';
import {
  parseCirclesFile, parseCirclesJson, downloadCirclesTemplate,
  exportCirclesJson, exportCirclesCsv, exportCirclesExcel,
} from '../lib/circlesCsv';
import { eventsApi, circlesApi, circleItemsApi, booksApi, venueMapsApi, eventTemplatesApi, ApiError } from '../lib/api';
import { useUpgradeModal, isPlanLimitError } from '../contexts/UpgradeModalContext';
import { ShoppingTabs } from '../components/shopping/ShoppingTabs';

// ─── status helpers ────────────────────────────────────────────────────────

const statusLabel: Record<Circle['status'], string> = {
  pending: '未購入',
  bought: '購入済',
  soldout: '完売',
};

const statusClass: Record<Circle['status'], string> = {
  pending: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  bought: 'bg-green-400/10 text-green-400 border-green-400/25',
  soldout: 'bg-rose-400/10 text-rose-400 border-rose-400/25',
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

// ─── X (Twitter) share helpers ─────────────────────────────────────────────

function openXShare(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function buildCircleShareText(circle: Circle, items: CircleItem[], eventName?: string): string {
  const pendingItems = items.filter(i => i.status !== 'soldout');
  const lines: string[] = [];
  if (eventName) lines.push(`【${eventName}】`);
  lines.push(`${circle.name}（${circle.hall} ${circle.block}-${circle.number}）`);
  if (pendingItems.length > 0) {
    pendingItems.forEach(item => {
      lines.push(`・${item.title} ¥${item.price.toLocaleString()} ×${item.quantity}`);
    });
  }
  lines.push('');
  lines.push('代理購入できる方はDMください🙏');
  lines.push('#同人イベント #代理購入');
  return lines.join('\n');
}

function buildEventShareText(event: DoujinEvent, circles: Circle[], circleItems: CircleItem[]): string {
  const pendingCircles = circles.filter(c => c.status !== 'soldout');
  const lines: string[] = [];
  lines.push(`【${event.name}${event.date ? ` ${formatDate(event.date)}` : ''}】`);
  lines.push('購入予定リストをシェアします！');
  lines.push('');
  pendingCircles.slice(0, 5).forEach(circle => {
    const items = circleItems.filter(i => i.circleId === circle.id && i.status !== 'soldout');
    lines.push(`▸ ${circle.name}（${circle.block}-${circle.number}）`);
    items.slice(0, 2).forEach(item => {
      lines.push(`  ・${item.title}`);
    });
    if (items.length > 2) lines.push(`  他${items.length - 2}点`);
  });
  if (pendingCircles.length > 5) lines.push(`他${pendingCircles.length - 5}サークル...`);
  lines.push('');
  lines.push('代理購入できる方はDMください🙏');
  lines.push('#同人イベント #代理購入');
  return lines.join('\n');
}

// ─── AddToLibraryModal ─────────────────────────────────────────────────────

interface AddToLibraryModalProps {
  item: CircleItem;
  circle: Circle;
  onClose: () => void;
  onAdded: (itemId: string) => void;
}

const AddToLibraryModal: React.FC<AddToLibraryModalProps> = ({ item, circle, onClose, onAdded }) => {
  const [title, setTitle] = useState(item.title);
  const [author, setAuthor] = useState(circle.author || circle.name);
  const [price, setPrice] = useState(item.price);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await booksApi.create({
      title,
      author,
      type: 'doujin',
      status: 'owned',
      price,
    });
    setLoading(false);
    onAdded(item.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-1">蔵書に追加</h2>
        <p className="text-sm text-zinc-500 mb-4">同人誌・所持として蔵書に登録します</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">タイトル</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">著者 / サークル名</label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">価格（円）</label>
            <Input type="number" min="0" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1" isLoading={loading}>蔵書に追加</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── CircleCard ────────────────────────────────────────────────────────────

interface CircleCardProps {
  circle: Circle;
  items: CircleItem[];
  circleIndex?: number;
  totalCircles?: number;
  eventName?: string;
  onEdit: (circle: Circle) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Circle['status']) => void;
  onItemStatusChange: (itemId: string, status: CircleItem['status']) => void;
  onReorder?: (id: string, dir: 'top' | 'up' | 'down') => void;
  onAddItem: (circleId: string) => void;
  onEditItem: (item: CircleItem) => void;
  onDeleteItem: (itemId: string) => void;
}

const itemStatusLabel: Record<CircleItem['status'], string> = {
  pending: '未購入',
  bought: '購入済',
  soldout: '完売',
};
const itemStatusClass: Record<CircleItem['status'], string> = {
  pending: 'bg-zinc-700 text-zinc-400',
  bought: 'bg-green-400/15 text-green-400',
  soldout: 'bg-rose-400/15 text-rose-400',
};

const CircleCard: React.FC<CircleCardProps> = ({
  circle, items, circleIndex, totalCircles, eventName,
  onEdit, onDelete, onStatusChange, onItemStatusChange,
  onReorder, onAddItem, onEditItem, onDeleteItem,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [addToLibraryItem, setAddToLibraryItem] = useState<CircleItem | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const showItemStatus = items.length > 1;

  const handleAddedToLibrary = (itemId: string) => {
    setAddedItemIds(prev => new Set(prev).add(itemId));
    setAddToLibraryItem(null);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`bg-zinc-900 rounded-2xl border overflow-hidden shadow-sm transition-all duration-200 ${
          circle.status === 'bought'  ? 'border-green-400/30 shadow-green-950/40' :
          circle.status === 'soldout' ? 'border-red-900/60' :
          'border-zinc-800'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            {/* 優先順位バッジ: 即売会配下のサークルのみ表示（並び順 = order に連動） */}
            {circleIndex !== undefined && (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center font-mono text-sm font-bold text-violet-300 mt-0.5 tabular-nums"
                title={`優先順位 ${circleIndex + 1}`}
                aria-label={`優先順位 ${circleIndex + 1}`}
              >
                {circleIndex + 1}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-500 font-mono mb-0.5">
                {circle.hall} {circle.block}-{circle.number}
              </div>
              <h3 className="font-bold text-zinc-100 text-base leading-tight">{circle.name}</h3>
              <p className="text-sm text-zinc-400">{circle.author}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {circle.xUrl && (
                <a
                  href={circle.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X (Twitter) を開く"
                  className="p-2 text-sky-500 hover:text-sky-300 hover:bg-zinc-800 rounded-full transition-all duration-150 active:scale-90"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {items.length > 0 && (
                <button
                  onClick={() => openXShare(buildCircleShareText(circle, items, eventName))}
                  title="Xで共有（代理購入依頼）"
                  className="p-2 text-zinc-500 hover:text-sky-400 hover:bg-zinc-800 rounded-full transition-all duration-150 active:scale-90"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(circle)}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-all duration-150 active:scale-90"
                title="編集"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-all duration-150 active:scale-90"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onDelete(circle.id)}
                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-full transition-all duration-150 active:scale-90"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {(['pending', 'bought', 'soldout'] as Circle['status'][]).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(circle.id, s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 active:scale-95 ${
                  circle.status === s
                    ? statusClass[s]
                    : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                }`}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">アイテムなし</p>
            ) : (
              items.map(item => {
                const status = item.status ?? 'pending';
                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0 ${
                          item.type === 'shinkan' ? 'bg-blue-400/10 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {item.type === 'shinkan' ? '新刊' : item.type === 'kikan' ? '既刊' : item.type}
                        </span>
                        <span className="text-zinc-300 truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-zinc-400">¥{(item.price ?? 0).toLocaleString()} × {item.quantity}</span>
                        {(circle.status === 'bought' || item.status === 'bought') && (
                          <button
                            onClick={() => !addedItemIds.has(item.id) && setAddToLibraryItem(item)}
                            title={addedItemIds.has(item.id) ? '蔵書に追加済み' : '蔵書に追加'}
                            className={`p-1 transition-colors ${
                              addedItemIds.has(item.id)
                                ? 'text-green-400 cursor-default'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {addedItemIds.has(item.id)
                              ? <Check className="w-3.5 h-3.5" />
                              : <BookPlus className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => onEditItem(item)}
                          title="アイテムを編集"
                          className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {/* Per-item status (複数アイテム時のみ表示) */}
                    {showItemStatus && (
                      <div className="flex gap-1 pl-1">
                        {(['pending', 'bought', 'soldout'] as CircleItem['status'][]).map(s => (
                          <button
                            key={s}
                            onClick={() => onItemStatusChange(item.id, s)}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-all ${
                              status === s
                                ? `${itemStatusClass[s]} border-transparent`
                                : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                            }`}
                          >
                            {itemStatusLabel[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {items.length > 0 && (
              <div className="flex justify-end pt-1 border-t border-zinc-800">
                <span className="text-sm font-semibold text-green-400">小計: ¥{subtotal.toLocaleString()}</span>
              </div>
            )}
            {onReorder && (
              <div className="flex items-center gap-0.5 pt-1 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-600 mr-1">並び替え</span>
                <button
                  type="button"
                  onClick={() => onReorder(circle.id, 'top')}
                  disabled={circleIndex === 0}
                  title="最上位へ移動"
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-25 transition-colors rounded"
                ><ChevronsUp className="w-3.5 h-3.5" /></button>
                <button
                  type="button"
                  onClick={() => onReorder(circle.id, 'up')}
                  disabled={circleIndex === 0}
                  title="一つ上へ"
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-25 transition-colors rounded"
                ><ChevronUp className="w-3.5 h-3.5" /></button>
                <button
                  type="button"
                  onClick={() => onReorder(circle.id, 'down')}
                  disabled={(circleIndex ?? 0) >= (totalCircles ?? 1) - 1}
                  title="一つ下へ"
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-25 transition-colors rounded"
                ><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <button
              onClick={() => onAddItem(circle.id)}
              className="w-full mt-1 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-600 transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              <Plus className="w-3.5 h-3.5" /> アイテムを追加
            </button>
          </div>
        )}
      </motion.div>
      <AnimatePresence>
        {addToLibraryItem && (
          <AddToLibraryModal
            item={addToLibraryItem}
            circle={circle}
            onClose={() => setAddToLibraryItem(null)}
            onAdded={handleAddedToLibrary}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ─── AddCircleModal ────────────────────────────────────────────────────────

interface AddCircleModalProps {
  onAdd: (data: Omit<Circle, 'id' | 'eventId' | 'order' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const AddCircleModal: React.FC<AddCircleModalProps> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ name: '', author: '', hall: '', block: '', number: '', xUrl: '' });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const { xUrl, ...rest } = form;
    onAdd({ ...rest, ...(xUrl ? { xUrl } : {}) });
    onClose();
  };

  const authorTrimmed = form.author.trim().toLowerCase();
  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: booksApi.list,
  });
  const matchingBooks = authorTrimmed.length > 0
    ? allBooks.filter(b => b.author.toLowerCase().includes(authorTrimmed))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">サークルを追加</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">サークル名 *</label>
            <Input name="name" value={form.name} onChange={handleChange} placeholder="サークル名" required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">作者名</label>
            <Input name="author" value={form.author} onChange={handleChange} placeholder="作者名" />
            {matchingBooks.length > 0 && (
              <div className="mt-1.5 px-3 py-2 bg-blue-400/5 border border-blue-400/20 rounded-lg">
                <p className="text-xs text-blue-400 font-medium mb-1">
                  この作者の本を {matchingBooks.length} 冊所持しています
                </p>
                <ul className="space-y-0.5">
                  {matchingBooks.slice(0, 3).map(b => (
                    <li key={b.id} className="text-xs text-zinc-400 truncate">・{b.title}</li>
                  ))}
                  {matchingBooks.length > 3 && (
                    <li className="text-xs text-zinc-500">他 {matchingBooks.length - 3} 冊...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">ホール</label>
              <Input name="hall" value={form.hall} onChange={handleChange} placeholder="東1" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">ブロック</label>
              <Input name="block" value={form.block} onChange={handleChange} placeholder="A" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">番号</label>
              <Input name="number" value={form.number} onChange={handleChange} placeholder="01a" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">X (Twitter)</label>
            <Input name="xUrl" value={form.xUrl} onChange={handleChange} placeholder="https://x.com/example" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">追加</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── EditCircleModal ───────────────────────────────────────────────────────

interface EditCircleModalProps {
  circle: Circle;
  onSave: (id: string, data: Partial<Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onClose: () => void;
}

const EditCircleModal: React.FC<EditCircleModalProps> = ({ circle, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: circle.name,
    author: circle.author,
    hall: circle.hall,
    block: circle.block,
    number: circle.number,
    xUrl: circle.xUrl ?? '',
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const { xUrl, ...rest } = form;
    onSave(circle.id, { ...rest, xUrl: xUrl || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">サークルを編集</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">サークル名 *</label>
            <Input name="name" value={form.name} onChange={handleChange} placeholder="サークル名" required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">作者名</label>
            <Input name="author" value={form.author} onChange={handleChange} placeholder="作者名" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">ホール</label>
              <Input name="hall" value={form.hall} onChange={handleChange} placeholder="東1" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">ブロック</label>
              <Input name="block" value={form.block} onChange={handleChange} placeholder="A" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">番号</label>
              <Input name="number" value={form.number} onChange={handleChange} placeholder="01a" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">X (Twitter)</label>
            <Input name="xUrl" value={form.xUrl} onChange={handleChange} placeholder="https://x.com/example" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">保存</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── AddItemModal ──────────────────────────────────────────────────────────

interface AddItemModalProps {
  circleId: string;
  onAdd: (data: Omit<CircleItem, 'id' | 'status' | 'onlineStatus' | 'addedToLibraryBookId'>) => void;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ circleId, onAdd, onClose }) => {
  const [category, setCategory] = useState<'doujin' | 'other'>('doujin');
  const [form, setForm] = useState({ title: '', type: 'shinkan', price: 500, quantity: 1 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (category === 'other' && !form.type.trim()) return;
    onAdd({ ...form, circleId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">アイテムを追加</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">タイトル *</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="タイトルを入力"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">種別</label>
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5 mb-2">
              <button type="button"
                onClick={() => { setCategory('doujin'); setForm(f => ({ ...f, type: 'shinkan' })); }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${category === 'doujin' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                同人誌
              </button>
              <button type="button"
                onClick={() => { setCategory('other'); setForm(f => ({ ...f, type: '' })); }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${category === 'other' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                その他
              </button>
            </div>
            {category === 'doujin' ? (
              <div className="flex gap-2">
                {[{ v: 'shinkan', l: '新刊' }, { v: 'kikan', l: '既刊' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, type: v }))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${form.type === v ? 'border-zinc-400 bg-zinc-700 text-zinc-100' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <Input
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  placeholder="タペストリー、アクリルスタンドなど"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['タペストリー', 'アクリルスタンド', '缶バッジ', 'クリアファイル', 'ブロマイド'].map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(f => ({ ...f, type: s }))}
                      className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">価格（円）</label>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, price: Math.max(0, f.price - 100) }))}
                  className="w-8 h-9 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-bold flex-shrink-0">
                  −
                </button>
                <input
                  type="number" step="100" min="0"
                  value={form.price === 0 ? '' : form.price}
                  placeholder="0"
                  onChange={e => setForm(f => ({ ...f, price: e.target.value === '' ? 0 : Number(e.target.value) }))}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-zinc-100 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-white/10 min-w-0"
                />
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, price: f.price + 100 }))}
                  className="w-8 h-9 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-bold flex-shrink-0">
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">数量</label>
              <Input
                type="number" min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">追加</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── EditItemModal ─────────────────────────────────────────────────────────

interface EditItemModalProps {
  item: CircleItem;
  onSave: (id: string, data: Partial<Omit<CircleItem, 'id' | 'circleId'>>) => Promise<void> | void;
  onClose: () => void;
}

const DOUJIN_TYPES = new Set(['shinkan', 'kikan']);

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onSave, onClose }) => {
  const [category, setCategory] = useState<'doujin' | 'other'>(DOUJIN_TYPES.has(item.type) ? 'doujin' : 'other');
  const [form, setForm] = useState({
    title: item.title,
    type: item.type,
    price: item.price,
    quantity: item.quantity,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (category === 'other' && !form.type.trim()) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        title: form.title.trim(),
        type: form.type,
        price: form.price,
        quantity: form.quantity,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">アイテムを編集</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">タイトル *</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="タイトルを入力"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">種別</label>
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5 mb-2">
              <button type="button"
                onClick={() => {
                  setCategory('doujin');
                  // 旧 type が doujin 種別でなければ shinkan にフォールバック
                  if (!DOUJIN_TYPES.has(form.type)) setForm(f => ({ ...f, type: 'shinkan' }));
                }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${category === 'doujin' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                同人誌
              </button>
              <button type="button"
                onClick={() => {
                  setCategory('other');
                  if (DOUJIN_TYPES.has(form.type)) setForm(f => ({ ...f, type: '' }));
                }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${category === 'other' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                その他
              </button>
            </div>
            {category === 'doujin' ? (
              <div className="flex gap-2">
                {[{ v: 'shinkan', l: '新刊' }, { v: 'kikan', l: '既刊' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, type: v }))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${form.type === v ? 'border-zinc-400 bg-zinc-700 text-zinc-100' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <Input
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  placeholder="タペストリー、アクリルスタンドなど"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['タペストリー', 'アクリルスタンド', '缶バッジ', 'クリアファイル', 'ブロマイド'].map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(f => ({ ...f, type: s }))}
                      className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">価格（円）</label>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, price: Math.max(0, f.price - 100) }))}
                  className="w-8 h-9 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-bold flex-shrink-0">
                  −
                </button>
                <input
                  type="number" step="100" min="0"
                  value={form.price === 0 ? '' : form.price}
                  placeholder="0"
                  onChange={e => setForm(f => ({ ...f, price: e.target.value === '' ? 0 : Number(e.target.value) }))}
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-zinc-100 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-white/10 min-w-0"
                />
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, price: f.price + 100 }))}
                  className="w-8 h-9 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors font-bold flex-shrink-0">
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">数量</label>
              <Input
                type="number" min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>キャンセル</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── AddEventModal ─────────────────────────────────────────────────────────

interface AddEventModalProps {
  onAdd: (data: Omit<DoujinEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ name: '', date: '', budget: '' });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onAdd({
      name: form.name,
      date: form.date || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">即売会を追加</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">即売会名 *</label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="例: コミックマーケット105"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">日程</label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">予算（円）</label>
            <Input
              type="number"
              min="0"
              value={form.budget}
              onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              placeholder="例: 30000"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">追加</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── EditEventModal ────────────────────────────────────────────────────────

interface EditEventModalProps {
  event: DoujinEvent;
  onSave: (id: string, data: Partial<Pick<DoujinEvent, 'name' | 'date' | 'budget'>>) => void;
  onClose: () => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ event, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: event.name,
    date: event.date ?? '',
    budget: event.budget != null ? String(event.budget) : '',
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSave(event.id, {
      name: form.name,
      date: form.date || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 p-6 z-10"
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-4">即売会を編集</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">即売会名 *</label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">日程</label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">予算（円）</label>
            <Input
              type="number"
              min="0"
              value={form.budget}
              onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              placeholder="例: 30000"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">保存</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── SubmitTemplateModal ───────────────────────────────────────────────────

interface SubmitTemplateModalProps {
  event: DoujinEvent;
  onClose: () => void;
}

const SubmitTemplateModal: React.FC<SubmitTemplateModalProps> = ({ event, onClose }) => {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<'confirm' | 'done'>('confirm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 自分の VenueMap 全件を取得して、対象イベント分を抽出してプレビュー表示する。
  const { data: allMaps, isLoading: mapsLoading } = useQuery({
    queryKey: ['venueMaps'],
    queryFn: venueMapsApi.list,
    staleTime: 30_000,
  });
  const eventMaps = (allMaps ?? []).filter(m => m.eventId === event.id);

  const submit = useMutation({
    mutationFn: () => eventTemplatesApi.submit(event.id),
    onSuccess: () => {
      setStage('done');
      queryClient.invalidateQueries({ queryKey: ['eventTemplates', 'mine'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.payload?.error === 'already_pending') {
          setErrorMsg('このイベントは既に申請中です。承認まで少々お待ちください。');
          return;
        }
        if (err.status === 404) {
          setErrorMsg('元のイベントが見つかりません。');
          return;
        }
      }
      setErrorMsg('申請に失敗しました。時間をおいて再試行してください。');
    },
  });

  const totalImageBytes = eventMaps.reduce(
    (sum, m: VenueMap) => sum + (m.imageDataUrl?.length ?? 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4"
      >
        {stage === 'confirm' && (
          <>
            <div className="flex items-center gap-2 text-violet-300">
              <UploadCloud className="w-5 h-5" />
              <h2 className="text-base font-semibold">テンプレート申請</h2>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              この即売会を運営に申請して、承認されると公開テンプレート一覧（/templates）に掲載されます。
              申請時点の<strong className="text-zinc-200">イベント名 / 日付 / 会場マップ</strong>がスナップショットとして保存されます。
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500 text-xs">イベント名</span>
                <span className="text-zinc-100 font-medium truncate">{event.name}</span>
              </div>
              {event.date && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500 text-xs">日付</span>
                  <span className="text-zinc-300">{formatDate(event.date)}</span>
                </div>
              )}
              <div className="border-t border-zinc-800 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  会場マップ
                </div>
                {mapsLoading ? (
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    読み込み中…
                  </div>
                ) : eventMaps.length === 0 ? (
                  <div className="flex items-start gap-1.5 text-xs text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>この即売会にはホールマップが登録されていません。空のテンプレートとして申請されます（先にマップを登録することを推奨）。</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {eventMaps.map(m => (
                      <span
                        key={m.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                          m.imageDataUrl
                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {m.hall}
                        {!m.imageDataUrl && <span className="text-[9px]">画像なし</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {totalImageBytes > 0 && (
                <div className="text-[10px] text-zinc-600 pt-1">
                  申請データ概算: {(totalImageBytes / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submit.isPending}>
                キャンセル
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => submit.mutate()}
                isLoading={submit.isPending}
              >
                <UploadCloud className="w-4 h-4 mr-1.5" />
                申請する
              </Button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <>
            <div className="flex items-center gap-2 text-emerald-300">
              <Check className="w-5 h-5" />
              <h2 className="text-base font-semibold">申請を受け付けました</h2>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              運営の承認後、/templates ページに掲載されます。
              却下された場合や、申請状況の確認は後ほど対応予定です。
            </p>
            <div className="flex justify-end pt-1">
              <Button variant="default" size="sm" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── EventCard ─────────────────────────────────────────────────────────────

interface EventCardProps {
  event: DoujinEvent;
  circles: Circle[];
  circleItems: CircleItem[];
  onAddCircle: () => void;
  onEditCircle: (circle: Circle) => void;
  onDeleteCircle: (id: string) => void;
  onStatusChange: (id: string, status: Circle['status']) => void;
  onItemStatusChange: (itemId: string, status: CircleItem['status']) => void;
  onReorder: (id: string, dir: 'top' | 'up' | 'down') => void;
  onAddItem: (circleId: string) => void;
  onEditItem: (item: CircleItem) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: DoujinEvent) => void;
  onRequestTemplate: (event: DoujinEvent) => void;
}

const EventCard: React.FC<EventCardProps> = ({
  event, circles, circleItems,
  onAddCircle, onEditCircle, onDeleteCircle, onStatusChange, onItemStatusChange, onReorder,
  onAddItem, onEditItem, onDeleteItem, onDeleteEvent, onEditEvent, onRequestTemplate,
}) => {
  const [expanded, setExpanded] = useState(true);

  const pendingTotal = circles
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => {
      const items = circleItems.filter(i => i.circleId === c.id);
      return sum + items.reduce((s, i) => s + i.price * i.quantity, 0);
    }, 0);

  const spentTotal = circles
    .filter(c => c.status === 'bought')
    .reduce((sum, c) => {
      const items = circleItems.filter(i => i.circleId === c.id);
      return sum + items.reduce((s, i) => s + i.price * i.quantity, 0);
    }, 0);

  const hasNavigable = circles.some(c => c.status === 'pending');
  const spentPct   = event.budget ? Math.min(100, (spentTotal  / event.budget) * 100) : 0;
  const pendingPct = event.budget ? Math.min(100 - spentPct, (pendingTotal / event.budget) * 100) : 0;
  const overBudget = event.budget != null && (spentTotal + pendingTotal) > event.budget;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
    >
      {/* Event header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-100 text-base leading-tight">{event.name}</h3>
            {event.date && (
              <div className="flex items-center gap-1 mt-0.5 text-sm text-zinc-500">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formatDate(event.date)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasNavigable ? (
              <Link
                to={`/shopping/nav?eventId=${event.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                ナビ
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 cursor-default">
                <Navigation className="w-3.5 h-3.5" />
                ナビ
              </span>
            )}
            {circles.length > 0 && (
              <button
                onClick={() => openXShare(buildEventShareText(event, circles, circleItems))}
                title="Xで共有（代理購入依頼）"
                className="p-2 text-zinc-500 hover:text-sky-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEditEvent(event)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="編集"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRequestTemplate(event)}
              className="p-2 text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors"
              title="テンプレート申請"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDeleteEvent(event.id)}
              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Budget & spending info */}
        <div className="mt-3 flex items-center justify-between text-sm gap-4">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>
              未購入 <span className={`font-semibold ${overBudget ? 'text-red-400' : 'text-zinc-300'}`}>
                ¥{pendingTotal.toLocaleString()}
              </span>
            </span>
            {spentTotal > 0 && (
              <span>
                購入済 <span className="font-semibold text-green-400">¥{spentTotal.toLocaleString()}</span>
              </span>
            )}
          </div>
          {event.budget != null && (
            <span className="text-xs text-zinc-600 flex-shrink-0">
              予算 ¥{event.budget.toLocaleString()}
            </span>
          )}
        </div>

        {event.budget != null && (
          <div className="mt-2">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              {/* 購入済: green */}
              <div
                className="h-full bg-emerald-500 flex-shrink-0 transition-all duration-500"
                style={{ width: `${spentPct}%` }}
              />
              {/* 未購入: yellow / over budget: red */}
              <div
                className={`h-full flex-shrink-0 rounded-full transition-all duration-500 ${overBudget ? 'bg-red-500' : 'bg-yellow-400 rounded-full'}`}
                style={{ width: `${pendingPct}%` }}
              />
            </div>
          </div>
        )}

        {circles.length > 0 && (
          <div className="mt-2 text-xs text-zinc-600">
            {circles.length} サークル ·{' '}
            {circles.filter(c => c.status === 'bought').length} 購入済 ·{' '}
            {circles.filter(c => c.status === 'pending').length} 未購入
          </div>
        )}
      </div>

      {/* Circles list */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
          {circles.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">サークルがまだありません</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {circles.map(circle => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  items={circleItems.filter(i => i.circleId === circle.id)}
                  circleIndex={circles.indexOf(circle)}
                  totalCircles={circles.length}
                  eventName={event.name}
                  onEdit={onEditCircle}
                  onDelete={onDeleteCircle}
                  onStatusChange={onStatusChange}
                  onItemStatusChange={onItemStatusChange}
                  onReorder={onReorder}
                  onAddItem={onAddItem}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                />
              ))}
            </AnimatePresence>
          )}
          <button
            onClick={onAddCircle}
            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-600 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> サークルを追加
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ─── ShoppingListPage ──────────────────────────────────────────────────────

const ShoppingListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { open: openUpgrade } = useUpgradeModal();
  const { data: events, isLoading: eventsLoading } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: circles, isLoading: circlesLoading } = useQuery({ queryKey: ['circles'], queryFn: circlesApi.list });
  const { data: circleItems } = useQuery({ queryKey: ['circleItems'], queryFn: circleItemsApi.list });

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DoujinEvent | null>(null);
  const [submittingTemplateFor, setSubmittingTemplateFor] = useState<DoujinEvent | null>(null);
  const [addCircleForEvent, setAddCircleForEvent] = useState<string | null>(null);
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);
  const [addItemForCircle, setAddItemForCircle] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CircleItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);

  if (eventsLoading || circlesLoading) {
    return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  }

  const allItems = circleItems ?? [];
  const eventsList = events ?? [];
  const circlesList = (circles ?? []).sort((a, b) => a.order - b.order);

  // ── handlers ──

  const handleAddEvent = async (data: Omit<DoujinEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await eventsApi.create(data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err) {
      if (isPlanLimitError(err)) {
        openUpgrade({ resource: 'events', limit: err.payload?.limit ?? null, current: err.payload?.current });
        return;
      }
      throw err;
    }
  };

  const handleEditEvent = async (id: string, data: Partial<Pick<DoujinEvent, 'name' | 'date' | 'budget'>>) => {
    await eventsApi.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('この即売会とすべてのサークルを削除しますか？')) return;
    await eventsApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleAddCircle = async (data: Omit<Circle, 'id' | 'eventId' | 'order' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!addCircleForEvent) return;
    const maxOrder = Math.max(0, ...(circles ?? []).map(c => c.order));
    try {
      await circlesApi.create({ ...data, eventId: addCircleForEvent, order: maxOrder + 1, status: 'pending' });
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    } catch (err) {
      if (isPlanLimitError(err)) {
        openUpgrade({ resource: 'circles', limit: err.payload?.limit ?? null, current: err.payload?.current });
        return;
      }
      throw err;
    }
  };

  const handleEditCircle = async (id: string, data: Partial<Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>>) => {
    await circlesApi.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  };

  const handleDeleteCircle = async (id: string) => {
    if (!confirm('このサークルを削除しますか？')) return;
    await circlesApi.delete(id);
    queryClient.invalidateQueries({ queryKey: ['circles'] });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleStatusChange = async (id: string, status: Circle['status']) => {
    await circlesApi.update(id, { status });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  };

  const handleReorder = async (circleId: string, direction: 'top' | 'up' | 'down', eventId: string) => {
    const eventCircles = circlesList
      .filter(c => c.eventId === eventId)
      .sort((a, b) => a.order - b.order);
    const idx = eventCircles.findIndex(c => c.id === circleId);
    if (idx === -1) return;
    if (direction === 'top' && idx > 0) {
      await circlesApi.update(circleId, { order: eventCircles[0].order - 1 });
    } else if (direction === 'up' && idx > 0) {
      const prev = eventCircles[idx - 1];
      const curr = eventCircles[idx];
      await Promise.all([
        circlesApi.update(curr.id, { order: prev.order }),
        circlesApi.update(prev.id, { order: curr.order }),
      ]);
    } else if (direction === 'down' && idx < eventCircles.length - 1) {
      const next = eventCircles[idx + 1];
      const curr = eventCircles[idx];
      await Promise.all([
        circlesApi.update(curr.id, { order: next.order }),
        circlesApi.update(next.id, { order: curr.order }),
      ]);
    }
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  };

  const handleAddItem = async (data: Omit<CircleItem, 'id' | 'status' | 'onlineStatus' | 'addedToLibraryBookId'>) => {
    await circleItemsApi.create(data);
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleEditItem = async (id: string, data: Partial<Omit<CircleItem, 'id' | 'circleId'>>) => {
    await circleItemsApi.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleDeleteItem = async (itemId: string) => {
    await circleItemsApi.delete(itemId);
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleItemStatusChange = async (itemId: string, status: CircleItem['status']) => {
    await circleItemsApi.update(itemId, { status });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  };

  const handleCirclesCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseCirclesFile(buffer);
      if (!confirm(`${rows.length}件のサークルをインポートします。よろしいですか？`)) return;
      const existing = circles ?? [];
      const baseOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order)) + 1 : 0;
      await circlesApi.bulkCreate(rows.map((r, i) => ({
        ...r,
        order: baseOrder + i,
        status: r.status ?? 'pending',
      })));
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      alert(`${rows.length}件のサークルをインポートしました。`);
    } catch (err) {
      if (isPlanLimitError(err)) {
        openUpgrade({ resource: 'circles', limit: err.payload?.limit ?? null, current: err.payload?.current });
      } else {
        console.error(err);
        alert(`インポートに失敗しました。\n${err instanceof Error ? err.message : ''}`);
      }
    } finally {
      e.target.value = '';
    }
  };

  const handleCirclesJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await file.text();
      const rows = parseCirclesJson(json);
      if (!confirm(`${rows.length}件のサークルをインポートします。よろしいですか？`)) return;
      const existing = circles ?? [];
      const baseOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order)) + 1 : 0;
      await circlesApi.bulkCreate(rows.map((r, i) => ({
        ...r,
        order: baseOrder + i,
        status: r.status ?? 'pending',
      })));
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      alert(`${rows.length}件のサークルをインポートしました。`);
    } catch (err) {
      if (isPlanLimitError(err)) {
        openUpgrade({ resource: 'circles', limit: err.payload?.limit ?? null, current: err.payload?.current });
      } else {
        console.error(err);
        alert(`インポートに失敗しました。\n${err instanceof Error ? err.message : ''}`);
      }
    } finally {
      e.target.value = '';
    }
  };

  const handleExportJson = () => exportCirclesJson(circlesList, allItems);
  const handleExportCsv = () => exportCirclesCsv(circlesList);
  const handleExportExcel = () => exportCirclesExcel(circlesList);

  // Circles not linked to any event (legacy / migrated data)
  const orphanCircles = circlesList.filter(c => !c.eventId);

  const sidebarFooter = (
    <div className="space-y-2.5">
      <div className="mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">データ管理</p>
        <p className="text-xs text-zinc-600">買い物リストのエキスポート・インポート</p>
      </div>

      {/* エキスポートドロップダウン */}
      <div className="relative">
        <Button
          onClick={() => { setExportMenuOpen(v => !v); setImportMenuOpen(false); }}
          variant="outline"
          size="sm"
          className="w-full relative flex items-center justify-center gap-2"
        >
          <Upload className="w-3.5 h-3.5" />
          エキスポート
          <ChevronDown className="w-3.5 h-3.5 absolute right-3" />
        </Button>
        {exportMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
              <button
                onClick={() => { handleExportJson(); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                JSON 形式
              </button>
              <button
                onClick={() => { handleExportCsv(); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                CSV 形式
              </button>
              <button
                onClick={() => { handleExportExcel(); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                Excel 形式
              </button>
            </div>
          </>
        )}
      </div>

      {/* インポートドロップダウン */}
      <div className="relative">
        <Button
          onClick={() => { setImportMenuOpen(v => !v); setExportMenuOpen(false); }}
          variant="outline"
          size="sm"
          className="w-full relative flex items-center justify-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          インポート
          <ChevronDown className="w-3.5 h-3.5 absolute right-3" />
        </Button>
        {importMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setImportMenuOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
              <button
                onClick={() => { jsonImportRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                JSON 形式
              </button>
              <button
                onClick={() => { csvImportRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                CSV 形式
              </button>
              <button
                onClick={() => { excelImportRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                Excel 形式
              </button>
            </div>
          </>
        )}
      </div>

      <input
        ref={jsonImportRef}
        type="file"
        accept="application/json,.json"
        onChange={handleCirclesJsonImport}
        className="hidden"
      />
      <input
        ref={csvImportRef}
        type="file"
        accept=".csv"
        onChange={handleCirclesCsvImport}
        className="hidden"
      />
      <input
        ref={excelImportRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleCirclesCsvImport}
        className="hidden"
      />

      {/* テンプレート */}
      <Button
        onClick={downloadCirclesTemplate}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        <FileDown className="w-3.5 h-3.5" />
        テンプレートをDL (CSV/Excel)
      </Button>
      <p className="text-xs text-zinc-700 text-center pt-1">テンプレートのフォーマットに合わせてご記入ください</p>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* サイドバー */}
      <PageSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        footer={sidebarFooter}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto min-w-0">
      <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-zinc-100">買い物リスト</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddEvent(true)}>
            <Plus className="w-4 h-4 mr-1" /> 即売会を追加
          </Button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
            title="ツールを開く"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <ShoppingTabs />
      </div>

      {eventsList.length === 0 && orphanCircles.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p>即売会がまだ追加されていません</p>
          <p className="text-sm mt-1">「即売会を追加」から始めましょう</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {eventsList.map(event => (
              <EventCard
                key={event.id}
                event={event}
                circles={circlesList.filter(c => c.eventId === event.id)}
                circleItems={allItems}
                onAddCircle={() => setAddCircleForEvent(event.id)}
                onEditCircle={setEditingCircle}
                onDeleteCircle={handleDeleteCircle}
                onStatusChange={handleStatusChange}
                onItemStatusChange={handleItemStatusChange}
                onReorder={(id, dir) => handleReorder(id, dir, event.id)}
                onAddItem={setAddItemForCircle}
                onEditItem={setEditingItem}
                onDeleteItem={handleDeleteItem}
                onDeleteEvent={handleDeleteEvent}
                onEditEvent={setEditingEvent}
                onRequestTemplate={setSubmittingTemplateFor}
              />
            ))}
          </AnimatePresence>

          {/* Orphan circles (circles without an event) */}
          {orphanCircles.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h3 className="text-sm font-medium text-zinc-500 mb-3">未分類のサークル</h3>
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {orphanCircles.map(circle => (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      items={allItems.filter(i => i.circleId === circle.id)}
                      onEdit={setEditingCircle}
                      onDelete={handleDeleteCircle}
                      onStatusChange={handleStatusChange}
                      onItemStatusChange={handleItemStatusChange}
                      onAddItem={setAddItemForCircle}
                      onEditItem={setEditingItem}
                      onDeleteItem={handleDeleteItem}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddEvent && (
          <AddEventModal onAdd={handleAddEvent} onClose={() => setShowAddEvent(false)} />
        )}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            onSave={handleEditEvent}
            onClose={() => setEditingEvent(null)}
          />
        )}
        {addCircleForEvent && (
          <AddCircleModal
            onAdd={handleAddCircle}
            onClose={() => setAddCircleForEvent(null)}
          />
        )}
        {editingCircle && (
          <EditCircleModal
            circle={editingCircle}
            onSave={handleEditCircle}
            onClose={() => setEditingCircle(null)}
          />
        )}
        {addItemForCircle && (
          <AddItemModal
            circleId={addItemForCircle}
            onAdd={handleAddItem}
            onClose={() => setAddItemForCircle(null)}
          />
        )}
        {editingItem && (
          <EditItemModal
            item={editingItem}
            onSave={handleEditItem}
            onClose={() => setEditingItem(null)}
          />
        )}
        {submittingTemplateFor && (
          <SubmitTemplateModal
            event={submittingTemplateFor}
            onClose={() => setSubmittingTemplateFor(null)}
          />
        )}
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
};

export default ShoppingListPage;
