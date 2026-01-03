import React, { useState } from "react";
import { useBooks, type SortField, type SortDirection } from "../../hooks/useBooks";
import { BookItem } from "./BookItem";
import { BookForm } from "./BookForm";
import { Button } from "../ui/Button";
import { Plus } from "lucide-react";
import { Input } from "../ui/Input";



export const BookList: React.FC = () => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { books, loading, error, addBook, updateBook, deleteBook, uploadImage } = useBooks(sortField, sortDirection);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-8">Loading books...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" /> Add Book
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="createdAt">Date Added</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as SortDirection)}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
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
              onUpdate={updateBook}
              onDelete={deleteBook}
              onUploadImage={uploadImage}
            />
          ))
        )}
      </div>
    </div>
  );
};
