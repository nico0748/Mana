import React, { useState, useRef } from 'react';
import {
  Settings, Database, Palette, MessageSquare,
  Briefcase, HelpCircle, User,
  ChevronRight, ChevronLeft,
  Sun, Moon, ImageIcon, Trash2, Type, Zap, ZapOff,
  Mail, Calendar, Shield, FileText, ExternalLink, LogOut,
} from 'lucide-react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useAuth } from '../contexts/AuthContext';

// ── 法的情報テキスト ────────────────────────────────────────────────────────

const TERMS_TEXT = `同人++ 利用規約

最終更新日: 2025年1月1日

第1条（適用）
本規約は、同人++（以下「本サービス」）の利用条件を定めるものです。登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。

第2条（利用登録）
登録希望者が本サービスの定める方法によって利用登録を申請し、当方がこれを承認することによって、利用登録が完了するものとします。

第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
・法令または公序良俗に違反する行為
・犯罪行為に関連する行為
・本サービスのサーバーまたはネットワークに過度な負荷をかける行為
・他のユーザーに関する個人情報等を収集または蓄積する行為
・不正アクセスをし、またはこれを試みる行為
・他のユーザーに成りすます行為
・本サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
・その他、当方が不適切と判断する行為

第4条（本サービスの提供の停止等）
当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
・本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
・地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
・その他、当方が本サービスの提供が困難と判断した場合

第5条（免責事項）
当方は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。

第6条（プライバシー）
本サービスはユーザーのデータを適切に管理します。詳細はプライバシーポリシーをご確認ください。

第7条（規約の変更）
当方は必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。

以上`;

const PRIVACY_TEXT = `同人++ プライバシーポリシー

最終更新日: 2025年1月1日

第1条（個人情報の収集）
本サービスでは、利用登録の際にメールアドレスを収集します。また、Firebase Authentication を通じてアカウント情報を管理します。

第2条（個人情報の利用目的）
収集した個人情報は、以下の目的で利用します。
・本サービスの提供・運営のため
・ユーザーからのお問い合わせに回答するため
・不正行為の防止および安全確保のため

第3条（個人情報の第三者提供）
当方は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
・法令に基づく場合
・人の生命・身体または財産の保護のために必要がある場合

第4条（データの保存）
ユーザーが入力した蔵書データ・買い物リストなどのコンテンツはサーバーに保存されます。アカウント削除時にはこれらのデータも削除されます。

第5条（セキュリティ）
当方は、個人情報の漏洩、滅失または毀損の防止その他個人情報の安全管理のために必要かつ適切な措置を講じます。

第6条（プライバシーポリシーの変更）
当方は、必要に応じてプライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点で効力を生じるものとします。

第7条（お問い合わせ）
本ポリシーに関するお問い合わせは、本サービス内のお問い合わせ窓口よりご連絡ください。

以上`;

// ── 型定義 ──────────────────────────────────────────────────────────────────

type CategoryId = 'general' | 'personalize' | 'data' | 'feedback' | 'service' | 'help' | 'account';

interface Category {
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'general',     label: '一般',           icon: <Settings      className="w-[18px] h-[18px]" /> },
  { id: 'personalize', label: 'パーソナライズ', icon: <Palette       className="w-[18px] h-[18px]" /> },
  { id: 'data',        label: 'データ',         icon: <Database      className="w-[18px] h-[18px]" /> },
  { id: 'feedback',    label: 'フィードバック', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
  { id: 'service',     label: 'サービス',       icon: <Briefcase     className="w-[18px] h-[18px]" /> },
  { id: 'help',        label: 'ヘルプ',         icon: <HelpCircle    className="w-[18px] h-[18px]" /> },
  { id: 'account',     label: 'アカウント',     icon: <User          className="w-[18px] h-[18px]" /> },
];

// ── 共通 UI パーツ ───────────────────────────────────────────────────────────

const SettingRow: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}> = ({ icon, label, value, onClick, right, danger }) => (
  <button
    onClick={onClick}
    disabled={!onClick && !right}
    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
      onClick ? 'hover:bg-zinc-800/60 cursor-pointer' : 'cursor-default'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon && <span className={danger ? 'text-red-400' : 'text-zinc-500'}>{icon}</span>}
      <span className={`text-sm ${danger ? 'text-red-400' : 'text-zinc-200'}`}>{label}</span>
    </div>
    {right ?? (
      value !== undefined && (
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="text-sm">{value}</span>
          {onClick && <ChevronRight className="w-4 h-4" />}
        </div>
      )
    )}
  </button>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-4 pt-5 pb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{children}</p>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-4 rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
    {children}
  </div>
);

// ── カテゴリ別コンテンツ ─────────────────────────────────────────────────────

const GeneralContent: React.FC<{
  settings: ReturnType<typeof useAppSettings>['settings'];
  update: ReturnType<typeof useAppSettings>['update'];
}> = ({ settings, update }) => (
  <div className="pb-6">
    <SectionTitle>外観</SectionTitle>
    <Card>
      <SettingRow
        icon={settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        label="テーマ"
        value={settings.theme === 'dark' ? 'ダーク' : 'ライト'}
        onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      />
    </Card>
  </div>
);

const PersonalizeContent: React.FC<{
  settings: ReturnType<typeof useAppSettings>['settings'];
  update: ReturnType<typeof useAppSettings>['update'];
  reset: ReturnType<typeof useAppSettings>['reset'];
}> = ({ settings, update, reset }) => {
  const bgImageRef = useRef<HTMLInputElement>(null);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ backgroundImageDataUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    if (bgImageRef.current) bgImageRef.current.value = '';
  };

  return (
    <div className="pb-6">
      <SectionTitle>背景</SectionTitle>
      <Card>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">背景画像</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.backgroundImageDataUrl && (
                <button
                  onClick={() => update({ backgroundImageDataUrl: null })}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => bgImageRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              >
                選択
              </button>
            </div>
          </div>
          {settings.backgroundImageDataUrl && (
            <div className="space-y-2">
              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-700">
                <img src={settings.backgroundImageDataUrl} alt="背景プレビュー" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 flex-shrink-0">不透明度</span>
                <input
                  type="range" min={5} max={100}
                  value={settings.backgroundOpacity}
                  onChange={e => update({ backgroundOpacity: Number(e.target.value) })}
                  className="flex-1 accent-zinc-400"
                />
                <span className="text-xs text-zinc-400 w-8 text-right tabular-nums">{settings.backgroundOpacity}%</span>
              </div>
            </div>
          )}
          <input ref={bgImageRef} type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
        </div>
      </Card>

      <SectionTitle>テキスト</SectionTitle>
      <Card>
        <SettingRow
          icon={<Type className="w-4 h-4" />}
          label="フォントサイズ"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['normal', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    settings.fontSize === size ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {size === 'normal' ? '標準' : '大'}
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <SectionTitle>アクセシビリティ</SectionTitle>
      <Card>
        <SettingRow
          icon={settings.reduceMotion ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          label="アニメーション削減"
          right={
            <button
              onClick={() => update({ reduceMotion: !settings.reduceMotion })}
              className={`relative w-10 h-6 rounded-full transition-colors ${settings.reduceMotion ? 'bg-zinc-500' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-zinc-100 rounded-full transition-transform ${settings.reduceMotion ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          }
        />
      </Card>

      <div className="px-4 pt-5">
        <button
          onClick={reset}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          設定をリセット
        </button>
      </div>
    </div>
  );
};

const DataContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>エクスポート / インポート</SectionTitle>
    <Card>
      <SettingRow
        icon={<Database className="w-4 h-4" />}
        label="蔵書データのエクスポート・インポート"
        value="本棚ページ"
        onClick={() => window.location.assign('/')}
      />
      <SettingRow
        icon={<Database className="w-4 h-4" />}
        label="買い物リストのエクスポート・インポート"
        value="買い物ページ"
        onClick={() => window.location.assign('/shopping')}
      />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">各ページのサイドバーから JSON / CSV / Excel 形式でデータを管理できます。</p>
  </div>
);

const FeedbackContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>フィードバック</SectionTitle>
    <Card>
      <SettingRow
        icon={<ExternalLink className="w-4 h-4" />}
        label="フィードバックを送る"
        value="Google フォーム"
        onClick={() => window.open('https://forms.google.com', '_blank')}
      />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">ご意見・ご要望・バグ報告はフォームからお送りください。</p>
  </div>
);

const ServiceContent: React.FC = () => {
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

  return (
    <div className="pb-6">
      <SectionTitle>法的情報</SectionTitle>
      <Card>
        <div>
          <button
            onClick={() => setOpenTerms(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">利用規約</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${openTerms ? 'rotate-90' : ''}`} />
          </button>
          {openTerms && (
            <div className="px-4 pb-4 border-t border-zinc-800">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-80 overflow-y-auto">{TERMS_TEXT}</pre>
            </div>
          )}
        </div>
        <div>
          <button
            onClick={() => setOpenPrivacy(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">プライバシーポリシー</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${openPrivacy ? 'rotate-90' : ''}`} />
          </button>
          {openPrivacy && (
            <div className="px-4 pb-4 border-t border-zinc-800">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-80 overflow-y-auto">{PRIVACY_TEXT}</pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const HelpContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>アプリ情報</SectionTitle>
    <Card>
      <SettingRow label="アプリ名" value="同人++" />
      <SettingRow label="説明" value="同人活動管理アプリ" />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">設定はこのデバイスに保存されます。</p>
  </div>
);

const AccountContent: React.FC<{ user: ReturnType<typeof useAuth>['user']; logout: ReturnType<typeof useAuth>['logout'] }> = ({ user, logout }) => {
  const { refreshUser } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? '');
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(user, { displayName: nameInput.trim() });
      await refreshUser();
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  };

  const createdAt = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const lastSignIn = user?.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const providers = user?.providerData.map(p => {
    if (p.providerId === 'google.com') return 'Google';
    if (p.providerId === 'password') return 'メール / パスワード';
    return p.providerId;
  }) ?? [];

  return (
    <div className="pb-6">
      <SectionTitle>プロフィール</SectionTitle>
      <div className="mx-4 rounded-xl border border-zinc-800 p-4 flex items-center gap-3">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-12 h-12 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{user?.displayName ?? '名前未設定'}</p>
          <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
        </div>
      </div>

      <SectionTitle>詳細情報</SectionTitle>
      <Card>
        {/* ユーザー名（インライン編集） */}
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-sm text-zinc-200">ユーザー名</span>
            </div>
            {!editingName ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 truncate max-w-[140px]">{user?.displayName ?? '未設定'}</span>
                <button
                  onClick={() => { setNameInput(user?.displayName ?? ''); setEditingName(true); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  変更
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="w-36 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
                <button
                  onClick={handleSaveName}
                  disabled={!nameInput.trim() || nameSaving}
                  className="text-xs text-zinc-900 bg-zinc-100 hover:bg-white px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {nameSaving ? '…' : '保存'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
        <SettingRow icon={<Mail className="w-4 h-4" />} label="メールアドレス" value={user?.email ?? '—'} />
        <SettingRow icon={<Shield className="w-4 h-4" />} label="ログイン方法" value={providers.length > 0 ? providers.join(' / ') : '—'} />
        {createdAt && <SettingRow icon={<Calendar className="w-4 h-4" />} label="アカウント作成日" value={createdAt} />}
        {lastSignIn && <SettingRow icon={<Calendar className="w-4 h-4" />} label="最終ログイン" value={lastSignIn} />}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 mb-0.5">
            <Shield className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-200">ユーザーID</span>
          </div>
          <p className="text-xs text-zinc-500 font-mono break-all pl-7">{user?.uid ?? '—'}</p>
        </div>
      </Card>

      <SectionTitle>セッション</SectionTitle>
      <Card>
        <SettingRow
          icon={<LogOut className="w-4 h-4" />}
          label="ログアウト"
          onClick={logout}
          danger
        />
      </Card>
    </div>
  );
};

// ── ToolsPage ────────────────────────────────────────────────────────────────

const ToolsPage: React.FC = () => {
  const { settings, update, reset } = useAppSettings();
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState<CategoryId>('general');
  // モバイルでカテゴリを選択したかどうか
  const [mobilePanel, setMobilePanel] = useState(false);

  const handleSelect = (id: CategoryId) => {
    setSelected(id);
    setMobilePanel(true);
  };

  const renderContent = () => {
    switch (selected) {
      case 'general':     return <GeneralContent settings={settings} update={update} />;
      case 'personalize': return <PersonalizeContent settings={settings} update={update} reset={reset} />;
      case 'data':        return <DataContent />;
      case 'feedback':    return <FeedbackContent />;
      case 'service':     return <ServiceContent />;
      case 'help':        return <HelpContent />;
      case 'account':     return <AccountContent user={user} logout={logout} />;
    }
  };

  const selectedCategory = categories.find(c => c.id === selected)!;

  const navList = (
    <nav className="py-2">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleSelect(cat.id)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            selected === cat.id
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          }`}
        >
          <span className={selected === cat.id ? 'text-zinc-300' : 'text-zinc-600'}>{cat.icon}</span>
          <span className="text-sm font-medium">{cat.label}</span>
          {/* モバイルのみ: 矢印 */}
          <ChevronRight className="w-4 h-4 ml-auto text-zinc-700 lg:hidden" />
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))]">

      {/* ── 左カテゴリパネル ── */}
      {/* デスクトップ: 常時表示 / モバイル: mobilePanel=false のとき表示 */}
      <aside className={`
        ${mobilePanel ? 'hidden' : 'flex'} lg:flex
        flex-col w-full lg:w-56 flex-shrink-0
        border-r border-zinc-800 bg-zinc-950 overflow-y-auto
      `}>
        <div className="px-4 py-4 border-b border-zinc-800">
          <h1 className="text-base font-semibold text-zinc-200">設定</h1>
        </div>
        {navList}
      </aside>

      {/* ── 右コンテンツパネル ── */}
      {/* デスクトップ: 常時表示 / モバイル: mobilePanel=true のとき表示 */}
      <main className={`
        ${mobilePanel ? 'flex' : 'hidden'} lg:flex
        flex-col flex-1 overflow-y-auto bg-zinc-950
      `}>
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 px-4 py-3.5 border-b border-zinc-800 flex items-center gap-3"
          style={{ background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          {/* モバイルのみ: 戻るボタン */}
          <button
            onClick={() => setMobilePanel(false)}
            className="lg:hidden p-1 -ml-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-zinc-200">{selectedCategory.label}</h2>
        </div>

        {/* コンテンツ */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default ToolsPage;
