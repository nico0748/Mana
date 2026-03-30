import React, { useState } from "react";
import { type Book } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BarcodeScanner } from "./BarcodeScanner";
import { fetchBookByIsbn, searchBookByTitle } from "../../lib/bookApi";
import { Scan, Search, X, Plus } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    author: initialData?.author || "",
    isbn: initialData?.isbn || "",
    type: initialData?.type || "commercial",
    category: initialData?.category || "",
    ndcCode: initialData?.ndcCode || "",
    status: initialData?.status || "owned",
    price: initialData?.price ?? "",
    memo: initialData?.memo || "",
    coverUrl: initialData?.coverUrl || "",
  });
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

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
          ndcCode: bookData.ndcCode || prev.ndcCode,
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
    setUploading(true);
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

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        price: formData.price !== "" ? Number(formData.price) : undefined,
        tags,
      };
      await onSubmit(submitData as Omit<import('../../types').Book, 'id' | 'createdAt' | 'updatedAt'>);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
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

  const selectClass = "bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md py-2 pl-3 pr-8 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/10 w-full";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 p-6 rounded-lg border border-zinc-800">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-300">カバー画像</label>
          <div className="mt-1 flex flex-col gap-2">
            <div className="flex items-start space-x-4">
              {formData.coverUrl && (
                <img src={formData.coverUrl} alt="Cover" className="h-24 w-16 object-cover rounded border border-zinc-700 flex-shrink-0" />
              )}
              <div className="flex-grow space-y-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">ファイルをアップロード</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-sm text-zinc-500">アップロード中...</span>}
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">または画像URL</label>
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
          <label className="block text-sm font-medium text-zinc-300">タイトル</label>
          <div className="flex gap-2">
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="タイトル"
            />
            <Button type="button" variant="outline" size="icon" onClick={handleTitleSearch} title="タイトルでカバー検索" disabled={!formData.title || uploading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-zinc-300">著者 / サークル名</label>
          <Input
            name="author"
            value={formData.author}
            onChange={handleChange}
            required
            placeholder="著者名"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-zinc-300">ISBN</label>
          <div className="flex gap-2">
            <Input
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              placeholder="ISBN（任意）"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => fetchBookData(formData.isbn)} title="ISBNで検索">
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)} title="バーコードスキャン">
              <Scan className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">種別</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="commercial">商業</option>
            <option value="doujin">同人誌</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">ステータス</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="owned">所持</option>
            <option value="lending">貸出中</option>
            <option value="borrowed">借りた</option>
            <option value="wishlist">ほしい</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            価格
            {formData.status === 'borrowed' && (
              <span className="ml-2 text-xs text-blue-400">（借りて浮いた金額）</span>
            )}
          </label>
          <Input
            name="price"
            type="number"
            min="0"
            value={formData.price}
            onChange={handleChange}
            placeholder="例: 1500"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-zinc-300">カテゴリ</label>
          <Input
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="カテゴリ（例: Tech, Manga）"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-zinc-300">NDC（日本十進分類法）</label>
          <Input
            name="ndcCode"
            value={formData.ndcCode}
            onChange={handleChange}
            placeholder="例: 913.6, 007.6"
            list="ndc-suggestions"
          />
          <datalist id="ndc-suggestions">
            <option value="007">情報科学</option>
            <option value="007.6">コンピュータ</option>
            <option value="141">心理学</option>
            <option value="159">自己啓発</option>
            <option value="210">日本史</option>
            <option value="302">社会</option>
            <option value="316">社会問題</option>
            <option value="336">経営管理</option>
            <option value="375">教育課程</option>
            <option value="410">数学</option>
            <option value="420">物理学</option>
            <option value="460">生物学</option>
            <option value="490">医学</option>
            <option value="500">技術・工学</option>
            <option value="590">家政学</option>
            <option value="600">産業</option>
            <option value="700">芸術</option>
            <option value="726">漫画・アニメ</option>
            <option value="726.1">コミック</option>
            <option value="800">言語</option>
            <option value="810">日本語</option>
            <option value="900">文学</option>
            <option value="910">日本文学</option>
            <option value="913">日本語小説</option>
            <option value="913.6">現代日本語小説</option>
            <option value="936">英米語小説</option>
          </datalist>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-300">メモ</label>
          <textarea
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md p-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-400"
            placeholder="メモ..."
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-300 mb-1">タグ</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-violet-400/10 text-violet-300 border border-violet-400/25">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="タグを入力してEnter"
            />
            <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={!tagInput.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          キャンセル
        </Button>
        <Button type="submit" isLoading={loading}>
          保存
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
