import React, { useState } from 'react';
import type { Book } from '../../types';
import { Button } from '../ui/Button';
import { Pencil, Trash, X, ExternalLink } from 'lucide-react';
import { BookForm } from './BookForm';
import { motion } from 'framer-motion';
import { buildAmazonLink } from '../../lib/affiliate';

interface BookDetailModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Book>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  existingBooks?: Book[];
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen: _isOpen, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose,
  onUpdate,
  onDelete,
  onUploadImage,
  existingBooks,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        layoutId={`book-${book.id}`}
        className="relative w-full max-w-2xl bg-zinc-900 rounded-xl shadow-2xl overflow-hidden z-10 border border-zinc-800"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      >
        {isEditing ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-100">本を編集</h2>
              <button onClick={() => setIsEditing(false)} className="p-1 rounded-full hover:bg-zinc-800">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <BookForm
              initialData={book}
              existingBooks={existingBooks}
              onSubmit={async (data) => {
                await onUpdate(book.id, data);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
              onUploadImage={onUploadImage}
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Cover Image */}
            <div className="bg-zinc-950 p-6 flex-shrink-0 flex items-start justify-center md:w-64 md:border-r border-zinc-800">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-48 shadow-lg rounded-md"
                />
              ) : (
                <div className="w-48 h-64 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500">
                  No Cover
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-grow p-6 flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-1">
                    {book.title}
                  </h2>
                  <p className="text-lg text-zinc-400 font-medium">
                    {book.author}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <span className={`px-2.5 py-1 text-sm rounded-full border ${
                  book.type === 'commercial'
                    ? 'bg-blue-400/10 text-blue-400 border-blue-400/25'
                    : 'bg-rose-400/10 text-rose-400 border-rose-400/25'
                }`}>
                  {book.type === 'commercial' ? '商業' : '同人'}
                </span>
                <span className={`px-2.5 py-1 text-sm rounded-full border ${
                  book.status === 'owned'    ? 'bg-green-400/10 text-green-400 border-green-400/25' :
                  book.status === 'lending'  ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25' :
                  book.status === 'borrowed' ? 'bg-blue-400/10 text-blue-400 border-blue-400/25'
                                             : 'bg-zinc-700 text-zinc-400 border-zinc-600'
                }`}>
                  {book.status === 'owned' ? '所持' : book.status === 'lending' ? '貸出中' : book.status === 'borrowed' ? '借りた' : 'ほしい'}
                </span>
                {book.status === 'borrowed' && book.price != null && (
                  <span className="px-2.5 py-1 text-sm rounded-full border bg-blue-400/10 text-blue-300 border-blue-400/20">
                    ¥{book.price.toLocaleString()} 節約
                  </span>
                )}
                {book.category && (
                  <span className="px-2.5 py-1 text-sm rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {book.category}
                  </span>
                )}
                {book.ndcCode && (
                  <span className="px-2.5 py-1 text-sm rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                    NDC {book.ndcCode}
                  </span>
                )}
              </div>

              <div className="mt-6 flex-grow">
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">メモ</h3>
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{book.memo || "メモなし"}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-800 flex gap-3 flex-wrap">
                {book.isbn && book.type === 'commercial' && (
                  <a
                    href={buildAmazonLink(book.isbn)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Amazon
                  </a>
                )}
                <Button onClick={() => setIsEditing(true)} className="flex-1">
                  <Pencil className="w-4 h-4 mr-2" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (confirm('この本を削除しますか？')) {
                      await onDelete(book.id);
                      onClose();
                    }
                  }}
                  className="text-red-400 border-red-900 hover:bg-red-950 hover:border-red-800"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
