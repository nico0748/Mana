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
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative hover:border-blue-200"
      onClick={() => onSelect(book)}
    >
      {/* アクションボタン — カード右上に絶対配置 */}
      <div
        className="absolute top-3 right-3 flex items-center gap-0.5 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(book)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this book?')) onDelete(book.id);
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
            <div className="h-28 w-20 sm:h-32 sm:w-24 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400 text-center p-1">
              No Cover
            </div>
          )}
        </div>

        {/* コンテンツ — 右端のボタン領域分を pr で確保 */}
        <div className="flex-grow min-w-0 pr-16">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 leading-tight mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 font-medium">{book.author}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.type === 'commercial'
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
              {book.type}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.status === 'owned'   ? 'bg-green-50 text-green-700 border-green-100' :
              book.status === 'lending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                        : 'bg-gray-50 text-gray-700 border-gray-100'
            }`}>
              {book.status}
            </span>
          </div>

          {book.ndcCode && (
            <span className="mt-2 inline-block px-2 py-0.5 text-xs font-mono font-medium rounded bg-amber-50 text-amber-700 border border-amber-100">
              NDC {book.ndcCode}
            </span>
          )}

          {book.memo && (
            <p className="mt-3 text-sm text-gray-500 line-clamp-2">{book.memo}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
