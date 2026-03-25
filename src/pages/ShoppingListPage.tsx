import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trash2, Navigation, ChevronDown, ChevronUp,
  BookPlus, Check, Calendar, Pencil, FileSpreadsheet, FileDown, PanelLeft,
} from 'lucide-react';
import { db } from '../lib/db';
import type { Circle, CircleItem, DoujinEvent } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageSidebar } from '../components/layout/PageSidebar';
import { parseCirclesFile, downloadCirclesTemplate } from '../lib/circlesCsv';

// ─── status helpers ────────────────────────────────────────────────────────

const statusLabel: Record<Circle['status'], string> = {
  pending: '未購入',
  bought: '購入済',
  soldout: '完売',
  skipped: 'スキップ',
};

const statusClass: Record<Circle['status'], string> = {
  pending: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  bought: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  soldout: 'bg-red-900/30 text-red-400 border-red-900',
  skipped: 'bg-zinc-800/50 text-zinc-500 border-zinc-700',
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

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
    const now = Date.now();
    await db.books.add({
      id: crypto.randomUUID(),
      title,
      author,
      type: 'doujin',
      status: 'owned',
      price,
      createdAt: now,
      updatedAt: now,
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
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Circle['status']) => void;
  onAddItem: (circleId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

const CircleCard: React.FC<CircleCardProps> = ({ circle, items, onDelete, onStatusChange, onAddItem, onDeleteItem }) => {
  const [expanded, setExpanded] = useState(true);
  const [addToLibraryItem, setAddToLibraryItem] = useState<CircleItem | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
        className={`bg-zinc-950 rounded-xl border ${
          circle.status === 'bought' ? 'border-emerald-500/30' :
          circle.status === 'soldout' ? 'border-red-900' :
          'border-zinc-800'
        } overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-500 font-mono mb-0.5">
                {circle.hall} {circle.block}-{circle.number}
              </div>
              <h3 className="font-bold text-zinc-100 text-base leading-tight">{circle.name}</h3>
              <p className="text-sm text-zinc-400">{circle.author}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onDelete(circle.id)}
                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {(['pending', 'bought', 'soldout', 'skipped'] as Circle['status'][]).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(circle.id, s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                  circle.status === s
                    ? statusClass[s]
                    : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'
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
              items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0 ${
                      item.type === 'shinkan' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {item.type === 'shinkan' ? '新刊' : '既刊'}
                    </span>
                    <span className="text-zinc-300 truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-zinc-400">¥{item.price.toLocaleString()} × {item.quantity}</span>
                    {circle.status === 'bought' && (
                      <button
                        onClick={() => !addedItemIds.has(item.id) && setAddToLibraryItem(item)}
                        title={addedItemIds.has(item.id) ? '蔵書に追加済み' : '蔵書に追加'}
                        className={`p-1 transition-colors ${
                          addedItemIds.has(item.id)
                            ? 'text-emerald-500 cursor-default'
                            : 'text-zinc-500 hover:text-emerald-400'
                        }`}
                      >
                        {addedItemIds.has(item.id)
                          ? <Check className="w-3.5 h-3.5" />
                          : <BookPlus className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
            {items.length > 0 && (
              <div className="flex justify-end pt-1 border-t border-zinc-800">
                <span className="text-sm font-semibold text-emerald-500">小計: ¥{subtotal.toLocaleString()}</span>
              </div>
            )}
            <button
              onClick={() => onAddItem(circle.id)}
              className="w-full mt-1 py-2 text-sm text-zinc-500 hover:text-emerald-500 hover:bg-zinc-800 rounded-lg border border-dashed border-zinc-700 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-1"
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
  const [form, setForm] = useState({ name: '', author: '', hall: '', block: '', number: '' });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onAdd(form);
    onClose();
  };

  const authorTrimmed = form.author.trim().toLowerCase();
  const matchingBooks = useLiveQuery(
    () =>
      authorTrimmed.length > 0
        ? db.books.filter(b => b.author.toLowerCase().includes(authorTrimmed)).toArray()
        : Promise.resolve([]),
    [authorTrimmed]
  );

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
            {matchingBooks && matchingBooks.length > 0 && (
              <div className="mt-1.5 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-400 font-medium mb-1">
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
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">キャンセル</Button>
            <Button type="submit" className="flex-1">追加</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── AddItemModal ──────────────────────────────────────────────────────────

interface AddItemModalProps {
  circleId: string;
  onAdd: (data: Omit<CircleItem, 'id'>) => void;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ circleId, onAdd, onClose }) => {
  const [form, setForm] = useState({ title: '', type: 'shinkan' as CircleItem['type'], price: 0, quantity: 1 });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'quantity' ? Number(value) : value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">タイトル *</label>
            <Input name="title" value={form.title} onChange={handleChange} placeholder="本のタイトル" required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">種別</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md py-2 pl-3 pr-8 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
            >
              <option value="shinkan">新刊</option>
              <option value="kikan">既刊</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">価格（円）</label>
              <Input name="price" type="number" min="0" value={form.price} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">数量</label>
              <Input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
            </div>
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
    budget: event.budget !== undefined ? String(event.budget) : '',
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

// ─── EventCard ─────────────────────────────────────────────────────────────

interface EventCardProps {
  event: DoujinEvent;
  circles: Circle[];
  circleItems: CircleItem[];
  onAddCircle: () => void;
  onDeleteCircle: (id: string) => void;
  onStatusChange: (id: string, status: Circle['status']) => void;
  onAddItem: (circleId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: DoujinEvent) => void;
}

const EventCard: React.FC<EventCardProps> = ({
  event, circles, circleItems,
  onAddCircle, onDeleteCircle, onStatusChange,
  onAddItem, onDeleteItem, onDeleteEvent, onEditEvent,
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

  const hasNavigable = circles.some(c => c.status === 'pending' || c.status === 'skipped');
  const budgetPct = event.budget ? Math.min(100, (pendingTotal / event.budget) * 100) : 0;
  const overBudget = event.budget !== undefined && pendingTotal > event.budget;

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
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
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
            <button
              onClick={() => onEditEvent(event)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="編集"
            >
              <Pencil className="w-4 h-4" />
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
                購入済 <span className="font-semibold text-emerald-500">¥{spentTotal.toLocaleString()}</span>
              </span>
            )}
          </div>
          {event.budget !== undefined && (
            <span className="text-xs text-zinc-600 flex-shrink-0">
              予算 ¥{event.budget.toLocaleString()}
            </span>
          )}
        </div>

        {event.budget !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${budgetPct}%` }}
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
                  onDelete={onDeleteCircle}
                  onStatusChange={onStatusChange}
                  onAddItem={onAddItem}
                  onDeleteItem={onDeleteItem}
                />
              ))}
            </AnimatePresence>
          )}
          <button
            onClick={onAddCircle}
            className="w-full py-2 text-sm text-zinc-500 hover:text-emerald-500 hover:bg-zinc-800 rounded-lg border border-dashed border-zinc-700 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-1"
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
  const events = useLiveQuery(() => db.doujinEvents.orderBy('createdAt').toArray(), []);
  const circles = useLiveQuery(() => db.circles.orderBy('order').toArray(), []);
  const circleItems = useLiveQuery(() => db.circleItems.toArray(), []);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DoujinEvent | null>(null);
  const [addCircleForEvent, setAddCircleForEvent] = useState<string | null>(null);
  const [addItemForCircle, setAddItemForCircle] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const csvImportRef = useRef<HTMLInputElement>(null);

  if (events === undefined || circles === undefined) {
    return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  }

  const allItems = circleItems ?? [];

  // ── handlers ──

  const handleAddEvent = async (data: Omit<DoujinEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    await db.doujinEvents.add({ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
  };

  const handleEditEvent = async (id: string, data: Partial<Pick<DoujinEvent, 'name' | 'date' | 'budget'>>) => {
    await db.doujinEvents.update(id, { ...data, updatedAt: Date.now() });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('この即売会とすべてのサークルを削除しますか？')) return;
    const eventCircles = await db.circles.where('eventId').equals(id).toArray();
    for (const c of eventCircles) {
      await db.circleItems.where('circleId').equals(c.id).delete();
    }
    await db.circles.where('eventId').equals(id).delete();
    await db.doujinEvents.delete(id);
  };

  const handleAddCircle = async (data: Omit<Circle, 'id' | 'eventId' | 'order' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!addCircleForEvent) return;
    const allCircles = await db.circles.toArray();
    const maxOrder = Math.max(0, ...allCircles.map(c => c.order));
    const now = Date.now();
    await db.circles.add({
      ...data,
      id: crypto.randomUUID(),
      eventId: addCircleForEvent,
      order: maxOrder + 1,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleDeleteCircle = async (id: string) => {
    if (!confirm('このサークルを削除しますか？')) return;
    await db.circles.delete(id);
    await db.circleItems.where('circleId').equals(id).delete();
  };

  const handleStatusChange = async (id: string, status: Circle['status']) => {
    await db.circles.update(id, { status, updatedAt: Date.now() });
  };

  const handleAddItem = async (data: Omit<CircleItem, 'id'>) => {
    await db.circleItems.add({ ...data, id: crypto.randomUUID() });
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.circleItems.delete(itemId);
  };

  const handleCirclesCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseCirclesFile(buffer);
      if (!confirm(`${rows.length}件のサークルをインポートします。よろしいですか？`)) return;
      const existing = await db.circles.orderBy('order').toArray();
      const baseOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order)) + 1 : 0;
      const now = Date.now();
      await db.circles.bulkAdd(rows.map((r, i) => ({
        ...r,
        id: crypto.randomUUID(),
        order: baseOrder + i,
        createdAt: now,
        updatedAt: now,
      })));
      alert(`${rows.length}件のサークルをインポートしました。`);
    } catch (err) {
      console.error(err);
      alert(`インポートに失敗しました。\n${err instanceof Error ? err.message : ''}`);
    } finally {
      if (csvImportRef.current) csvImportRef.current.value = '';
    }
  };

  // Circles not linked to any event (legacy / migrated data)
  const orphanCircles = circles.filter(c => !c.eventId);

  const sidebarFooter = (
    <div className="space-y-2.5">
      <div className="mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">買い物リストのインポート</p>
        <p className="text-xs text-zinc-600">CSV/Excelからサークルを一括登録</p>
      </div>
      <Button
        onClick={downloadCirclesTemplate}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        <FileDown className="w-3.5 h-3.5" />
        テンプレートをDL
      </Button>
      <Button
        onClick={() => csvImportRef.current?.click()}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        CSV / Excelからインポート
      </Button>
      <input
        ref={csvImportRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleCirclesCsvImport}
        className="hidden"
      />
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
      <div className="flex items-center justify-between mb-4">
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

      {events.length === 0 && orphanCircles.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p>即売会がまだ追加されていません</p>
          <p className="text-sm mt-1">「即売会を追加」から始めましょう</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                circles={circles.filter(c => c.eventId === event.id)}
                circleItems={allItems}
                onAddCircle={() => setAddCircleForEvent(event.id)}
                onDeleteCircle={handleDeleteCircle}
                onStatusChange={handleStatusChange}
                onAddItem={setAddItemForCircle}
                onDeleteItem={handleDeleteItem}
                onDeleteEvent={handleDeleteEvent}
                onEditEvent={setEditingEvent}
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
                      onDelete={handleDeleteCircle}
                      onStatusChange={handleStatusChange}
                      onAddItem={setAddItemForCircle}
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
        {addItemForCircle && (
          <AddItemModal
            circleId={addItemForCircle}
            onAdd={handleAddItem}
            onClose={() => setAddItemForCircle(null)}
          />
        )}
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
};

export default ShoppingListPage;
