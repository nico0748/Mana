import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../lib/db';
import type { Circle, CircleItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const statusLabel: Record<Circle['status'], string> = {
  pending: '未購入',
  bought: '購入済',
  soldout: '完売',
  skipped: 'スキップ',
};

const statusClass: Record<Circle['status'], string> = {
  pending: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  bought: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  soldout: 'bg-red-900/30 text-red-400 border-red-900',
  skipped: 'bg-zinc-800/50 text-zinc-500 border-zinc-700',
};

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
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-zinc-900 rounded-xl border ${circle.status === 'bought' ? 'border-yellow-400/30' : circle.status === 'soldout' ? 'border-red-900' : 'border-zinc-800'} overflow-hidden`}
    >
      {/* Header */}
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

        {/* Status buttons */}
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

      {/* Items */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">アイテムなし</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0 ${
                    item.type === 'shinkan' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {item.type === 'shinkan' ? '新刊' : '既刊'}
                  </span>
                  <span className="text-zinc-300 truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-zinc-400">¥{item.price.toLocaleString()} × {item.quantity}</span>
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
              <span className="text-sm font-semibold text-yellow-400">小計: ¥{subtotal.toLocaleString()}</span>
            </div>
          )}
          <button
            onClick={() => onAddItem(circle.id)}
            className="w-full mt-1 py-2 text-sm text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800 rounded-lg border border-dashed border-zinc-700 hover:border-yellow-400/50 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> アイテムを追加
          </button>
        </div>
      )}
    </motion.div>
  );
};

interface AddCircleModalProps {
  onAdd: (data: Omit<Circle, 'id' | 'order' | 'status' | 'createdAt' | 'updatedAt'>) => void;
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
              className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md py-2 pl-3 pr-8 text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 w-full"
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

const ShoppingListPage: React.FC = () => {
  const circles = useLiveQuery(() => db.circles.orderBy('order').toArray(), []);
  const circleItems = useLiveQuery(() => db.circleItems.toArray(), []);
  const [showAddCircle, setShowAddCircle] = useState(false);
  const [addItemForCircle, setAddItemForCircle] = useState<string | null>(null);

  const totalAmount = (circles ?? [])
    .filter(c => c.status === 'pending')
    .reduce((sum, circle) => {
      const items = (circleItems ?? []).filter(i => i.circleId === circle.id);
      return sum + items.reduce((s, item) => s + item.price * item.quantity, 0);
    }, 0);

  const handleAddCircle = async (data: Omit<Circle, 'id' | 'order' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const maxOrder = Math.max(0, ...(circles ?? []).map(c => c.order));
    const now = Date.now();
    await db.circles.add({
      ...data,
      id: crypto.randomUUID(),
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

  if (circles === undefined) {
    return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Total + Nav button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">予算合計（未購入）</div>
          <div className="text-2xl font-bold text-yellow-400">¥{totalAmount.toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          {circles.length > 0 && (
            <Link to="/shopping/nav">
              <Button variant="outline" className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                ナビモード
              </Button>
            </Link>
          )}
          <Button onClick={() => setShowAddCircle(true)}>
            <Plus className="w-4 h-4 mr-1" /> サークルを追加
          </Button>
        </div>
      </div>

      {circles.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p>サークルをまだ追加していません</p>
          <p className="text-sm mt-1">「サークルを追加」から始めましょう</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {circles.map(circle => (
              <CircleCard
                key={circle.id}
                circle={circle}
                items={(circleItems ?? []).filter(i => i.circleId === circle.id)}
                onDelete={handleDeleteCircle}
                onStatusChange={handleStatusChange}
                onAddItem={setAddItemForCircle}
                onDeleteItem={handleDeleteItem}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showAddCircle && (
          <AddCircleModal onAdd={handleAddCircle} onClose={() => setShowAddCircle(false)} />
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
  );
};

// Inline icon for empty state
const ShoppingBag: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
  </svg>
);

export default ShoppingListPage;
