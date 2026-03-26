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

// ── Google 4-color palette (dark mode tones) ──────────────────────────────
const statusConfig: Record<Book['status'], { label: string; className: string }> = {
  owned:    { label: '所持',   className: 'bg-green-400/10 text-green-400 border-green-400/25'  }, // Google Green
  lending:  { label: '貸出中', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25' }, // Google Yellow
  borrowed: { label: '借りた', className: 'bg-blue-400/10 text-blue-400 border-blue-400/25'    }, // Google Blue
  wishlist: { label: '欲しい', className: 'bg-zinc-800 text-zinc-500 border-zinc-700'           },
  wanted:   { label: 'ほしい', className: 'bg-zinc-800 text-zinc-500 border-zinc-700'           },
};

const typeConfig: Record<Book['type'], { label: string; className: string }> = {
  commercial: { label: '商業', className: 'bg-blue-400/10 text-blue-400 border-blue-400/25'  }, // Google Blue
  doujin:     { label: '同人', className: 'bg-rose-400/10 text-rose-400 border-rose-400/25'  }, // Google Red
};

export const BookItem: React.FC<BookItemProps> = ({ book, onSelect, onEdit, onDelete }) => {
  const status = statusConfig[book.status] ?? statusConfig.wanted;
  const type   = typeConfig[book.type]     ?? typeConfig.doujin;

  return (
    <motion.div
      layoutId={`book-${book.id}`}
      className="group bg-zinc-900 rounded-2xl border border-zinc-800/80 cursor-pointer relative overflow-hidden
                 shadow-sm hover:shadow-lg hover:shadow-zinc-950/60
                 hover:border-zinc-700 hover:bg-zinc-800/60
                 transition-all duration-200 ease-out
                 active:scale-[0.99]"
      onClick={() => onSelect(book)}
    >
      {/* Surface tint on hover */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-200 pointer-events-none rounded-2xl" />

      {/* Action buttons */}
      <div
        className="absolute top-3 right-3 flex items-center gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(book)}
          className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-full transition-all duration-150 active:scale-90"
          title="編集"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('この本を削除しますか？')) onDelete(book.id);
          }}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded-full transition-all duration-150 active:scale-90"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-4 p-4">
        {/* Cover image */}
        <div className="flex-shrink-0">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-28 w-20 sm:h-32 sm:w-24 object-cover rounded-xl shadow-md"
            />
          ) : (
            <div className="h-28 w-20 sm:h-32 sm:w-24 bg-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-600 text-center p-1 border border-zinc-700/50">
              No Cover
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 pr-14">
          <h3 className="text-base font-semibold text-zinc-100 line-clamp-2 leading-snug mb-0.5">
            {book.title}
          </h3>
          <p className="text-sm text-zinc-500 font-medium mb-3">{book.author}</p>

          {/* Badges — Google color palette */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${type.className}`}>
              {type.label}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${status.className}`}>
              {status.label}
            </span>
            {book.status === 'borrowed' && book.price != null && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-400/10 text-blue-300 border-blue-400/20">
                ¥{book.price.toLocaleString()} 節約
              </span>
            )}
          </div>

          {book.ndcCode && (
            <span className="mt-2 inline-block px-2 py-0.5 text-xs font-mono rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700/50">
              NDC {book.ndcCode}
            </span>
          )}

          {book.memo && (
            <p className="mt-2 text-xs text-zinc-600 line-clamp-2 leading-relaxed">{book.memo}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
