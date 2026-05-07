import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Map, ShoppingCart, Settings,
  ChevronDown, ChevronUp, LogIn, ArrowRight, FileJson, Crown, Check, Megaphone,
} from 'lucide-react';
import { announcementsApi } from '../lib/api';
import { AnnouncementItem } from '../components/AnnouncementItem';

// ─── アニメーション設定 ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

// ─── 機能セクションデータ ──────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BookOpen,
    tag: '蔵書管理',
    title: '本棚を、\nデジタルで整理する',
    desc: '商業誌・同人誌をまとめて一元管理。ISBN スキャンで冊子情報を自動取得、タグ・サークル名での絞り込み、所持・貸出・欲しいリストなど5つのステータスで状態を管理できます。CSV・Excel でのインポート/エクスポートにも対応。',
    imageSide: 'right',
    image: '/feature-books.png',
  },
  {
    icon: ShoppingCart,
    tag: '買い物リスト',
    title: 'イベント当日の\n買い物をスマートに',
    desc: '即売会ごとにサークルとアイテムを登録。予算管理・購入ステータスのリアルタイム更新はもちろん、サークルの Twitter/X リンクやメニュー画像も一緒に保存できます。CSV/Excel でのサークルリスト取り込みにも対応。',
    imageSide: 'left',
    image: '/feature-list-to-navi.png',
  },
  {
    icon: Map,
    tag: '会場マップ',
    title: 'マップで把握する\n当日の動き',
    desc: '公式配布のマップ PDF・画像をアップロードして、サークルの場所にピンを立てられます。ナビモードでは効率的な巡回ルートを計画。ホールごとにマップを管理でき、公式テンプレートを読み込めばセットアップは数秒で完了。',
    imageSide: 'right',
    image: '/feature-map.png',
  },
  {
    icon: Settings,
    tag: 'データ管理',
    title: '慣れ親しんだ\nExcel から移行できる',
    desc: 'CSV・Excel・JSON でのインポート/エクスポートに全機能で対応。長年使い続けてきたスプレッドシートのデータをそのまま取り込めます。公式テンプレートを使えば、イベント名・会場・ホール一覧が一発で作成されます。',
    imageSide: 'left',
    image: '/feature-data-to-list.png',
  },
];

// ─── 機能セクション（左右交互） ────────────────────────────────────────────────

const FeatureSection: React.FC<{ feature: typeof FEATURES[0]; index: number }> = ({ feature, index }) => {
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

        {/* テキスト */}
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
          <p className="text-zinc-400 leading-relaxed text-base sm:text-lg">
            {feature.desc}
          </p>
        </div>

        {/* 画像エリア */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <img
            src={feature.image}
            alt={feature.tag}
            className="w-full rounded-2xl shadow-2xl border border-zinc-800"
          />
        </div>
      </div>

      {/* セクション区切り（最終以外） */}
      {index < FEATURES.length - 1 && (
        <div className="mt-16 sm:mt-24 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      )}
    </motion.section>
  );
};

// ─── お知らせセクション ────────────────────────────────────────────────────────

const AnnouncementsSection: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['announcements', 'public'],
    queryFn: announcementsApi.list,
    staleTime: 60_000,
  });

  // 取得失敗・お知らせ無しのときはセクション自体を非表示にする
  if (isLoading || error || !data || data.length === 0) return null;

  return (
    <section className="border-t border-zinc-800/60 bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-10"
        >
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">
            <Megaphone className="w-3.5 h-3.5" />
            News
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">お知らせ</h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="space-y-4"
        >
          {data.map(a => (
            <AnnouncementItem key={a.id} announcement={a} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'テンプレートデータとは？',
    a: '即売会名・日程・ホール一覧を含む JSON ファイルです。アプリ内でインポートすると、即売会とホール一覧が自動で作成され、マップ画像をアップロードするだけですぐ使い始められます。',
  },
  {
    q: 'マップ画像はどこから用意すればよいですか？',
    a: '各即売会の公式サイトで配布されている PDF や画像をお使いください。PDF・JPG・PNG いずれも対応しています。',
  },
  {
    q: 'データはどこに保存されますか？',
    a: 'アカウントに紐づいてクラウドに保存されます。複数デバイスからアクセス可能です。',
  },
  {
    q: '既存の Excel データは使えますか？',
    a: 'はい。CSV・Excel・JSON 形式でのインポートに対応しています。テンプレートファイルをダウンロードして書式を確認できます。',
  },
  {
    q: '無料プランの上限は？',
    a: '蔵書 200 冊、サークル 50、イベント 3 までを無料でご利用いただけます。Pro プラン（月額 ¥480 / 年額 ¥4,800 予定）で無制限になる予定ですが、現在準備中です。',
  },
  {
    q: 'Pro プランはいつ使えるようになりますか？',
    a: 'Pro プランは現在準備中です。リリース時期が決まり次第、お知らせします。それまではすべての方に Free プランの上限内でご利用いただけます。',
  },
];

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
      {open && (
        <p className="text-sm text-zinc-400 pb-5 leading-relaxed">{a}</p>
      )}
    </div>
  );
};

// ─── LandingPage ───────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/doujin-pp.png" alt="同人++" className="w-7 h-7 rounded-lg shadow" />
            <span
              className="text-zinc-100"
              style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400, fontSize: '1.2rem' }}
            >
              同人++
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/templates"
              className="hidden sm:flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <FileJson size={14} />
              テンプレート
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <LogIn size={14} />
              ログイン
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* アプリアイコン + タイトル */}
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
            <Link
              to="/templates"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors border border-zinc-700"
            >
              <FileJson size={16} />
              テンプレートを見る
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── お知らせ ── */}
      <AnnouncementsSection />

      {/* ── 機能紹介（左右交互） ── */}
      <div className="border-t border-zinc-800/60">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.tag}
            className={index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40'}
          >
            <FeatureSection feature={feature} index={index} />
          </div>
        ))}
      </div>

      {/* ── テンプレートへのリンク ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Link
              to="/templates"
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-violet-500/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-violet-500/10 flex-shrink-0">
                  <FileJson size={24} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">Templates</p>
                  <h2 className="text-xl font-bold text-zinc-100 mb-2">公式テンプレート一覧</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    コミケ・コミティアなど主要イベントのテンプレートを配布中。<br className="hidden sm:block" />
                    読み込むだけで即売会・ホール一覧が自動作成されます。
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 group-hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                テンプレートを見る
                <ArrowRight size={15} />
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 料金プラン ── */}
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
            <p className="text-sm text-zinc-400">
              まずは無料で。本気で活用したくなったら Pro へ。
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto"
          >
            {/* Free */}
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

            {/* Pro */}
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

      {/* ── FAQ ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 text-center mb-10">
              よくある質問
            </h2>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-6">
              {FAQ_ITEMS.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative text-center rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-900 p-12 sm:p-16 overflow-hidden"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px]" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
                さっそく使ってみる
              </h2>
              <p className="text-zinc-400 mb-8 text-sm sm:text-base">
                Google アカウントで無料登録できます
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-10 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors text-base"
              >
                <LogIn size={18} />
                ログイン / 新規登録
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
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
          <p className="text-xs text-zinc-600">© 2024 同人++ — 同人活動をもっとスマートに</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
