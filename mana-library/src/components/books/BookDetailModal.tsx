import React, { useState } from 'react';
import type { Book } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Pencil, Trash } from 'lucide-react';
import { BookForm } from './BookForm';

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
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onUploadImage,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // If editing, show the form inside the modal content area
  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={() => { setIsEditing(false); onClose(); }} title="Edit Book">
        <BookForm
          initialData={book}
          onSubmit={async (data) => {
            await onUpdate(book.id, data);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
          onUploadImage={onUploadImage}
        />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={book.title}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover Image */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-48 h-auto object-cover rounded-lg shadow-md"
            />
          ) : (
            <div className="w-48 h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
              No Cover
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-grow space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Author</h3>
            <p className="text-lg text-gray-900">{book.author}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-1 text-xs rounded-full ${
              book.type === 'commercial' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {book.type}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              book.status === 'owned' ? 'bg-green-100 text-green-800' : 
              book.status === 'lending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {book.status}
            </span>
            {book.category && (
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {book.category}
              </span>
            )}
          </div>

          <div>
             <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Memo</h3>
             <p className="text-gray-700 whitespace-pre-wrap">{book.memo || "No memo"}</p>
          </div>

          <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
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
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
