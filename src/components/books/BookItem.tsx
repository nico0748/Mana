import React from "react";
import { type Book } from "../../types";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface BookItemProps {
  book: Book;
  onSelect: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => Promise<void>;
}

export const BookItem: React.FC<BookItemProps> = ({ book, onSelect, onEdit, onDelete }) => {
  return (
    <motion.div
      layoutId={`book-${book.id}`}
      className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/5 transition-all cursor-pointer relative"
      onClick={() => onSelect(book)}
    >
      {/* アクションボタン — カード右上に絶対配置 */}
      <div
        className="absolute top-3 right-3 flex items-center gap-0.5 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(book)}
          className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-800 rounded-full transition-colors"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this book?')) onDelete(book.id);
          }}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-full transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-4">
        {/* 書影 */}
        <div className="flex-shrink-0">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-28 w-20 sm:h-32 sm:w-24 object-cover rounded-md shadow-sm"
            />
          ) : (
            <div className="h-28 w-20 sm:h-32 sm:w-24 bg-zinc-800 rounded-md flex items-center justify-center text-xs text-zinc-500 text-center p-1">
              No Cover
            </div>
          )}
        </div>

        {/* コンテンツ — 右端のボタン領域分を pr で確保 */}
        <div className="flex-grow min-w-0 pr-16">
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-2 leading-tight mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-zinc-400 font-medium">{book.author}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.type === 'commercial'
                ? 'bg-lime-500/10 text-lime-500 border-lime-500/20'
                : 'bg-zinc-700 text-zinc-300 border-zinc-600'
            }`}>
              {book.type === 'commercial' ? '商業' : '同人'}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.status === 'owned'    ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
              book.status === 'lending'  ? 'bg-orange-400/10 text-orange-400 border-orange-400/20' :
              book.status === 'borrowed' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                         : 'bg-zinc-700 text-zinc-400 border-zinc-600'
            }`}>
              {book.status === 'owned' ? '所持' : book.status === 'lending' ? '貸出中' : book.status === 'borrowed' ? '借りた' : 'ほしい'}
            </span>
            {book.status === 'borrowed' && book.price != null && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border bg-blue-400/10 text-blue-300 border-blue-400/20">
                ¥{book.price.toLocaleString()} 節約
              </span>
            )}
          </div>

          {book.ndcCode && (
            <span className="mt-2 inline-block px-2 py-0.5 text-xs font-mono font-medium rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              NDC {book.ndcCode}
            </span>
          )}

          {book.memo && (
            <p className="mt-3 text-sm text-zinc-500 line-clamp-2">{book.memo}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
