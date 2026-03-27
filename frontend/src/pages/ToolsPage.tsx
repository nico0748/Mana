import React, { useState, useRef } from 'react';
import {
  Sun, Moon, ImageIcon, Trash2, Type, Zap, ZapOff,
  User, Mail, Calendar, Shield,
  ChevronDown, ChevronUp, FileText,
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

// ── LegalSection コンポーネント ─────────────────────────────────────────────

interface LegalSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string;
}

const LegalSection: React.FC<LegalSectionProps> = ({ title, icon, content }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-zinc-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-96 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
};

// ── ToolsPage ───────────────────────────────────────────────────────────────

const ToolsPage: React.FC = () => {
  const { settings, update, reset } = useAppSettings();
  const { user } = useAuth();
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

  const createdAt = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const lastSignIn = user?.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const providers = user?.providerData.map(p => {
    if (p.providerId === 'google.com') return 'Google';
    if (p.providerId === 'password') return 'メール / パスワード';
    return p.providerId;
  }) ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      {/* アカウント情報 */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">アカウント情報</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                <User className="w-6 h-6 text-zinc-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {user?.displayName ?? '名前未設定'}
              </p>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">メールアドレス</p>
                <p className="text-sm text-zinc-200 break-all">{user?.email ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">ログイン方法</p>
                <p className="text-sm text-zinc-200">
                  {providers.length > 0 ? providers.join(' / ') : '—'}
                </p>
              </div>
            </div>

            {createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">アカウント作成日</p>
                  <p className="text-sm text-zinc-200">{createdAt}</p>
                </div>
              </div>
            )}

            {lastSignIn && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">最終ログイン</p>
                  <p className="text-sm text-zinc-200">{lastSignIn}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">ユーザー ID</p>
                <p className="text-xs text-zinc-500 font-mono break-all">{user?.uid ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 環境設定 */}
      <section className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">環境設定</h2>
          <button
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            リセット
          </button>
        </div>

        <div className="divide-y divide-zinc-800">

          {/* テーマ */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-200">テーマ</p>
              <p className="text-xs text-zinc-500 mt-0.5">ダークモード / ライトモード</p>
            </div>
            <button
              onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}
            >
              {settings.theme === 'dark'
                ? <><Moon className="w-3.5 h-3.5" /> ダーク</>
                : <><Sun className="w-3.5 h-3.5" /> ライト</>
              }
            </button>
          </div>

          {/* 背景画像 */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-zinc-200">背景画像</p>
                <p className="text-xs text-zinc-500 mt-0.5">アプリの背景に画像を設定</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bgImageRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  選択
                </button>
                {settings.backgroundImageDataUrl && (
                  <button
                    onClick={() => update({ backgroundImageDataUrl: null })}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {settings.backgroundImageDataUrl && (
              <div className="space-y-2">
                <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-700">
                  <img
                    src={settings.backgroundImageDataUrl}
                    alt="背景プレビュー"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 flex-shrink-0">不透明度</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={settings.backgroundOpacity}
                    onChange={e => update({ backgroundOpacity: Number(e.target.value) })}
                    className="flex-1 accent-zinc-400"
                  />
                  <span className="text-xs text-zinc-400 w-8 text-right tabular-nums">
                    {settings.backgroundOpacity}%
                  </span>
                </div>
              </div>
            )}

            <input
              ref={bgImageRef}
              type="file"
              accept="image/*"
              onChange={handleBgImageUpload}
              className="hidden"
            />
          </div>

          {/* フォントサイズ */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-200">フォントサイズ</p>
                <p className="text-xs text-zinc-500 mt-0.5">テキストの大きさを変更</p>
              </div>
            </div>
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['normal', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    settings.fontSize === size
                      ? 'bg-zinc-600 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {size === 'normal' ? '標準' : '大'}
                </button>
              ))}
            </div>
          </div>

          {/* アニメーション */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.reduceMotion ? <ZapOff className="w-4 h-4 text-zinc-500" /> : <Zap className="w-4 h-4 text-zinc-500" />}
              <div>
                <p className="text-sm text-zinc-200">アニメーション</p>
                <p className="text-xs text-zinc-500 mt-0.5">画面遷移・アニメーションを削減</p>
              </div>
            </div>
            <button
              onClick={() => update({ reduceMotion: !settings.reduceMotion })}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                settings.reduceMotion ? 'bg-zinc-600' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-zinc-100 rounded-full transition-transform ${
                settings.reduceMotion ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* 法的情報 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">法的情報</h2>
        <LegalSection
          title="利用規約"
          icon={<FileText className="w-4 h-4 text-zinc-500" />}
          content={TERMS_TEXT}
        />
        <LegalSection
          title="プライバシーポリシー"
          icon={<Shield className="w-4 h-4 text-zinc-500" />}
          content={PRIVACY_TEXT}
        />
      </section>

      {/* App info */}
      <section className="text-center text-zinc-600 text-xs space-y-1 pt-2">
        <p className="font-semibold text-zinc-500">同人++</p>
        <p>同人活動管理アプリ</p>
        <p className="text-zinc-700">設定はこのデバイスに保存されます</p>
      </section>
    </div>
  );
};

export default ToolsPage;
