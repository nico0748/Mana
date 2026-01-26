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
        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group relative hover:border-blue-200"
        onClick={() => onSelect(book)}
    >
      <div className="flex gap-5">
        {/* Cover Image */}
        <div className="flex-shrink-0">
            {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="h-32 w-24 object-cover rounded-md shadow-sm" />
            ) : (
                <div className="h-32 w-24 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400 text-center p-1">
                    No Cover
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start">
            <div className="pr-12">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{book.title}</h3>
                <p className="text-sm text-gray-600 font-medium">{book.author}</p>
            </div>
            
            {/* Action Icons (Absolute positioned or flex end) */}
            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
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
                    if(confirm("Delete this book?")) onDelete(book.id);
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.type === 'commercial' 
                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
              {book.type}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
              book.status === 'owned' ? 'bg-green-50 text-green-700 border-green-100' : 
              book.status === 'lending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-gray-50 text-gray-700 border-gray-100'
            }`}>
              {book.status}
            </span>
          </div>
          
          {book.memo && (
            <p className="mt-3 text-sm text-gray-500 line-clamp-2">{book.memo}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
