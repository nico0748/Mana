import React, { useState, useRef, useMemo } from "react";
import { useBooks, type SortField, type SortDirection } from "../../hooks/useBooks";
import { useSync } from "../../hooks/useSync";
import { type Book } from "../../types";
import { BookItem } from "./BookItem";
import { BookForm } from "./BookForm";
import { BookDetailModal } from "./BookDetailModal";
import { PageSidebar } from "../layout/PageSidebar";
import { Button } from "../ui/Button";
import {
  Plus, ArrowUpAZ, ArrowDownAZ, Download, Upload, PanelLeft,
  BookOpen, BookMarked, ChevronDown, FileJson, FileSpreadsheet,
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

  const { exportBooksJson, exportBooksCsv, exportBooksExcel, importBooks } = useSync();
  const importJsonRef = useRef<HTMLInputElement>(null);
  const importCsvRef = useRef<HTMLInputElement>(null);
  const importExcelRef = useRef<HTMLInputElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);

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
      e.target.value = '';
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
          'w-full flex items-center pr-2 py-1.5 rounded-md text-xs transition-colors duration-150',
          categoryIsActive(type, group.key)
            ? 'bg-zinc-800 text-zinc-100 border-l-2 border-zinc-400 pl-[22px]'
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
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
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
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
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
                onClick={() => { exportBooksJson(); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                JSON 形式
              </button>
              <button
                onClick={() => { exportBooksCsv(); setExportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                CSV 形式
              </button>
              <button
                onClick={() => { exportBooksExcel(); setExportMenuOpen(false); }}
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
                onClick={() => { importJsonRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                JSON 形式
              </button>
              <button
                onClick={() => { importCsvRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                CSV 形式
              </button>
              <button
                onClick={() => { importExcelRef.current?.click(); setImportMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                Excel 形式
              </button>
            </div>
          </>
        )}
      </div>
      <input ref={importJsonRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
      <input ref={importCsvRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
      <input ref={importExcelRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
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
            {/* タイプスイッチャー — Material Design Segmented Button */}
            <div className="flex gap-0 p-0 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              {(['commercial', 'doujin'] as const).map((type, i) => {
                const isActive = selectedType === type;
                const count = type === 'commercial' ? commercialCount : doujinCount;
                const Icon = type === 'commercial' ? BookOpen : BookMarked;
                const label = type === 'commercial' ? '商業' : '同人誌';
                return (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setSelectedCategory(null); }}
                    className={clsx(
                      'flex-1 relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                      i === 0 ? '' : 'border-l border-zinc-800',
                      isActive
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                    <span className={clsx(
                      'text-xs tabular-nums px-1.5 py-0.5 rounded-full font-semibold transition-colors',
                      isActive ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-600'
                    )}>
                      {count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="typeSwitcher"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-400 rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
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
                      className="hover:text-zinc-300 transition-colors"
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
                className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-xl py-2 pl-3 pr-8 text-sm hover:border-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
              >
                <option value="createdAt">日付</option>
                <option value="title">タイトル</option>
                <option value="author">著者</option>
                <option value="ndcCode">NDC</option>
              </select>
              <button
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-500 transition-all flex-shrink-0 active:scale-95"
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
                initialData={{ type: selectedType }}
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">
                {searchTerm ? "検索結果が見つかりませんでした" : "まだ本がありません"}
              </p>
              {!searchTerm && (
                <button onClick={() => setIsAdding(true)} className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">
                  最初の1冊を追加する →
                </button>
              )}
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
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-200 transition-colors duration-200">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full tabular-nums group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors duration-200">
                      {group.books.length}
                    </span>
                    <div className="flex-1 h-px bg-zinc-800 group-hover:bg-zinc-700/50 transition-colors duration-200" />
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
