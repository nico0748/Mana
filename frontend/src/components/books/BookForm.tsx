import React, { useState, useRef } from "react";
import { type Book } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BarcodeScanner } from "./BarcodeScanner";
import { fetchBookByIsbn, searchBookByTitle } from "../../lib/bookApi";
import { Scan, Search, X, Plus, ImageIcon, Sparkles } from "lucide-react";

interface BookFormProps {
  initialData?: Partial<Book>;
  /** 自動入力のために既存の本一覧を渡す（任意） */
  existingBooks?: Book[];
  onSubmit: (data: Omit<Book, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  onUploadImage?: (file: File) => Promise<string>;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2.5">{children}</p>
);

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs text-zinc-400 mb-1">
    {children}
    {required && <span className="ml-0.5 text-red-400">*</span>}
  </label>
);

const selectClass =
  "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg py-2 pl-3 pr-8 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10 w-full transition-colors";

export const BookForm: React.FC<BookFormProps> = (props) => {
  const { initialData, existingBooks = [], onSubmit, onCancel } = props;

  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoFilled, setAutoFilled] = useState<"author" | "circleName" | null>(null);

  const [formData, setFormData] = useState({
    title:      initialData?.title      ?? "",
    author:     initialData?.author     ?? "",
    circleName: initialData?.circleName ?? "",
    isbn:       initialData?.isbn       ?? "",
    type:       (initialData?.type      ?? "commercial") as Book["type"],
    category:   initialData?.category   ?? "",
    ndcCode:    initialData?.ndcCode    ?? "",
    status:     (initialData?.status    ?? "owned") as Book["status"],
    price:      (initialData?.price     ?? "") as number | "",
    memo:       initialData?.memo       ?? "",
    coverUrl:   initialData?.coverUrl   ?? "",
  });

  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDoujin = formData.type === "doujin";

  // ── 自動入力 ─────────────────────────────────────────────────────────────
  const flashAutoFill = (field: "author" | "circleName") => {
    setAutoFilled(field);
    setTimeout(() => setAutoFilled(null), 2000);
  };

  const handleCircleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, circleName: value }));
    // 著者が未入力かつ既存データに一致するサークルがある場合のみ自動入力
    if (value && !formData.author) {
      const match = existingBooks.find(
        b => b.circleName?.toLowerCase() === value.toLowerCase() ||
             b.author.toLowerCase() === value.toLowerCase()
      );
      if (match?.author) {
        setFormData(prev => ({ ...prev, author: match.author }));
        flashAutoFill("author");
      }
    }
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, author: value }));
    // サークル名が未入力かつ既存データに一致する著者がある場合のみ自動入力
    if (value && !formData.circleName) {
      const match = existingBooks.find(b => b.author.toLowerCase() === value.toLowerCase());
      if (match?.circleName) {
        setFormData(prev => ({ ...prev, circleName: match.circleName! }));
        flashAutoFill("circleName");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── ISBN / タイトル検索 ───────────────────────────────────────────────────
  const fetchBookData = async (isbn: string) => {
    if (!isbn) return;
    setLoading(true);
    try {
      const bookData = await fetchBookByIsbn(isbn);
      if (bookData) {
        setFormData(prev => ({
          ...prev,
          title:    bookData.title,
          author:   bookData.author,
          isbn:     bookData.isbn,
          coverUrl: bookData.coverUrl || prev.coverUrl,
          ndcCode:  bookData.ndcCode  || prev.ndcCode,
        }));
      } else {
        alert("書籍が見つかりませんでした");
      }
    } catch {
      alert("書籍情報の取得に失敗しました");
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
        alert("表紙画像が見つかりませんでした");
      }
    } catch {
      alert("表紙画像の検索に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !props.onUploadImage) return;
    setUploading(true);
    try {
      const url = await props.onUploadImage(file);
      setFormData(prev => ({ ...prev, coverUrl: url }));
    } catch {
      alert("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  // ── タグ操作 ─────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  // ── 送信 ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        price:      formData.price !== "" ? Number(formData.price) : undefined,
        circleName: formData.circleName || undefined,
        tags,
      } as Omit<Book, "id" | "createdAt" | "updatedAt">);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 自動入力ハイライトスタイル
  const autoHighlightClass = (field: "author" | "circleName") =>
    autoFilled === field ? "ring-1 ring-violet-400/60 border-violet-500" : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-5 rounded-xl border border-zinc-800">

      {/* ── 種別トグル ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl w-fit">
        {(["commercial", "doujin"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, type: t }))}
            className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              formData.type === t
                ? "bg-zinc-600 text-zinc-100 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "commercial" ? "商業誌" : "同人誌"}
          </button>
        ))}
      </div>

      {/* ── カバー画像 ─────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>カバー画像</SectionLabel>
        <div className="flex items-start gap-4">
          {/* クリックでファイル選択できるプレビューエリア */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-24 flex-shrink-0 rounded-lg border border-zinc-700 overflow-hidden flex items-center justify-center hover:border-zinc-500 transition-colors bg-zinc-800 group"
          >
            {formData.coverUrl ? (
              <img src={formData.coverUrl} alt="カバー" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          <div className="flex-1 space-y-2 min-w-0">
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "処理中..." : "画像を選択"}
            </Button>
            <div>
              <FieldLabel>または画像URL</FieldLabel>
              <Input name="coverUrl" value={formData.coverUrl} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      {/* ── 基本情報 ───────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>基本情報</SectionLabel>
        <div className="space-y-3">

          {/* タイトル */}
          <div>
            <FieldLabel required>タイトル</FieldLabel>
            <div className="flex gap-2">
              <Input name="title" value={formData.title} onChange={handleChange} required placeholder="タイトルを入力" />
              <Button type="button" variant="outline" size="icon" onClick={handleTitleSearch}
                title="タイトルで表紙を検索" disabled={!formData.title || uploading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* サークル名（同人誌のみ） */}
          {isDoujin && (
            <div>
              <FieldLabel>サークル名</FieldLabel>
              <div className="relative">
                <Input
                  name="circleName"
                  value={formData.circleName}
                  onChange={handleCircleNameChange}
                  placeholder="サークル名を入力"
                  className={autoHighlightClass("circleName")}
                />
                {autoFilled === "circleName" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-violet-400 pointer-events-none">
                    <Sparkles className="w-3 h-3" />自動入力
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 著者名 */}
          <div>
            <FieldLabel required>著者名</FieldLabel>
            <div className="relative">
              <Input
                name="author"
                value={formData.author}
                onChange={isDoujin ? handleAuthorChange : handleChange}
                required
                placeholder="著者名を入力"
                className={autoHighlightClass("author")}
              />
              {autoFilled === "author" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-violet-400 pointer-events-none">
                  <Sparkles className="w-3 h-3" />自動入力
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 書誌情報 ───────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>書誌情報</SectionLabel>
        <div className="space-y-3">

          {/* ISBN */}
          <div>
            <FieldLabel>ISBN</FieldLabel>
            <div className="flex gap-2">
              <Input name="isbn" value={formData.isbn} onChange={handleChange} placeholder="ISBN（任意）" />
              <Button type="button" variant="outline" size="icon"
                onClick={() => fetchBookData(formData.isbn)} title="ISBNで書籍情報を取得">
                <Search className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon"
                onClick={() => setShowScanner(true)} title="バーコードスキャン">
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 商業誌: カテゴリ + NDC */}
          {!isDoujin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>カテゴリ</FieldLabel>
                <Input name="category" value={formData.category} onChange={handleChange} placeholder="例: Tech, Manga" />
              </div>
              <div>
                <FieldLabel>NDCコード</FieldLabel>
                <Input name="ndcCode" value={formData.ndcCode} onChange={handleChange}
                  placeholder="例: 913.6" list="ndc-suggestions" />
                <datalist id="ndc-suggestions">
                  <option value="007.6">コンピュータ</option>
                  <option value="141">心理学</option>
                  <option value="159">自己啓発</option>
                  <option value="210">日本史</option>
                  <option value="302">社会</option>
                  <option value="336">経営管理</option>
                  <option value="410">数学</option>
                  <option value="460">生物学</option>
                  <option value="490">医学</option>
                  <option value="500">技術・工学</option>
                  <option value="700">芸術</option>
                  <option value="726">漫画・アニメ</option>
                  <option value="726.1">コミック</option>
                  <option value="900">文学</option>
                  <option value="910">日本文学</option>
                  <option value="913.6">現代日本語小説</option>
                </datalist>
              </div>
            </div>
          )}

          {/* 同人誌: タグ */}
          {isDoujin && (
            <div>
              <FieldLabel>タグ</FieldLabel>
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
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown} placeholder="タグを入力してEnter" />
                <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={!tagInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 管理情報 ───────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>管理情報</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>ステータス</FieldLabel>
            <select name="status" value={formData.status} onChange={handleChange} className={selectClass}>
              <option value="owned">所持</option>
              <option value="lending">貸出中</option>
              <option value="borrowed">借りた</option>
              <option value="wishlist">ほしい</option>
              <option value="wanted">探している</option>
            </select>
          </div>
          <div>
            <FieldLabel>
              価格
              {formData.status === "borrowed" && <span className="ml-1 text-blue-400 font-normal">（浮いた金額）</span>}
            </FieldLabel>
            <Input name="price" type="number" min="0" value={formData.price} onChange={handleChange} placeholder="例: 1500" />
          </div>
        </div>
      </div>

      {/* ── メモ ───────────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>メモ</SectionLabel>
        <textarea
          name="memo"
          value={formData.memo}
          onChange={handleChange}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg p-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-zinc-500 resize-none transition-colors"
          placeholder="自由にメモを入力..."
        />
      </div>

      {/* ── ボタン ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-1 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          キャンセル
        </Button>
        <Button type="submit" isLoading={loading}>
          保存
        </Button>
      </div>

      {showScanner && (
        <BarcodeScanner onResult={handleScan} onCancel={() => setShowScanner(false)} />
      )}
    </form>
  );
};
