import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, Check, Plus, BookCopy, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { searchBooksByTitle, type BookSearchResult } from '../../lib/bookApi';
import type { Book } from '../../types';

interface Props {
  existingBooks?: Book[];
  /** 1冊ずつ呼び出される。失敗した場合は throw して中断ではなく Promise.allSettled で続行する。 */
  onAdd: (data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>;
  onClose: () => void;
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs text-zinc-500 mb-1">{children}</label>
);

export const BulkSeriesAddModal: React.FC<Props> = ({ existingBooks = [], onAdd, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [series, setSeries] = useState('');
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setErrorMsg(null);
    try {
      const items = await searchBooksByTitle(q);
      setResults(items);
      setSelected(new Set());
      setSearched(true);
      // 検索クエリをデフォルトのシリーズ名にプリセット（ユーザーは後から書き換え可能）
      if (!series.trim()) setSeries(q);
    } catch {
      setErrorMsg('検索に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSearching(false);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    const targets = results.filter(r => selected.has(r.googleBooksId));
    if (targets.length === 0) return;

    setAdding(true);
    setErrorMsg(null);
    setProgress({ done: 0, total: targets.length, failed: 0 });

    let done = 0;
    let failed = 0;
    // 並列でリクエスト。プラン上限などで失敗したものは Promise.allSettled で漏れずに集計する。
    await Promise.allSettled(
      targets.map(async r => {
        try {
          await onAdd({
            title: r.title,
            author: r.author || '不明',
            isbn: r.isbn,
            type: 'commercial',
            status: 'owned',
            coverUrl: r.coverUrl,
            series: series.trim() || undefined,
            genre: genre.trim() || undefined,
            category: category.trim() || undefined,
          });
          done += 1;
        } catch {
          failed += 1;
        } finally {
          setProgress({ done, total: targets.length, failed });
        }
      }),
    );

    setAdding(false);
    if (failed === 0) {
      onClose();
    } else if (done === 0) {
      setErrorMsg(`追加に失敗しました（${failed} 件）。プラン上限の可能性があります。`);
    } else {
      setErrorMsg(`${done} 件追加、${failed} 件失敗しました。`);
    }
  };

  const allSelected = results.length > 0 && selected.size === results.length;

  // 既存値からのオートコンプリート候補
  const seriesSuggestions = Array.from(
    new Set(existingBooks.map(b => b.series?.trim()).filter((s): s is string => !!s)),
  ).sort((a, b) => a.localeCompare(b, 'ja'));
  const genreSuggestions = Array.from(
    new Set([
      ...existingBooks.map(b => b.genre?.trim()).filter((g): g is string => !!g),
      '恋愛', 'バトル', 'SF', 'ファンタジー', 'コメディ', '日常', 'ホラー', 'ミステリー', '異世界', '青春',
    ]),
  ).sort((a, b) => a.localeCompare(b, 'ja'));
  const categorySuggestions = Array.from(
    new Set(existingBooks.map(b => b.category?.trim()).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, 'ja'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="w-full max-w-3xl max-h-[90vh] bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookCopy className="w-5 h-5 text-violet-300" />
            <h2 className="text-base font-semibold text-zinc-100">シリーズで一括追加</h2>
          </div>
          <button
            onClick={onClose}
            disabled={adding}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 検索バー */}
          <div>
            <FieldLabel>タイトル / シリーズ名で検索</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="例: ソードアート・オンライン、青春ブタ野郎"
                disabled={searching || adding}
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={!query.trim() || searching || adding}
                isLoading={searching}
              >
                <Search className="w-4 h-4 mr-1.5" />
                検索
              </Button>
            </div>
          </div>

          {/* 共通メタデータ */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <p className="text-xs text-zinc-500">
              選択した本に <strong className="text-zinc-300">一括で適用される項目</strong>です（後から個別編集も可能）
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>シリーズ</FieldLabel>
                <Input
                  value={series}
                  onChange={e => setSeries(e.target.value)}
                  placeholder="例: 青春ブタ野郎"
                  list="bulk-series"
                  disabled={adding}
                />
                <datalist id="bulk-series">
                  {seriesSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <FieldLabel>ジャンル</FieldLabel>
                <Input
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  placeholder="例: 恋愛、SF"
                  list="bulk-genre"
                  disabled={adding}
                />
                <datalist id="bulk-genre">
                  {genreSuggestions.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <FieldLabel>カテゴリ</FieldLabel>
                <Input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="例: ライトノベル"
                  list="bulk-category"
                  disabled={adding}
                />
                <datalist id="bulk-category">
                  {categorySuggestions.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* 結果一覧 */}
          {searching && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm justify-center py-12">
              <Loader2 className="w-4 h-4 animate-spin" />検索中…
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-500">
              該当する書籍が見つかりませんでした。検索ワードを変えてお試しください。
            </div>
          )}

          {!searching && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-500">
                  {results.length} 件ヒット / {selected.size} 件選択中
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(results.map(r => r.googleBooksId)))}
                    disabled={adding}
                    className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    すべて選択
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    disabled={adding}
                    className="text-xs text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    解除
                  </button>
                </div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.map(r => {
                  const isSelected = selected.has(r.googleBooksId);
                  return (
                    <li key={r.googleBooksId}>
                      <button
                        type="button"
                        onClick={() => toggle(r.googleBooksId)}
                        disabled={adding}
                        className={[
                          'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors',
                          isSelected
                            ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60',
                        ].join(' ')}
                      >
                        <div className="w-12 h-16 flex-shrink-0 rounded-md bg-zinc-800 overflow-hidden flex items-center justify-center">
                          {r.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">{r.title}</p>
                          {r.author && <p className="text-xs text-zinc-500 truncate mt-0.5">{r.author}</p>}
                          {(r.publisher || r.publishedDate) && (
                            <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                              {r.publisher}{r.publisher && r.publishedDate ? ' / ' : ''}{r.publishedDate}
                            </p>
                          )}
                        </div>
                        <span
                          className={[
                            'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5',
                            isSelected
                              ? 'bg-violet-500 border-violet-400 text-white'
                              : 'border-zinc-600',
                          ].join(' ')}
                          aria-hidden
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          {adding && progress.total > 0 && (
            <div className="text-xs text-zinc-400">
              追加中: {progress.done + progress.failed} / {progress.total}
              {progress.failed > 0 && <span className="text-red-400"> （失敗 {progress.failed}）</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-5 py-3 border-t border-zinc-800 flex-shrink-0">
          <span className="text-xs text-zinc-500">
            {allSelected ? '全件' : `${selected.size} 件`} 選択中
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={adding}>
              キャンセル
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0 || adding}
              isLoading={adding}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {selected.size > 0 ? `${selected.size} 冊を一括追加` : '一括追加'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
