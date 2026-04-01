import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileJson, Star, ArrowLeft } from 'lucide-react';
import { OFFICIAL_TEMPLATES, downloadTemplate } from '../data/templates';
import type { EventTemplate } from '../types/template';

// ─── テンプレートカード ────────────────────────────────────────────────────────

const TemplateCard: React.FC<{ template: EventTemplate }> = ({ template }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    downloadTemplate(template);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 bg-zinc-800/60 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileJson size={15} className="text-violet-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-zinc-200 truncate">{template.name}</span>
        </div>
        {template.description && (
          <p className="text-xs text-zinc-500 pl-[23px]">{template.description}</p>
        )}
        <p className="text-xs text-zinc-600 mt-0.5 pl-[23px]">{template.halls.length} ホール構成</p>
      </div>
      <button
        onClick={handleDownload}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
          downloaded
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-violet-600 hover:bg-violet-500 text-white'
        }`}
      >
        <Download size={13} />
        {downloaded ? '完了' : 'ダウンロード'}
      </button>
    </div>
  );
};

// ─── TemplatesPage ─────────────────────────────────────────────────────────────

const TemplatesPage: React.FC = () => {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">公式テンプレート</h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl">
            ダウンロードしたテンプレートをアプリのマップページから読み込むだけで、即売会名・ホール一覧が自動で作成されます。
            マップ画像は各即売会の公式サイトからご用意ください。
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
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">テンプレート一覧</h2>
            {OFFICIAL_TEMPLATES.map(t => (
              <TemplateCard key={t.templateId} template={t} />
            ))}
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
                  { step: '01', title: 'ダウンロード', text: 'テンプレート JSON をダウンロードします。' },
                  { step: '02', title: 'アプリを開く', text: 'アプリにログインしてマップページへ移動します。' },
                  { step: '03', title: '読み込む', text: '「テンプレートから読み込む」ボタンをタップし、JSON ファイルを選択します。' },
                  { step: '04', title: '完了', text: '即売会・ホールが自動で作成されます。あとはマップ画像をアップロードするだけです。' },
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

            {/* 注意書き */}
            <div className="mt-4 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-xs text-zinc-500 leading-relaxed">
                テンプレートには即売会名・日程・ホール名のみが含まれます。
                マップ画像は含まれないため、各即売会の公式サイトから別途ご用意ください。
              </p>
            </div>
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
