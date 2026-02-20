import React, { useState } from 'react';
import type { Book } from '../../types';
import { Button } from '../ui/Button';
import { Pencil, Trash, X } from 'lucide-react';
import { BookForm } from './BookForm';
import { motion } from 'framer-motion';

interface BookDetailModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Book>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen: _isOpen,
  onClose,
  onUpdate,
  onDelete,
  onUploadImage,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      {/* We need a container for positioning that ignores pointer events for the background but allows for the modal */}
      
      <motion.div 
        layoutId={`book-${book.id}`}
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden z-10"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      >
        {isEditing ? (
             <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Edit Book</h2>
                    <button onClick={() => setIsEditing(false)} className="p-1 rounded-full hover:bg-gray-100">
                         <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <BookForm
                    initialData={book}
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
                <div className="bg-gray-50 p-6 flex-shrink-0 flex items-start justify-center md:w-64 md:border-r border-gray-100">
                {book.coverUrl ? (
                    <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-48 shadow-lg rounded-md"
                    />
                ) : (
                    <div className="w-48 h-64 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                    No Cover
                    </div>
                )}
                </div>

                {/* Details */}
                <div className="flex-grow p-6 flex flex-col">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
                                {book.title}
                            </h2>
                            <p className="text-lg text-gray-600 font-medium">
                                {book.author}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-sm rounded-full ${
                        book.type === 'commercial' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                        {book.type}
                        </span>
                        <span className={`px-2.5 py-1 text-sm rounded-full ${
                        book.status === 'owned' ? 'bg-green-100 text-green-800' : 
                        book.status === 'lending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {book.status}
                        </span>
                        {book.category && (
                        <span className="px-2.5 py-1 text-sm rounded-full bg-gray-100 text-gray-600">
                            {book.category}
                        </span>
                        )}
                        {book.ndcCode && (
                        <span className="px-2.5 py-1 text-sm rounded-full font-mono bg-amber-50 text-amber-700 border border-amber-100">
                            NDC {book.ndcCode}
                        </span>
                        )}
                    </div>

                    <div className="mt-6 flex-grow">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Memo</h3>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{book.memo || "No memo"}</p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100 flex gap-4">
                        <Button onClick={() => setIsEditing(true)} className="flex-1">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={async () => {
                                if (confirm('Are you sure you want to delete this book?')) {
                                    await onDelete(book.id);
                                    onClose();
                                }
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
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
