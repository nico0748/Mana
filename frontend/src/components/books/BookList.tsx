import React, { useState, useRef, useMemo } from "react";
import { useBooks, type SortField, type SortDirection } from "../../hooks/useBooks";
import { useSync, isShareSupported } from "../../hooks/useSync";
import { type Book } from "../../types";
import { BookItem } from "./BookItem";
import { BookForm } from "./BookForm";
import { BookDetailModal } from "./BookDetailModal";
import { PageSidebar } from "../layout/PageSidebar";
import { Button } from "../ui/Button";
import {
  Plus, ArrowUpAZ, ArrowDownAZ, Share2, Download, Upload, PanelLeft,
  BookOpen, BookMarked,
} from "lucide-react";
import { Input } from "../ui/Input";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";

// ─── NDC helpers ─────────────────────────────────────────────────────────────

const NDC_LABELS: Record<string, string> = {
  '0': '総記',
  '1': '哲学・心理学',
  '2': '歴史・地理',
  '3': '社会科学',
  '4': '自然科学',
  '5': '技術・工学',
  '6': '産業',
  '7': '芸術・スポーツ',
  '8': '言語',
  '9': '文学',
};

function getNdcGroup(book: Book): string {
  if (!book.ndcCode) return '';
  const first = book.ndcCode.trim().charAt(0);
  return /\d/.test(first) ? first : '';
}

interface CategoryGroup {
  key: string;
  label: string;
  books: Book[];
}

function buildCommercialGroups(books: Book[]): CategoryGroup[] {
  const map = new Map<string, Book[]>();
  for (const book of books) {
    const key = getNdcGroup(book);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(book);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === '' && b === '') return 0;
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    })
    .map(([key, bks]) => ({
      key,
      label: key ? `${key} ${NDC_LABELS[key] ?? '不明'}` : '未分類',
      books: bks,
    }));
}

function buildDoujinGroups(books: Book[]): CategoryGroup[] {
  const map = new Map<string, Book[]>();
  for (const book of books) {
    const key = book.author.trim() || '不明';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(book);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, bks]) => ({ key, label: key, books: bks }));
}

// ─── BookList ─────────────────────────────────────────────────────────────────

export const BookList: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { books, loading, error, addBook, updateBook, deleteBook, uploadImage } = useBooks(sortField, sortDirection);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedType, setSelectedType] = useState<Book['type']>('commercial');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { exportBooks, importBooks } = useSync();
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBooks(file);
      alert('データをインポートしました。');
    } catch (err) {
      console.error(err);
      alert('インポートに失敗しました。');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredBooks = useMemo(() => {
    let result = books.filter(b => b.type === selectedType);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term)
      );
    } else if (selectedCategory !== null) {
      result = result.filter(b =>
        selectedType === 'commercial'
          ? getNdcGroup(b) === selectedCategory
          : (b.author.trim() || '不明') === selectedCategory
      );
    }
    return result;
  }, [books, selectedType, searchTerm, selectedCategory]);

  // Group for main content — shown only when no active filter/search
  const contentGroups = useMemo((): CategoryGroup[] | null => {
    if (searchTerm || selectedCategory !== null) return null;
    const typeBooks = books.filter(b => b.type === selectedType);
    return selectedType === 'commercial'
      ? buildCommercialGroups(typeBooks)
      : buildDoujinGroups(typeBooks);
  }, [books, selectedType, searchTerm, selectedCategory]);

  // Groups for sidebar tree — always reflects full dataset
  const sidebarGroups = useMemo(() => ({
    commercial: buildCommercialGroups(books.filter(b => b.type === 'commercial')),
    doujin: buildDoujinGroups(books.filter(b => b.type === 'doujin')),
  }), [books]);

  const commercialCount = useMemo(() => books.filter(b => b.type === 'commercial').length, [books]);
  const doujinCount = useMemo(() => books.filter(b => b.type === 'doujin').length, [books]);

  const totalSaved = useMemo(() =>
    books
      .filter(b => b.status === 'borrowed' && b.price != null)
      .reduce((sum, b) => sum + (b.price ?? 0), 0),
    [books]
  );

  // ── Sidebar tree ─────────────────────────────────────────────────────────────

  const typeIsActive = (type: Book['type']) =>
    selectedType === type && selectedCategory === null && !searchTerm;

  const categoryIsActive = (type: Book['type'], key: string) =>
    selectedType === type && selectedCategory === key;

  const selectType = (type: Book['type']) => {
    setSelectedType(type);
    setSelectedCategory(null);
    setSearchTerm('');
  };

  const selectCategory = (type: Book['type'], key: string) => {
    setSelectedType(type);
    setSelectedCategory(key);
    setSearchTerm('');
  };

  const renderGroups = (type: Book['type'], groups: CategoryGroup[]) =>
    groups.map(group => (
      <button
        key={group.key}
        onClick={() => selectCategory(type, group.key)}
        className={clsx(
          'w-full flex items-center pr-2 py-1.5 rounded-md text-xs transition-colors',
          categoryIsActive(type, group.key)
            ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-[22px]'
            : 'pl-6 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
        )}
      >
        <span className="flex-1 text-left truncate">{group.label}</span>
        <span className="tabular-nums text-zinc-600 ml-2">{group.books.length}</span>
      </button>
    ));

  const sidebarContent = (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
        本棚の分類
      </p>

      {/* 商業 */}
      <button
        onClick={() => selectType('commercial')}
        className={clsx(
          'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
          typeIsActive('commercial')
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
        )}
      >
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">商業</span>
        <span className="text-xs tabular-nums text-zinc-500">{commercialCount}</span>
      </button>
      <div className="mb-1">
        {renderGroups('commercial', sidebarGroups.commercial)}
      </div>

      {/* 同人誌 */}
      <button
        onClick={() => selectType('doujin')}
        className={clsx(
          'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors mt-1',
          typeIsActive('doujin')
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
        )}
      >
        <BookMarked className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">同人誌</span>
        <span className="text-xs tabular-nums text-zinc-500">{doujinCount}</span>
      </button>
      <div>
        {renderGroups('doujin', sidebarGroups.doujin)}
      </div>
    </div>
  );

  // ── Sidebar footer ──────────────────────────────────────────────────────────

  const sidebarFooter = (
    <div className="space-y-2.5">
      <div className="mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">データ同期</p>
        <p className="text-xs text-zinc-600">本棚データのエクスポート・インポート</p>
      </div>
      <Button
        onClick={exportBooks}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        {isShareSupported ? <Share2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        {isShareSupported ? 'データをシェア' : 'ダウンロード'}
      </Button>
      <Button
        onClick={() => importFileRef.current?.click()}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center gap-2"
      >
        <Upload className="w-3.5 h-3.5" />
        インポート
      </Button>
      <input
        ref={importFileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        className="hidden"
      />
      <p className="text-xs text-zinc-700 text-center pt-1">既存データに上書きマージされます</p>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  if (error) return <div className="text-center py-8 text-red-400">{error}</div>;

  // Active category breadcrumb label
  const activeCategoryLabel = selectedCategory !== null
    ? selectedType === 'commercial'
      ? (selectedCategory ? `${selectedCategory} ${NDC_LABELS[selectedCategory] ?? '不明'}` : '未分類')
      : selectedCategory
    : null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* サイドバー */}
      <PageSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        footer={sidebarFooter}
      >
        {sidebarContent}
      </PageSidebar>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-4xl mx-auto px-4 py-4">

          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            {totalSaved > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                <span className="text-xs text-blue-300">借りて節約した金額</span>
                <span className="text-base font-bold text-blue-300">¥{totalSaved.toLocaleString()}</span>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
                <Plus className="mr-2 h-4 w-4" /> 本を追加
              </Button>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                title="分類を開く"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            {/* モダンなタイプスイッチャー */}
            <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl">
              {(['commercial', 'doujin'] as const).map(type => {
                const isActive = selectedType === type;
                const count = type === 'commercial' ? commercialCount : doujinCount;
                const Icon = type === 'commercial' ? BookOpen : BookMarked;
                const label = type === 'commercial' ? '商業' : '同人誌';
                return (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setSelectedCategory(null); }}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                    <span className={clsx(
                      'text-xs tabular-nums px-1.5 py-0.5 rounded-md font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700/60 text-zinc-500'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* カテゴリ選択中のブレッドクラム */}
            <AnimatePresence>
              {activeCategoryLabel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 px-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      {selectedType === 'commercial' ? '商業' : '同人誌'}
                    </button>
                    <span className="text-zinc-700">/</span>
                    <span className="text-zinc-300 font-medium">{activeCategoryLabel}</span>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      ✕ 解除
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 検索 + ソート */}
            <div className="flex gap-2">
              <Input
                placeholder="タイトルや著者で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md py-2 pl-3 pr-8 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="createdAt">日付</option>
                <option value="title">タイトル</option>
                <option value="author">著者</option>
                <option value="ndcCode">NDC</option>
              </select>
              <button
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                className="flex items-center justify-center w-10 h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-500 transition-colors flex-shrink-0"
                title={sortDirection === 'asc' ? '昇順' : '降順'}
              >
                {sortDirection === 'asc'
                  ? <ArrowUpAZ className="h-5 w-5" />
                  : <ArrowDownAZ className="h-5 w-5" />
                }
              </button>
            </div>
          </div>

          {isAdding && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-zinc-100">新しい本を追加</h2>
              <BookForm
                onSubmit={async (data) => {
                  await addBook(data);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
                onUploadImage={uploadImage}
              />
            </div>
          )}

          {/* 本リスト */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {searchTerm ? "検索結果が見つかりませんでした。" : "まだ本がありません。追加してみましょう！"}
            </div>
          ) : contentGroups ? (
            // カテゴリ別グループ表示（フィルターなし時）
            <div className="space-y-8">
              {contentGroups.filter(g => g.books.length > 0).map(group => (
                <div key={group.key}>
                  <button
                    onClick={() => setSelectedCategory(group.key)}
                    className="w-full flex items-center gap-3 mb-3 group"
                  >
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                      {group.label}
                    </span>
                    <span className="text-xs text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded-full tabular-nums">
                      {group.books.length}
                    </span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </button>
                  <div className="space-y-3">
                    {group.books.map(book => (
                      <BookItem
                        key={book.id}
                        book={book}
                        onSelect={setSelectedBook}
                        onEdit={setSelectedBook}
                        onDelete={deleteBook}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // フラットリスト（検索・カテゴリフィルター時）
            <div className="space-y-4">
              {filteredBooks.map(book => (
                <BookItem
                  key={book.id}
                  book={book}
                  onSelect={setSelectedBook}
                  onEdit={setSelectedBook}
                  onDelete={deleteBook}
                />
              ))}
            </div>
          )}

          <AnimatePresence>
            {selectedBook && (
              <BookDetailModal
                book={selectedBook}
                isOpen={!!selectedBook}
                onClose={() => setSelectedBook(null)}
                onUpdate={updateBook}
                onDelete={deleteBook}
                onUploadImage={uploadImage}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
