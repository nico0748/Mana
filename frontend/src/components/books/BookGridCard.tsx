import React from "react";
import { type Book } from "../../types";
import { Pencil, Trash2, BookOpen } from "lucide-react";
import { XLogoIcon } from "./XLogoIcon";

interface Props {
  book: Book;
  onSelect: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => Promise<void>;
  onShare?: (book: Book) => void;
}

const statusDot: Record<Book['status'], string> = {
  owned:    'bg-green-400',
  lending:  'bg-yellow-400',
  borrowed: 'bg-blue-400',
  wishlist: 'bg-zinc-600',
  wanted:   'bg-zinc-600',
};

// 表紙画像つきカード。仮想化された行内でのみマウントされるので、スクロールアウトすると
// <img> ごとアンマウントされてブラウザがメモリから解放する。
// loading="lazy" + decoding="async" でさらに通信タイミングを後ろにずらす。
export const BookGridCard: React.FC<Props> = ({ book, onSelect, onEdit, onDelete, onShare }) => {
  return (
    <div
      className="group relative flex flex-col rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors cursor-pointer overflow-hidden"
      onClick={() => onSelect(book)}
    >
      <div className="relative aspect-[2/3] bg-zinc-950">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-1.5">
            <BookOpen className="w-6 h-6" />
            <span className="text-[10px]">No Cover</span>
          </div>
        )}
        <span
          className={`absolute top-2 left-2 w-2 h-2 rounded-full shadow-[0_0_0_2px_rgba(24,24,27,0.85)] ${statusDot[book.status] ?? 'bg-zinc-600'}`}
          title={book.status}
        />

        <div
          className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {onShare && (
            <button
              onClick={() => onShare(book)}
              className="p-1 text-zinc-200 hover:text-zinc-50 bg-zinc-900/80 hover:bg-zinc-700 rounded-md backdrop-blur"
              title="Xで紹介"
            >
              <XLogoIcon className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onEdit(book)}
            className="p-1 text-zinc-200 hover:text-zinc-50 bg-zinc-900/80 hover:bg-zinc-700 rounded-md backdrop-blur"
            title="編集"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('この本を削除しますか？')) onDelete(book.id);
            }}
            className="p-1 text-zinc-200 hover:text-red-400 bg-zinc-900/80 hover:bg-zinc-700 rounded-md backdrop-blur"
            title="削除"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="p-2 min-w-0">
        <p className="text-xs font-medium text-zinc-100 line-clamp-2 leading-snug">{book.title}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{book.author}</p>
      </div>
    </div>
  );
};
