import React, { useState } from "react";
import { useBooks, type SortField, type SortDirection } from "../../hooks/useBooks";
import { type Book } from "../../types";
import { BookItem } from "./BookItem";
import { BookForm } from "./BookForm";
import { BookDetailModal } from "./BookDetailModal";
import { Button } from "../ui/Button";
import { Plus, ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { Input } from "../ui/Input";
import { AnimatePresence, motion } from "framer-motion";

export const BookList: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { books, loading, error, addBook, updateBook, deleteBook, uploadImage } = useBooks(sortField, sortDirection);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedType, setSelectedType] = useState<Book['type']>('commercial');

  const filteredBooks = books.filter(book => {
    const matchesType = book.type === selectedType;
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalSaved = books
    .filter(book => book.status === 'borrowed' && book.price != null)
    .reduce((sum, book) => sum + (book.price ?? 0), 0);

  if (loading) return <div className="text-center py-8 text-zinc-400">読み込み中...</div>;
  if (error) return <div className="text-center py-8 text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* 浮いた金額 & Add Book ボタン */}
      <div className="flex items-center justify-between mb-6">
        {totalSaved > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
            <span className="text-xs text-blue-300">借りて節約した金額</span>
            <span className="text-base font-bold text-blue-300">¥{totalSaved.toLocaleString()}</span>
          </div>
        ) : (
          <div />
        )}
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" /> 本を追加
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        {/* タブ */}
        <div className="flex border-b border-zinc-800">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              selectedType === 'commercial'
                ? 'text-yellow-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setSelectedType('commercial')}
          >
            商業
            {selectedType === 'commercial' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400"
              />
            )}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              selectedType === 'doujin'
                ? 'text-yellow-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setSelectedType('doujin')}
          >
            同人誌
            {selectedType === 'doujin' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400"
              />
            )}
          </button>
        </div>

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
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md py-2 pl-3 pr-8 text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          >
            <option value="createdAt">日付</option>
            <option value="title">タイトル</option>
            <option value="author">著者</option>
            <option value="ndcCode">NDC</option>
          </select>
          {/* 昇順・降順トグルボタン */}
          <button
            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-yellow-400 transition-colors flex-shrink-0"
            title={sortDirection === 'asc' ? '昇順（クリックで降順に変更）' : '降順（クリックで昇順に変更）'}
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

      <div className="space-y-4">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            {searchTerm ? "検索結果が見つかりませんでした。" : "まだ本がありません。追加してみましょう！"}
          </div>
        ) : (
          filteredBooks.map((book) => (
            <BookItem
              key={book.id}
              book={book}
              onSelect={(selected) => setSelectedBook(selected)}
              onEdit={(book) => setSelectedBook(book)}
              onDelete={deleteBook}
            />
          ))
        )}
      </div>

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
  );
};
