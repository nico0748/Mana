import React, { useState } from "react";
import { type Book } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BarcodeScanner } from "./BarcodeScanner";
import { fetchBookByIsbn, searchBookByTitle } from "../../lib/bookApi";
import { Scan, Search } from "lucide-react";

interface BookFormProps {
  initialData?: Partial<Book>;
  onSubmit: (data: Omit<Book, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  onUploadImage?: (file: File) => Promise<string>;
}

export const BookForm: React.FC<BookFormProps> = (props) => {
  const { initialData, onSubmit, onCancel } = props;
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    author: initialData?.author || "",
    isbn: initialData?.isbn || "",
    type: initialData?.type || "commercial",
    category: initialData?.category || "",
    status: initialData?.status || "owned",
    memo: initialData?.memo || "",
    coverUrl: initialData?.coverUrl || "",
  });

  const fetchBookData = async (isbn: string) => {
    if (!isbn) return;
    setLoading(true);
    try {
      const bookData = await fetchBookByIsbn(isbn);
      if (bookData) {
        setFormData(prev => ({
          ...prev,
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn,
          coverUrl: bookData.coverUrl || prev.coverUrl,
        }));
      } else {
        alert("Book not found");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to fetch book data");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (isbn: string) => {
    setShowScanner(false);
    await fetchBookData(isbn);
  };

  const handleTitleSearch = async () => {
    if (!formData.title) return;
    setUploading(true); // Reuse uploading state for loading indicator
    try {
      const coverUrl = await searchBookByTitle(formData.title);
      if (coverUrl) {
        setFormData(prev => ({ ...prev, coverUrl }));
      } else {
        alert("No cover image found for this title.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to search cover image.");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData as any);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        // We need to pass uploadImage from props or context, but for now let's assume it's passed or we use the hook here.
        // Actually, BookForm is a presentation component mostly, but it has state.
        // Let's modify props to include uploadImage.
        if (props.onUploadImage) {
           const url = await props.onUploadImage(file);
           setFormData(prev => ({ ...prev, coverUrl: url }));
        }
      } catch (error) {
        console.error("Failed to upload image", error);
        alert("Failed to upload image");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Cover Image</label>
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex items-start space-x-4">
              {formData.coverUrl && (
                <img src={formData.coverUrl} alt="Cover" className="h-24 w-16 object-cover rounded border flex-shrink-0" />
              )}
              <div className="flex-grow space-y-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Upload File</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Or Image URL</label>
                  <Input
                    name="coverUrl"
                    value={formData.coverUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <div className="flex gap-2">
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Book Title"
            />
            <Button type="button" variant="outline" size="icon" onClick={handleTitleSearch} title="Search Cover by Title" disabled={!formData.title || uploading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Author / Circle</label>
          <Input
            name="author"
            value={formData.author}
            onChange={handleChange}
            required
            placeholder="Author Name"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700">ISBN</label>
          <div className="flex gap-2">
            <Input
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              placeholder="ISBN (Optional)"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => fetchBookData(formData.isbn)} title="Search by ISBN">
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)} title="Scan Barcode">
              <Scan className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="commercial">Commercial</option>
            <option value="doujin">Doujinshi</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="owned">Owned</option>
            <option value="lending">Lending</option>
            <option value="wishlist">Wishlist</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <Input
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Category (e.g., Tech, Manga)"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Memo</label>
          <textarea
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Notes..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          Save Book
        </Button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onResult={handleScan}
          onCancel={() => setShowScanner(false)}
        />
      )}
    </form>
  );
};
