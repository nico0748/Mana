import React from "react";
import { type Book } from "../../types";
import { Pencil, Trash2 } from "lucide-react";
import { XLogoIcon } from "./XLogoIcon";

interface Props {
  book: Book;
  onSelect: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => Promise<void>;
  onShare?: (book: Book) => void;
}

const statusConfig: Record<Book['status'], { label: string; className: string }> = {
  owned:    { label: '所持',   className: 'bg-green-400/10 text-green-400 border-green-400/25'  },
  lending:  { label: '貸出中', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25' },
  borrowed: { label: '借りた', className: 'bg-blue-400/10 text-blue-400 border-blue-400/25'    },
  wishlist: { label: '欲しい', className: 'bg-zinc-800 text-zinc-500 border-zinc-700'           },
  wanted:   { label: 'ほしい', className: 'bg-zinc-800 text-zinc-500 border-zinc-700'           },
};

const typeConfig: Record<Book['type'], { label: string; className: string }> = {
  commercial: { label: '商業', className: 'bg-blue-400/10 text-blue-400 border-blue-400/25'  },
  doujin:     { label: '同人', className: 'bg-rose-400/10 text-rose-400 border-rose-400/25'  },
};

// テキストのみの軽量行。img を一切描画しないので画像 fetch / メモリ占有が発生しない。
export const BookListRow: React.FC<Props> = ({ book, onSelect, onEdit, onDelete, onShare }) => {
  const status = statusConfig[book.status] ?? statusConfig.wanted;
  const type   = typeConfig[book.type]     ?? typeConfig.doujin;

  return (
    <div
      className="group relative flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors cursor-pointer"
      onClick={() => onSelect(book)}
    >
      <div className="flex-grow min-w-0 pr-20">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-zinc-100 truncate min-w-0 max-w-full">
            {book.title}
          </h3>
          <span className={`px-1.5 py-0 text-[10px] font-medium rounded-full border ${type.className} flex-shrink-0`}>
            {type.label}
          </span>
          <span className={`px-1.5 py-0 text-[10px] font-medium rounded-full border ${status.className} flex-shrink-0`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
          <span className="truncate">{book.author}</span>
          {book.series && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="truncate text-sky-400/80">📚 {book.series}</span>
            </>
          )}
          {book.genre && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="truncate text-rose-400/80">{book.genre}</span>
            </>
          )}
          {book.status === 'borrowed' && book.price != null && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-blue-300/80">¥{book.price.toLocaleString()} 節約</span>
            </>
          )}
        </div>
      </div>

      <div
        className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {onShare && (
          <button
            onClick={() => onShare(book)}
            className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 rounded-md transition-colors"
            title="X で紹介"
          >
            <XLogoIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onEdit(book)}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors"
          title="編集"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('この本を削除しますか？')) onDelete(book.id);
          }}
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded-md transition-colors"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
