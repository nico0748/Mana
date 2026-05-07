import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Trash2, Sparkles, Wrench, CalendarDays, Megaphone, Pencil } from 'lucide-react';
import type { Announcement, AnnouncementCategory } from '../types';

const CATEGORY_META: Record<AnnouncementCategory, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string }> = {
  feature: { label: '機能追加', icon: Sparkles,     chip: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' },
  fix:     { label: '不具合修正', icon: Wrench,       chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  event:   { label: 'イベント',  icon: CalendarDays, chip: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  info:    { label: 'お知らせ',   icon: Megaphone,    chip: 'bg-zinc-700/40 text-zinc-300 ring-zinc-600/40' },
};

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

interface Props {
  announcement: Announcement;
  onEdit?: (a: Announcement) => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
  highlighted?: boolean;
}

export const AnnouncementItem: React.FC<Props> = ({ announcement, onEdit, onDelete, deleting, highlighted }) => {
  const meta = CATEGORY_META[announcement.category] ?? CATEGORY_META.info;
  const Icon = meta.icon;

  return (
    <article
      className={[
        'rounded-2xl border bg-zinc-900/60 p-5 sm:p-6 transition-colors',
        highlighted ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-zinc-800',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${meta.chip}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
          <span className="text-xs text-zinc-500">{formatDate(announcement.createdAt)}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(announcement)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                title="編集"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(announcement.id)}
                disabled={deleting}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </header>

      <h3 className="text-lg sm:text-xl font-bold text-zinc-100 leading-snug mb-3">
        {announcement.title}
      </h3>

      {announcement.imageUrl && (
        <img
          src={announcement.imageUrl}
          alt=""
          className="w-full max-h-80 object-contain rounded-xl border border-zinc-800 mb-4 bg-zinc-950"
        />
      )}

      <div className="text-sm text-zinc-300 leading-relaxed space-y-3 break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p:      ({ children }) => <p className="text-zinc-300">{children}</p>,
            h1:     ({ children }) => <h4 className="text-base font-bold text-zinc-100 mt-3">{children}</h4>,
            h2:     ({ children }) => <h4 className="text-base font-bold text-zinc-100 mt-3">{children}</h4>,
            h3:     ({ children }) => <h5 className="text-sm font-semibold text-zinc-100 mt-3">{children}</h5>,
            a:      ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                {children}
              </a>
            ),
            ul:     ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
            ol:     ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
            li:     ({ children }) => <li className="text-zinc-300">{children}</li>,
            code:   ({ children }) => <code className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200 text-xs">{children}</code>,
            pre:    ({ children }) => <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 overflow-x-auto text-xs">{children}</pre>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-700 pl-3 text-zinc-400">{children}</blockquote>,
            img:    ({ src, alt }) => (
              <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="rounded-lg border border-zinc-800 max-h-80 object-contain" />
            ),
            hr:     () => <hr className="border-zinc-800" />,
          }}
        >
          {announcement.body}
        </ReactMarkdown>
      </div>
    </article>
  );
};
