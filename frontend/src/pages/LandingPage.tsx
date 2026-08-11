import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Map, ShoppingCart, Settings,
  ChevronDown, ChevronUp, LogIn, ArrowRight, FileJson, Crown, Check,
  Megaphone, MapPin, Calendar, Mail, ExternalLink, Loader2,
  Camera, Tag, Database, Navigation, Layers, Image as ImageIcon,
  Menu, X, Users2,
} from 'lucide-react';
import { announcementsApi, eventTemplatesApi, faqsApi } from '../lib/api';
import { AnnouncementItem } from '../components/AnnouncementItem';
import type { EventTemplateSummary, Announcement } from '../types';

// ─── 設定 ──────────────────────────────────────────────────────────────────────

// CONTACT セクションで開く Google フォームの URL。
// 実際のフォームができたらここを差し替える。
const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/viewform';

const SECTIONS = ['home', 'news', 'system', 'template', 'faq', 'contact'] as const;
type Section = typeof SECTIONS[number];

const SECTION_LABELS: Record<Section, string> = {
  home: 'HOME',
  news: 'NEWS',
  system: 'SYSTEM',
  template: 'TEMPLATE',
  faq: 'FAQ',
  contact: 'CONTACT',
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── データ ────────────────────────────────────────────────────────────────────

// HOME セクションの軽量な機能紹介（左右交互レイアウト）
const FEATURES = [
  {
    icon: BookOpen,
    tag: '蔵書管理',
    title: '本棚を、\nデジタルで整理する',
    desc: '商業誌・同人誌をまとめて一元管理。ISBN スキャンで書誌情報を自動取得し、タグ・サークル名で絞り込めます。所持・貸出・欲しいリストなど5つのステータスで状態を管理でき、CSV・Excelでのインポート・エクスポートにも対応しています。',
    imageSide: 'right' as const,
    image: '/feature-books.png',
  },
  {
    icon: ShoppingCart,
    tag: '買い物リスト',
    title: 'イベント当日の\n買い物をスマートに',
    desc: '即売会ごとにサークルとアイテムを登録。予算管理・購入ステータスをリアルタイムで更新でき、サークルのXプロフィールURLやメニュー画像も保存できます。CSV / Excelでのサークルリスト取り込みにも対応しています。',
    imageSide: 'left' as const,
    image: '/feature-list-to-navi.png',
  },
  {
    icon: Map,
    tag: '会場マップ',
    title: 'マップで把握する\n当日の動き',
    desc: '公式配布のマップ PDF・画像をアップロードして、サークルの場所にピンを立てられます。ナビモードでは効率的な巡回ルートを計画。ホールごとにマップを管理でき、公式テンプレートを読み込めばセットアップは数秒で完了。',
    imageSide: 'right' as const,
    image: '/feature-map.png',
  },
  {
    icon: Settings,
    tag: 'データ管理',
    title: '慣れ親しんだ\nExcel から移行できる',
    desc: 'すべての機能でCSV・Excel・JSONのインポート・エクスポートに対応。長年使い続けてきたスプレッドシートのデータをそのまま取り込めます。公式テンプレートを使えば、イベント名・日程・会場マップをまとめて取り込めます。',
    imageSide: 'left' as const,
    image: '/feature-data-to-list.png',
  },
];

// SYSTEM セクションの詳細機能解説
const SYSTEM_DETAILS = [
  {
    icon: BookOpen,
    tag: '蔵書管理',
    title: 'すべての本を、ひとつの本棚に',
    summary: '商業誌から同人誌まで、所有・貸出・欲しいリストを 5 段階のステータスで把握できます。',
    image: '/feature-books.png',
    points: [
      { icon: Camera, label: 'ISBN スキャン', desc: 'カメラでバーコードを読むだけで書誌情報を自動取得。タイトル・著者・表紙画像・NDC 分類まで一括登録。' },
      { icon: Tag,    label: 'タグ + サークル名検索', desc: 'ジャンルやイベント別、サークル名で瞬時に絞り込み。所持と「欲しい」を別ステータスに分けて管理。' },
      { icon: Database, label: 'CSV / Excel / JSON 対応', desc: 'スプレッドシートで管理してきたデータをそのままインポート可能。エクスポートは選択した形式でいつでも。' },
    ],
  },
  {
    icon: ShoppingCart,
    tag: '買い物リスト',
    title: '即売会当日に効く 4 セグメント予算バー',
    summary: 'サークルとアイテムを登録すると、購入済 / 未購入 / 残り予算 / 超過分が一本のバーで一目でわかります。',
    image: '/feature-list-to-navi.png',
    points: [
      { icon: Layers, label: '即売会単位の管理', desc: 'イベントごとにサークル一覧と予算枠を分離。複数イベントを並行管理しても混ざりません。' },
      { icon: ImageIcon, label: 'メニュー画像とXプロフィール', desc: '各サークルに新刊メニュー画像とXのプロフィールURLを登録。当日の「何を頒布している？」をすぐ確認できます。' },
      { icon: Navigation, label: 'ナビモードで巡回最適化', desc: '未購入のサークルだけを順番に案内。次に行くサークルを大きく表示し、近接サークルを優先表示します。' },
    ],
  },
  {
    icon: Map,
    tag: '会場マップ',
    title: 'PDF / 画像をアップロードしてピン留め',
    summary: '公式配布のマップを取り込み、サークル位置をピンで管理。フルスクリーンで実機運用を想定した設計です。',
    image: '/feature-map.png',
    points: [
      { icon: ImageIcon, label: 'PDF / JPG / PNG 対応', desc: 'PDF はそのまま 1 ページ目を画像化して使用。回転・トリミングもアプリ内で完結します。' },
      { icon: MapPin, label: 'ステータス連動ピン', desc: 'ピンの色が購入ステータスに連動（未購入=黄 / 購入済=緑 / 売切=赤）。視覚的に進捗が分かります。' },
      { icon: Navigation, label: 'iOS Safari 横向き対応', desc: '回転・ピンチズーム時のピン位置ズレを抑制。会場で iPhone を横にしても破綻しません。' },
    ],
  },
  {
    icon: Settings,
    tag: 'データ管理 / テンプレート',
    title: 'Excel から、コミュニティから、流し込む',
    summary: 'スプレッドシート資産をそのまま活かしつつ、他ユーザーが作ったテンプレートで初期セットアップを瞬時に。',
    image: '/feature-data-to-list.png',
    points: [
      { icon: Database, label: 'すべてのデータを入出力', desc: '蔵書・サークル・頒布物・会場マップをCSV / Excel / JSONでインポート・エクスポートできます。' },
      { icon: FileJson, label: 'コミュニティテンプレート', desc: '他ユーザーが申請し、運営が承認した即売会テンプレートを利用可能。イベント名・日程・会場マップをまとめて取り込めます。' },
      { icon: Tag, label: '自分のイベントも申請可能', desc: '買い物リストの即売会カードから申請ボタン → 運営の承認後にテンプレート一覧へ掲載されます。' },
    ],
  },
];

// FAQ は管理者ページから動的に編集可能。データは /api/public/faqs から取得する。

// ─── 共通: トップナビ ──────────────────────────────────────────────────────────

const MobileDrawer: React.FC<{
  open: boolean;
  section: Section;
  onChange: (s: Section) => void;
  onClose: () => void;
}> = ({ open, section, onChange, onClose }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
        />
        {/* drawer */}
        <motion.aside
          key="drawer"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          className="fixed top-0 left-0 z-[70] h-full w-72 max-w-[80vw] bg-zinc-950 border-r border-zinc-800 shadow-2xl lg:hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <img src="/doujin-pp.png" alt="同人++" className="w-7 h-7 rounded-lg" />
              <span
                className="text-zinc-100"
                style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400, fontSize: '1.1rem' }}
              >
                同人++
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="メニューを閉じる"
              className="p-2 -mr-2 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto py-2">
            {SECTIONS.map(s => {
              const active = s === section;
              return (
                <li key={s}>
                  <button
                    onClick={() => onChange(s)}
                    className={[
                      'w-full flex items-center gap-3 px-5 py-3 text-left text-sm font-semibold tracking-widest transition-colors',
                      active
                        ? 'text-violet-300 bg-violet-500/10 border-l-2 border-violet-400'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border-l-2 border-transparent',
                    ].join(' ')}
                  >
                    {SECTION_LABELS[s]}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-zinc-800 p-4">
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <LogIn size={14} />
              ログイン
            </Link>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>
);

const TopNav: React.FC<{ section: Section; onChange: (s: Section) => void }> = ({ section, onChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // セクション切替時にドロワーを閉じる
  const handleChange = (s: Section) => {
    onChange(s);
    setDrawerOpen(false);
  };

  // ドロワー表示中は背面のスクロールをロック
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

          {/* ── モバイル: ハンバーガー（左） + 中央タイトル + ログイン（右） ── */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="メニューを開く"
            className="lg:hidden p-2 -ml-2 text-zinc-300 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={() => onChange('home')}
            className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/doujin-pp.png" alt="同人++" className="w-7 h-7 rounded-lg shadow" />
            <span
              className="text-zinc-100"
              style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400, fontSize: '1.2rem' }}
            >
              同人++
            </span>
          </button>

          {/* ── デスクトップ: 左ロゴ + タブ + 右ログイン ── */}
          <button
            onClick={() => onChange('home')}
            className="hidden lg:flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src="/doujin-pp.png" alt="同人++" className="w-7 h-7 rounded-lg shadow" />
            <span
              className="text-zinc-100"
              style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400, fontSize: '1.2rem' }}
            >
              同人++
            </span>
          </button>

          <div className="hidden lg:flex lg:ml-auto">
            <ul className="flex items-center gap-2 px-1">
              {SECTIONS.map(s => {
                const active = s === section;
                return (
                  <li key={s} className="flex-shrink-0">
                    <button
                      onClick={() => onChange(s)}
                      className={[
                        'relative px-3 py-1.5 text-sm font-semibold tracking-widest transition-colors',
                        active ? 'text-violet-300' : 'text-zinc-500 hover:text-zinc-200',
                      ].join(' ')}
                    >
                      {SECTION_LABELS[s]}
                      {active && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute -bottom-[1px] left-1 right-1 h-0.5 bg-violet-400 rounded-full"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ログインボタン: モバイルではアイコンのみで右端に固定 */}
          <Link
            to="/"
            className="ml-auto lg:ml-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
            aria-label="ログイン"
          >
            <LogIn size={14} />
            <span className="hidden lg:inline">ログイン</span>
          </Link>
        </div>
      </nav>

      <MobileDrawer
        open={drawerOpen}
        section={section}
        onChange={handleChange}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};

// ─── HOME セクション ───────────────────────────────────────────────────────────

const FeatureBlock: React.FC<{ feature: typeof FEATURES[0]; index: number }> = ({ feature, index }) => {
  const isLeft = feature.imageSide === 'left';
  const Icon = feature.icon;
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
      className="max-w-6xl mx-auto px-6 py-16 sm:py-24"
    >
      <div className={`flex flex-col ${isLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50">
              <Icon size={16} className="text-zinc-300" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-zinc-400">
              {feature.tag}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 leading-tight mb-5 whitespace-pre-line">
            {feature.title}
          </h2>
          <p className="text-zinc-400 leading-relaxed text-base sm:text-lg">{feature.desc}</p>
        </div>
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <img src={feature.image} alt={feature.tag} className="w-full rounded-2xl shadow-2xl border border-zinc-800" />
        </div>
      </div>
      {index < FEATURES.length - 1 && (
        <div className="mt-16 sm:mt-24 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      )}
    </motion.section>
  );
};

const HomeSection: React.FC = () => (
  <>
    {/* Hero */}
    <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/doujin-pp.png" alt="同人++" className="w-32 h-32 rounded-2xl shadow-xl" />
          <span
            className="text-5xl sm:text-6xl text-zinc-100"
            style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400 }}
          >
            同人++
          </span>
        </div>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-100 leading-[1.15] mb-6 tracking-tight">
          同人活動を、<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
            まるごと管理
          </span>
          。
        </h2>
        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          蔵書・買い物リスト・会場マップを一か所で管理。<br className="hidden sm:block" />
          公式テンプレートを読み込むだけで、即売会の準備が完了します。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            無料で始める
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>

    {/* Features (左右交互) */}
    <div className="border-t border-zinc-800/60">
      {FEATURES.map((feature, index) => (
        <div
          key={feature.tag}
          className={index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40'}
        >
          <FeatureBlock feature={feature} index={index} />
        </div>
      ))}
    </div>

    {/* 料金プラン */}
    <section className="border-t border-zinc-800/60 bg-zinc-900/40">
      <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-10"
        >
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-3">料金プラン</h2>
          <p className="text-sm text-zinc-400">まずは無料で。本気で活用したくなったら Pro へ。</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-100 mb-1">Free</h3>
              <p className="text-xs text-zinc-500">まず試してみる</p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold text-zinc-100">¥0</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-300 mb-6 flex-1">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-zinc-500 mt-0.5" />蔵書 200 冊まで</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-zinc-500 mt-0.5" />サークル 50 まで</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-zinc-500 mt-0.5" />イベント 3 まで</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-zinc-500 mt-0.5" />会場マップ・買い物リスト</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-zinc-500 mt-0.5" />インポート / エクスポート</li>
            </ul>
            <Link
              to="/"
              className="text-center py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              無料で始める
            </Link>
          </div>

          <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/10 to-zinc-900 p-6 flex flex-col relative">
            <div className="absolute -top-2.5 right-5 px-2.5 py-0.5 bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded-full">
              Coming Soon
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-violet-300" />
                Pro
              </h3>
              <p className="text-xs text-zinc-500">本気で活用するなら</p>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-zinc-100">¥480</span>
              <span className="text-sm text-zinc-500"> / 月（予定）</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">または年額 ¥4,800（2ヶ月分お得）</p>
            <ul className="space-y-2 text-sm text-zinc-200 mb-6 flex-1">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />蔵書 <strong>無制限</strong></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />サークル <strong>無制限</strong></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />イベント <strong>無制限</strong></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />頒布物・会場マップも無制限</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />今後追加される Pro 限定機能</li>
            </ul>
            <div
              aria-disabled="true"
              className="text-center py-2.5 rounded-xl bg-zinc-800 text-zinc-500 text-sm font-bold cursor-not-allowed select-none"
            >
              近日公開
            </div>
          </div>
        </motion.div>
        <p className="text-center text-xs text-zinc-500 mt-6">
          Pro プランは現在準備中です。リリースまでもう少々お待ちください。
        </p>
      </div>
    </section>
  </>
);

// ─── NEWS セクション ───────────────────────────────────────────────────────────

// 月キー: "YYYY-MM"
const monthKeyOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const formatMonthLabel = (key: string): string => {
  const [year, month] = key.split('-');
  return `${year}年${Number(month)}月`;
};

const NewsSection: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['announcements', 'public'],
    queryFn: announcementsApi.list,
    staleTime: 60_000,
  });

  // 投稿日時 (createdAt: 管理者ページから編集可) でグループ化。バックエンド側で createdAt desc 済み。
  // 注: lucide-react の `Map` アイコンと衝突するため Map クラスは使わずレコードで実装。
  const groups = React.useMemo<{ key: string; items: Announcement[] }[]>(() => {
    if (!data) return [];
    const buckets: Record<string, Announcement[]> = {};
    const order: string[] = [];
    for (const a of data) {
      const k = monthKeyOf(a.createdAt);
      if (!buckets[k]) {
        buckets[k] = [];
        order.push(k);
      }
      buckets[k].push(a);
    }
    return order.map(key => ({ key, items: buckets[key] }));
  }, [data]);

  const handleJump = (key: string) => {
    const el = document.getElementById(`news-${key}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-10">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">
          <Megaphone className="w-3.5 h-3.5" />
          News
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">お知らせ</h2>
        <p className="text-sm text-zinc-500 mt-2">機能追加・不具合修正・イベント情報</p>
      </motion.div>

      {isLoading && (
        <div className="text-zinc-500 text-sm flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm text-center py-12">
          お知らせの取得に失敗しました。
        </div>
      )}
      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-sm text-zinc-500">
          現在お知らせはありません。
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid lg:grid-cols-[180px_1fr] gap-6 lg:gap-10">
          {/* ── サイドバー: 月別ナビ ── */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {/* モバイルでは横スクロールのピル列、lg 以上では縦リスト */}
            <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-2 lg:mb-3">Archive</p>
            <ul className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-visible scrollbar-none -mx-1 px-1 lg:mx-0 lg:px-0">
              {groups.map(g => (
                <li key={g.key} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleJump(g.key)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors text-left whitespace-nowrap"
                  >
                    <span>{formatMonthLabel(g.key)}</span>
                    <span className="text-[10px] text-zinc-600">{g.items.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* ── メイン: 月セクション + プルダウン式の各お知らせ ── */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="min-w-0 space-y-8">
            {groups.map(g => (
              <section key={g.key} id={`news-${g.key}`} className="scroll-mt-24">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 sticky top-14 bg-zinc-950/80 backdrop-blur-sm py-2 z-10 border-b border-zinc-800/60">
                  {formatMonthLabel(g.key)}
                </h3>
                <div className="space-y-3">
                  {g.items.map(a => (
                    <AnnouncementItem key={a.id} announcement={a} collapsible />
                  ))}
                </div>
              </section>
            ))}
          </motion.div>
        </div>
      )}
    </section>
  );
};

// ─── SYSTEM セクション ─────────────────────────────────────────────────────────

const SystemDetailBlock: React.FC<{ detail: typeof SYSTEM_DETAILS[0]; flip: boolean }> = ({ detail, flip }) => {
  const Icon = detail.icon;
  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      className="max-w-6xl mx-auto px-6 py-12 sm:py-16"
    >
      <div className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-start gap-10 lg:gap-16`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Icon size={16} className="text-violet-300" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">{detail.tag}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight mb-3">{detail.title}</h3>
          <p className="text-zinc-400 leading-relaxed mb-6">{detail.summary}</p>

          <ul className="space-y-4">
            {detail.points.map(p => {
              const PIcon = p.icon;
              return (
                <li key={p.label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50">
                    <PIcon size={14} className="text-zinc-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 mb-0.5">{p.label}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <img src={detail.image} alt={detail.tag} className="w-full rounded-2xl shadow-2xl border border-zinc-800" />
        </div>
      </div>
    </motion.article>
  );
};

const SystemSection: React.FC = () => (
  <section>
    <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 sm:pt-20 text-center">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">System</p>
      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">詳細機能</h2>
      <p className="text-sm text-zinc-500 mt-2 max-w-2xl mx-auto">
        各機能が実際にどう動くか、何ができるかを掘り下げて解説します。
      </p>
    </div>
    <div className="border-t border-zinc-800/60">
      {SYSTEM_DETAILS.map((d, i) => (
        <div key={d.tag} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40'}>
          <SystemDetailBlock detail={d} flip={i % 2 === 1} />
        </div>
      ))}
    </div>
  </section>
);

// ─── TEMPLATE セクション ───────────────────────────────────────────────────────

const TemplateSummaryCard: React.FC<{ template: EventTemplateSummary }> = ({ template }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 hover:border-zinc-600 transition-colors">
    <div className="flex items-start gap-2 mb-2">
      <FileJson size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100 truncate">{template.name}</p>
        {template.date && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
            <Calendar size={11} />
            <span>{template.date}</span>
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3 text-xs text-zinc-500 pl-[23px]">
      <span className="inline-flex items-center gap-1">
        <MapPin size={11} />
        {template.hallCount} ホール
      </span>
      {template.circleCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <Users2 size={11} />
          {template.circleCount} サークル
        </span>
      )}
    </div>
    {template.halls.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1 pl-[23px]">
        {template.halls.slice(0, 8).map(h => (
          <span key={h} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{h}</span>
        ))}
        {template.halls.length > 8 && (
          <span className="px-1.5 py-0.5 text-[10px] text-zinc-600">+{template.halls.length - 8}</span>
        )}
      </div>
    )}
  </div>
);

const TemplateSection: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eventTemplates', 'public'],
    queryFn: eventTemplatesApi.listPublic,
    staleTime: 60_000,
  });

  return (
    <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-10">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Template</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">公開テンプレート</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-2xl mx-auto">
          ユーザーが申請し運営が承認した即売会テンプレートです。
          アプリの「テンプレートから読み込む」を選ぶと、イベント名・日程・会場マップがまとめて取り込まれます。
        </p>
      </motion.div>

      {isLoading && (
        <div className="text-zinc-500 text-sm flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm text-center py-12">
          テンプレート一覧の取得に失敗しました。
        </div>
      )}
      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-sm text-zinc-500">
          まだ承認済みのテンプレートがありません。
          <br />
          <span className="text-xs text-zinc-600 mt-2 inline-block">
            ユーザーから申請があり、運営が承認するとここに掲載されます。
          </span>
        </div>
      )}
      {data && data.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {data.map(t => <TemplateSummaryCard key={t.id} template={t} />)}
        </motion.div>
      )}

      <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-2">自分のイベントを申請する</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          作成済みの即売会は、買い物リストの即売会カードから「テンプレート申請」ボタンで申請できます。
          運営の承認後、ここに掲載されます。
        </p>
        <Link
          to="/"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
        >
          アプリで申請する
          <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  );
};

// ─── FAQ セクション ────────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800 last:border-none">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-5 text-left gap-4"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        {open
          ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" />
          : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />
        }
      </button>
      {open && <p className="text-sm text-zinc-400 pb-5 leading-relaxed">{a}</p>}
    </div>
  );
};

const FaqSection: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['faqs', 'public'],
    queryFn: faqsApi.list,
    staleTime: 60_000,
  });

  return (
    <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-10">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">FAQ</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">よくある質問</h2>
      </motion.div>

      {isLoading && (
        <div className="text-zinc-500 text-sm flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm text-center py-12">
          FAQ の取得に失敗しました。
        </div>
      )}
      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-sm text-zinc-500">
          FAQ がまだ登録されていません。
        </div>
      )}
      {data && data.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-6">
            {data.map(item => <FaqItem key={item.id} q={item.question} a={item.answer} />)}
          </div>
        </motion.div>
      )}
    </section>
  );
};

// ─── CONTACT セクション ────────────────────────────────────────────────────────

const ContactSection: React.FC = () => {
  const isPlaceholder = CONTACT_FORM_URL.includes('REPLACE_WITH_FORM_ID');
  return (
    <section className="max-w-2xl mx-auto px-6 py-16 sm:py-20">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-10">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Contact</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">お問い合わせ</h2>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            ご意見・ご要望・不具合のご報告は、下記の Google フォームよりお寄せください。
            返信が必要な場合はメールアドレスもご記入ください。
          </p>

          <ul className="text-xs text-zinc-500 space-y-1.5 leading-relaxed border-l-2 border-zinc-800 pl-3">
            <li>・お返事には数日〜数週間お時間をいただく場合があります。</li>
            <li>・サポートはベストエフォートとなります。</li>
            <li>・公序良俗に反する内容・営業目的のご連絡には対応いたしかねます。</li>
          </ul>

          {isPlaceholder ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              <strong>準備中:</strong> お問い合わせフォームを準備中です。リンクが有効になるまで少々お待ちください。
            </div>
          ) : (
            <a
              href={CONTACT_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              <Mail size={15} />
              お問い合わせフォームへ
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Footer ────────────────────────────────────────────────────────────────────

const Footer: React.FC = () => (
  <footer className="border-t border-zinc-800/60 py-8">
    <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <img src="/doujin-pp.png" alt="同人++" className="w-5 h-5 rounded-md" />
        <span
          className="text-zinc-500"
          style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400 }}
        >
          同人++
        </span>
      </div>
      <p className="text-xs text-zinc-600">© 2026 同人++ — 同人活動をもっとスマートに</p>
    </div>
  </footer>
);

// ─── LandingPage ───────────────────────────────────────────────────────────────

const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);

const LandingPage: React.FC = () => {
  const [section, setSection] = useState<Section>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return isSection(hash) ? hash : 'home';
  });

  // section 変化時に URL ハッシュを同期する。home はクリーンに保つため空にする。
  useEffect(() => {
    const target = section === 'home' ? '' : `#${section}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${target}`);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [section]);

  // ブラウザバック / 直リンクの hash 変更を反映
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      setSection(isSection(h) ? h : 'home');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden flex flex-col">
      <TopNav section={section} onChange={setSection} />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {section === 'home' && <HomeSection />}
            {section === 'news' && <NewsSection />}
            {section === 'system' && <SystemSection />}
            {section === 'template' && <TemplateSection />}
            {section === 'faq' && <FaqSection />}
            {section === 'contact' && <ContactSection />}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
