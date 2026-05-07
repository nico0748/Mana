import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { FileJson, Star, ArrowLeft, Calendar, MapPin, Loader2, LogIn } from 'lucide-react';
import { eventTemplatesApi } from '../lib/api';
import type { EventTemplateSummary } from '../types';

const formatDate = (s?: string) => {
  if (!s) return null;
  // 投稿時に保存されている "YYYY-MM-DD" 想定。それ以外は素のまま表示。
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : s;
};

const TemplateCard: React.FC<{ template: EventTemplateSummary }> = ({ template }) => {
  const date = formatDate(template.date);
  return (
    <div className="px-5 py-4 bg-zinc-800/60 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <FileJson size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100 truncate">{template.name}</p>
          {date && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
              <Calendar size={11} />
              <span>{date}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-zinc-500 pl-[23px]">
        <MapPin size={11} />
        <span>{template.hallCount} ホール</span>
        {template.halls.length > 0 && (
          <span className="text-zinc-600 truncate">
            （{template.halls.slice(0, 6).join(' / ')}{template.halls.length > 6 ? ' …' : ''}）
          </span>
        )}
      </div>
    </div>
  );
};

const TemplatesPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eventTemplates', 'public'],
    queryFn: eventTemplatesApi.listPublic,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/about" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">紹介ページへ戻る</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/doujin-pp.png" alt="同人++" className="w-6 h-6 rounded-md" />
            <span
              className="font-normal text-zinc-100"
              style={{ fontFamily: '"Reggae One", system-ui', fontSize: '1.1rem' }}
            >
              同人++
            </span>
          </div>
        </div>
      </nav>

      {/* ── ヘッダー ── */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <FileJson size={16} className="text-violet-400" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Templates</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">テンプレート</h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl">
            ユーザーが作成し、運営が承認した即売会テンプレートを掲載しています。
            アプリのマップページから「テンプレートから読み込む」を選ぶと、
            イベント名・日程・会場マップ画像が一括で取り込まれます。
          </p>
        </motion.div>
      </header>

      {/* ── テンプレート一覧 ── */}
      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* テンプレートリスト */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-2"
          >
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              テンプレート一覧
            </h2>

            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm py-6">
                <Loader2 size={14} className="animate-spin" />
                読み込み中…
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                テンプレート一覧の取得に失敗しました。
              </div>
            )}

            {data && data.length === 0 && (
              <div className="px-5 py-8 text-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
                まだ承認済みのテンプレートがありません。
                <br />
                <span className="text-xs text-zinc-600">
                  ユーザーから申請があり、運営が承認するとここに掲載されます。
                </span>
              </div>
            )}

            {data && data.length > 0 && data.map(t => <TemplateCard key={t.id} template={t} />)}
          </motion.div>

          {/* 使い方 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">使い方</h2>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <ol className="space-y-5">
                {[
                  { step: '01', title: 'アプリにログイン', text: '同人++ にログインしてマップページを開きます。' },
                  { step: '02', title: '読み込む', text: '「テンプレートから読み込む」を選び、利用したいテンプレートをタップします。' },
                  { step: '03', title: '完了', text: '即売会・ホール一覧・マップ画像が自動で作成されます。' },
                  { step: '04', title: '自分の即売会も申請できます', text: '作成したイベントの編集メニューから「テンプレート申請」を選ぶと、運営の承認後にここに掲載されます。' },
                ].map(({ step, title, text }) => (
                  <li key={step} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 text-xs font-bold flex items-center justify-center">
                      {step}
                    </span>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-zinc-200 mb-0.5">{title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              <LogIn size={14} />
              アプリにログイン
            </Link>
          </motion.div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-violet-400" />
            <span className="text-sm font-semibold text-zinc-400">同人++</span>
          </div>
          <p className="text-xs text-zinc-600">© 2024 同人++</p>
        </div>
      </footer>
    </div>
  );
};

export default TemplatesPage;
