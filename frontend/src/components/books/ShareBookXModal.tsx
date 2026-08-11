import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import type { Book } from '../../types';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import {
  buildBookShareTemplate,
  coverUrlToFile,
  canShareFilesWith,
  shareBookOnX,
  downloadBlobFile,
} from '../../lib/bookShare';

interface Props {
  book: Book;
  onClose: () => void;
}

// X 無料枠のおおよその文字制限。Premium だと 25,000 まで伸びるが、無料を基準に注意喚起する。
const X_FREE_CHAR_LIMIT = 280;

type CoverState = 'none' | 'loading' | 'ready' | 'unavailable';

export const ShareBookXModal: React.FC<Props> = ({ book, onClose }) => {
  const [text, setText] = useState(() => buildBookShareTemplate(book));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverState, setCoverState] = useState<CoverState>(book.coverUrl ? 'loading' : 'none');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!book.coverUrl) return;
    let cancelled = false;
    coverUrlToFile(book.coverUrl, book.title).then(file => {
      if (cancelled) return;
      if (file) {
        setCoverFile(file);
        setCoverState('ready');
      } else {
        setCoverState('unavailable');
      }
    });
    return () => { cancelled = true; };
  }, [book.coverUrl, book.title]);

  const canShareWithImage = coverState === 'ready' && coverFile != null && canShareFilesWith(coverFile);
  const charCount = [...text].length;
  const overLimit = charCount > X_FREE_CHAR_LIMIT;

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareBookOnX(text, canShareWithImage ? coverFile : null);
      if (result !== 'cancelled') onClose();
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog label="Xで紹介" onClose={onClose} className="max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">Xで紹介</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {book.coverUrl && (
            <div className="flex items-start gap-3">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-16 h-24 object-cover rounded-md border border-zinc-800 flex-shrink-0 bg-zinc-950"
              />
              <div className="flex-1 min-w-0 text-xs space-y-1 pt-1 leading-relaxed">
                {coverState === 'loading' && (
                  <p className="text-zinc-500">表紙画像を準備中…</p>
                )}
                {coverState === 'ready' && canShareWithImage && (
                  <p className="text-emerald-400">表紙画像も一緒に投稿されます</p>
                )}
                {coverState === 'ready' && !canShareWithImage && (
                  <p className="text-amber-400">
                    このブラウザでは画像の同時投稿に未対応です。
                    「画像を保存」から端末に保存し、X側で手動で添付してください。
                  </p>
                )}
                {coverState === 'unavailable' && (
                  <p className="text-amber-400">
                    表紙画像を取得できませんでした。
                    テキストのみXに投稿します。
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="x-share-text" className="block text-xs font-medium text-zinc-400 mb-1.5">
              投稿内容（推しポイントを書き込めます）
            </label>
            <textarea
              id="x-share-text"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={9}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className={overLimit ? 'text-amber-400' : 'text-zinc-500'}>
                {charCount} / {X_FREE_CHAR_LIMIT}（無料枠の目安）
              </span>
              {overLimit && (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Premium 推奨
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex flex-wrap gap-2">
          {coverState === 'ready' && !canShareWithImage && coverFile && (
            <Button
              variant="outline"
              onClick={() => downloadBlobFile(coverFile)}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              画像を保存
            </Button>
          )}
          <Button
            onClick={handleShare}
            isLoading={sharing}
            disabled={sharing}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 hover:text-zinc-900"
          >
            {sharing ? '投稿中…' : 'Xに投稿'}
          </Button>
        </div>
    </Dialog>
  );
};
