import React, { useState } from "react";
import { type Book } from "../../types";
import { Button } from "../ui/Button";
import { BookForm } from "./BookForm";

interface BookItemProps {
  book: Book;
  onUpdate: (id: string, data: Partial<Book>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
}

export const BookItem: React.FC<BookItemProps> = ({ book, onUpdate, onDelete, onUploadImage }) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="mb-4">
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
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow flex gap-4">
      {book.coverUrl && (
        <div className="flex-shrink-0">
          <img src={book.coverUrl} alt={book.title} className="h-32 w-24 object-cover rounded shadow-sm" />
        </div>
      )}
      <div className="flex-grow flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
          <p className="text-sm text-gray-600">{book.author}</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
          {book.memo && <p className="mt-2 text-sm text-gray-500">{book.memo}</p>}
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(book.id)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
