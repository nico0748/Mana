import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Map, ShoppingCart, Settings, Download, FileJson,
  ChevronDown, ChevronUp, LogIn, Star,
} from 'lucide-react';
import { OFFICIAL_TEMPLATES, downloadTemplate } from '../data/templates';
import type { EventTemplate } from '../types/template';

// ─── Feature cards ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BookOpen,
    title: '蔵書管理',
    desc: '商業誌・同人誌をまとめて管理。タグ付けや状態管理（所持・貸出・欲しい）、ISBN検索による表紙取得にも対応。',
  },
  {
    icon: ShoppingCart,
    title: '買い物リスト',
    desc: '即売会ごとにサークル・アイテムを管理。購入ステータスをリアルタイムで更新でき、予算管理にも役立ちます。',
  },
  {
    icon: Map,
    title: '会場マップ',
    desc: '会場マップ画像をアップロードして、サークルの場所にピンを立てられます。ナビモードで当日の回り方を計画。',
  },
  {
    icon: Settings,
    title: '柔軟なデータ管理',
    desc: 'CSV・Excel・JSONでインポート/エキスポート。公式テンプレートを読み込めば即売会のセットアップが即完了。',
  },
];

// ─── TemplateCard ──────────────────────────────────────────────────────────

const TemplateCard: React.FC<{ template: EventTemplate }> = ({ template }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    downloadTemplate(template);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileJson size={14} className="text-violet-400 flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-200 truncate">{template.name}</span>
        </div>
        {template.description && (
          <p className="text-xs text-zinc-500 mt-0.5 pl-[22px]">{template.description}</p>
        )}
        <p className="text-xs text-zinc-600 mt-0.5 pl-[22px]">
          {template.halls.length} ホール
        </p>
      </div>
      <button
        onClick={handleDownload}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          downloaded
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-zinc-700 text-zinc-300 border border-zinc-600 hover:bg-zinc-600'
        }`}
      >
        <Download size={12} />
        {downloaded ? '完了' : 'DL'}
      </button>
    </div>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'テンプレートデータとは？',
    a: '即売会名・日程・ホール一覧を含むJSONファイルです。アプリ内でインポートすると、即売会とホール一覧が自動で作成され、マップ画像をアップロードするだけですぐ使い始められます。',
  },
  {
    q: 'マップ画像はどこから用意すればよいですか？',
    a: '各即売会の公式サイトで配布されているPDFや画像をお使いください。PDF・JPG・PNGいずれも対応しています。',
  },
  {
    q: 'データはどこに保存されますか？',
    a: 'アカウントに紐づいてクラウドに保存されます。複数デバイスからアクセス可能です。',
  },
  {
    q: '既存のExcelデータは使えますか？',
    a: 'はい。CSV・Excel・JSON形式でのインポートに対応しています。テンプレートファイルをダウンロードして書式を確認できます。',
  },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800 last:border-none">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-4 text-left gap-3"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        {open ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-zinc-400 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
};

// ─── LandingPage ───────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-violet-400" />
            <span className="font-bold text-zinc-100 tracking-tight">同人++</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <LogIn size={14} />
            ログイン / 登録
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
            <Star size={12} />
            同人即売会をもっとスマートに
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 leading-tight mb-4">
            同人活動を、<br className="sm:hidden" />
            <span className="text-violet-400">まるごと管理</span>。
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            蔵書・買い物リスト・会場マップを一か所で管理。
            公式テンプレートを読み込むだけで即売会の準備が完了します。
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
            >
              無料で始める
            </Link>
            <a
              href="#templates"
              className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors border border-zinc-700"
            >
              テンプレートを見る
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-zinc-100 text-center mb-8">主な機能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-5 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <f.icon size={18} className="text-violet-400" />
                </div>
                <h3 className="font-semibold text-zinc-100">{f.title}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Templates ── */}
      <section id="templates" className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <FileJson size={18} className="text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">公式テンプレート</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            テンプレートをダウンロードして、アプリのマップページから読み込むだけ。
            即売会名・ホール一覧が自動で作成されます。
            マップ画像は各即売会の公式サイトからご用意ください。
          </p>

          <div className="space-y-2 mb-6">
            {OFFICIAL_TEMPLATES.map(t => (
              <TemplateCard key={t.templateId} template={t} />
            ))}
          </div>

          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/40 p-4">
            <p className="text-xs font-semibold text-zinc-300 mb-2">テンプレートの使い方</p>
            <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
              <li>テンプレートJSONをダウンロード</li>
              <li>アプリにログイン → マップページを開く</li>
              <li>「テンプレートから読み込む」ボタンからJSONを選択、またはアプリ内テンプレート一覧から選択</li>
              <li>即売会・ホールが自動作成されます。あとはマップ画像をアップロードするだけ</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-zinc-100 text-center mb-8">よくある質問</h2>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-6">
          {FAQ_ITEMS.map(item => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center bg-gradient-to-br from-violet-500/10 to-zinc-900 rounded-2xl border border-violet-500/20 p-10">
          <h2 className="text-2xl font-bold text-zinc-100 mb-3">さっそく使ってみる</h2>
          <p className="text-zinc-400 mb-6 text-sm">Googleアカウントで無料登録できます</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            <LogIn size={16} />
            ログイン / 新規登録
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-8 text-center">
        <p className="text-xs text-zinc-600">© 2024 同人++ — 同人活動をもっとスマートに</p>
      </footer>
    </div>
  );
};

export default LandingPage;
