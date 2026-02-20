import React, { useState } from "react";
import { useBooks, type SortField, type SortDirection } from "../../hooks/useBooks";
import { type Book } from "../../types";
import { BookItem } from "./BookItem";
import { BookForm } from "./BookForm";
import { BookDetailModal } from "./BookDetailModal";
import { Button } from "../ui/Button";
import { Plus, ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { Input } from "../ui/Input";
import { AnimatePresence, motion } from "framer-motion";

export const BookList: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { books, loading, error, addBook, updateBook, deleteBook, uploadImage } = useBooks(sortField, sortDirection);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedType, setSelectedType] = useState<Book['type']>('commercial');

  const filteredBooks = books.filter(book => {
    const matchesType = book.type === selectedType;
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) return <div className="text-center py-8">Loading books...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Add Book ボタン */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" /> Add Book
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        {/* タブ */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              selectedType === 'commercial'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setSelectedType('commercial')}
          >
            Commercial
            {selectedType === 'commercial' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              selectedType === 'doujin'
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setSelectedType('doujin')}
          >
            Fan-made
            {selectedType === 'doujin' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
              />
            )}
          </button>
        </div>

        {/* 検索 + ソート */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="createdAt">Date</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
          {/* 昇順・降順トグルボタン */}
          <button
            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors flex-shrink-0"
            title={sortDirection === 'asc' ? '昇順（クリックで降順に変更）' : '降順（クリックで昇順に変更）'}
          >
            {sortDirection === 'asc'
              ? <ArrowUpAZ className="h-5 w-5" />
              : <ArrowDownAZ className="h-5 w-5" />
            }
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Book</h2>
          <BookForm
            onSubmit={async (data) => {
              await addBook(data);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
            onUploadImage={uploadImage}
          />
        </div>
      )}

      <div className="space-y-4">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "No books found matching your search." : "No books yet. Add one to get started!"}
          </div>
        ) : (
          filteredBooks.map((book) => (
            <BookItem
              key={book.id}
              book={book}
              onSelect={(selected) => setSelectedBook(selected)}
              onEdit={(book) => setSelectedBook(book)}
              onDelete={deleteBook}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedBook && (
          <BookDetailModal
            book={selectedBook}
            isOpen={!!selectedBook}
            onClose={() => setSelectedBook(null)}
            onUpdate={updateBook}
            onDelete={deleteBook}
            onUploadImage={uploadImage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
