import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { db } from '../lib/db';
import type { Distribution } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type Tab = 'distributions' | 'register';

interface CartItem {
  distribution: Distribution;
  quantity: number;
}

const BILLS = [10000, 5000, 1000];
const COINS = [500, 100, 50, 10];

const CashRegisterPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('register');
  const distributions = useLiveQuery(() => db.distributions.orderBy('createdAt').toArray(), []);

  // Distribution form
  const [showAddDist, setShowAddDist] = useState(false);
  const [distForm, setDistForm] = useState({ title: '', price: 0, stock: 0 });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [received, setReceived] = useState(0);

  const cartTotal = cart.reduce((sum, item) => sum + item.distribution.price * item.quantity, 0);
  const change = received - cartTotal;

  const handleAddToCart = (dist: Distribution) => {
    setCart(prev => {
      const existing = prev.find(c => c.distribution.id === dist.id);
      if (existing) {
        return prev.map(c => c.distribution.id === dist.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { distribution: dist, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (distId: string) => {
    setCart(prev => {
      const item = prev.find(c => c.distribution.id === distId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter(c => c.distribution.id !== distId);
      return prev.map(c => c.distribution.id === distId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const handleAddMoney = (amount: number) => {
    setReceived(prev => prev + amount);
  };

  const handleClearRegister = () => {
    setCart([]);
    setReceived(0);
  };

  const handleAddDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distForm.title) return;
    const now = Date.now();
    await db.distributions.add({
      ...distForm,
      id: crypto.randomUUID(),
      sold: 0,
      createdAt: now,
      updatedAt: now,
    });
    setDistForm({ title: '', price: 0, stock: 0 });
    setShowAddDist(false);
  };

  const handleDeleteDistribution = async (id: string) => {
    if (!confirm('この頒布物を削除しますか？')) return;
    await db.distributions.delete(id);
    setCart(prev => prev.filter(c => c.distribution.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 px-4">
        {(['register', 'distributions'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium relative transition-colors ${
              tab === t ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'register' ? <ShoppingCart className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            {t === 'register' ? 'レジ' : '頒布物管理'}
            {tab === t && (
              <motion.div
                layoutId="registerTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400"
              />
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'distributions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAddDist(true)}>
                <Plus className="w-4 h-4 mr-1" /> 頒布物を追加
              </Button>
            </div>

            <AnimatePresence>
              {showAddDist && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddDistribution} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-zinc-100">新しい頒布物</h3>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">タイトル *</label>
                      <Input
                        value={distForm.title}
                        onChange={e => setDistForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="タイトル"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">価格（円）</label>
                        <Input
                          type="number"
                          min="0"
                          value={distForm.price}
                          onChange={e => setDistForm(p => ({ ...p, price: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">在庫数</label>
                        <Input
                          type="number"
                          min="0"
                          value={distForm.stock}
                          onChange={e => setDistForm(p => ({ ...p, stock: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddDist(false)} className="flex-1">キャンセル</Button>
                      <Button type="submit" className="flex-1">追加</Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {(distributions ?? []).length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p>頒布物がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(distributions ?? []).map(dist => (
                  <div key={dist.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-zinc-100 leading-tight">{dist.title}</h3>
                        <p className="text-yellow-400 font-bold text-lg mt-1">¥{dist.price.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDistribution(dist.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-zinc-500">在庫: <span className="text-zinc-300 font-medium">{dist.stock}</span></span>
                      <span className="text-zinc-500">販売済: <span className="text-zinc-300 font-medium">{dist.sold}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'register' && (
          <div className="space-y-4">
            {/* Distribution grid to add to cart */}
            {(distributions ?? []).length > 0 && (
              <div>
                <h3 className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-2">頒布物を選択</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(distributions ?? []).map(dist => (
                    <button
                      key={dist.id}
                      onClick={() => handleAddToCart(dist)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-yellow-400/50 hover:bg-zinc-800 rounded-xl p-3 text-left transition-all active:scale-95"
                    >
                      <div className="text-sm font-medium text-zinc-100 line-clamp-2 leading-tight">{dist.title}</div>
                      <div className="text-yellow-400 font-bold mt-1">¥{dist.price.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-yellow-400" />
                  カート
                </h3>
                {cart.length > 0 && (
                  <button onClick={handleClearRegister} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                    会計クリア
                  </button>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-600">
                  商品をタップして追加してください
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {cart.map(item => (
                    <div key={item.distribution.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-100 truncate">{item.distribution.title}</div>
                        <div className="text-xs text-zinc-500">¥{item.distribution.price.toLocaleString()} × {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-100">
                          ¥{(item.distribution.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.distribution.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Total */}
              <div className="px-4 py-3 border-t border-zinc-700 flex justify-between items-center">
                <span className="text-zinc-400 font-medium">合計</span>
                <span className="text-2xl font-bold text-yellow-400">¥{cartTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Money input */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-3">お預かり</h3>
              <div className="space-y-2 mb-3">
                <div className="text-sm text-zinc-500 font-medium">紙幣</div>
                <div className="flex gap-2">
                  {BILLS.map(bill => (
                    <button
                      key={bill}
                      onClick={() => handleAddMoney(bill)}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl text-sm transition-colors active:scale-95"
                    >
                      ¥{bill.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-zinc-500 font-medium">硬貨</div>
                <div className="flex gap-2 flex-wrap">
                  {COINS.map(coin => (
                    <button
                      key={coin}
                      onClick={() => handleAddMoney(coin)}
                      className="flex-1 min-w-[3.5rem] py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl text-sm transition-colors active:scale-95"
                    >
                      ¥{coin}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-zinc-800">
                <span className="text-zinc-400">お預かり</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-zinc-100">¥{received.toLocaleString()}</span>
                  {received > 0 && (
                    <button
                      onClick={() => setReceived(0)}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      リセット
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Change display */}
            <div className={`rounded-xl p-5 text-center ${change >= 0 ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-red-900/20 border border-red-900'}`}>
              <div className="text-sm font-medium text-zinc-500 mb-1">お釣り</div>
              <div className={`text-4xl font-bold ${change >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                ¥{Math.abs(change).toLocaleString()}
              </div>
              {change < 0 && (
                <div className="text-xs text-red-400 mt-1">金額が不足しています</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashRegisterPage;
