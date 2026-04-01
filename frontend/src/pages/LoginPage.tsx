import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

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

// ─── 利用規約スクロールボックス ──────────────────────────────────────────────

const TermsBox: React.FC<{ onScrolled: () => void; scrolled: boolean }> = ({ onScrolled, scrolled }) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrolled) return;
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (atBottom) onScrolled();
  };

  return (
    <div
      className="h-32 overflow-y-auto bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap"
      onScroll={handleScroll}
    >
      {TERMS_TEXT}
    </div>
  );
};

// ─── 初回ソーシャルログイン利用規約モーダル ──────────────────────────────────

interface SocialTermsModalProps {
  onAgree: () => void;
  onCancel: () => void;
}

const SocialTermsModal: React.FC<SocialTermsModalProps> = ({ onAgree, onCancel }) => {
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await auth.currentUser?.delete().catch(() => {});
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 mb-1">利用規約への同意</h2>
          <p className="text-xs text-zinc-500">ご利用開始前に利用規約をご確認ください</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-zinc-400">
            利用規約
            {!scrolled && (
              <span className="ml-2 text-xs text-zinc-600">（最後までスクロールしてください）</span>
            )}
          </label>
          <TermsBox onScrolled={() => setScrolled(true)} scrolled={scrolled} />
          <label className={`flex items-center gap-2.5 ${scrolled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            <input
              type="checkbox"
              checked={agreed}
              disabled={!scrolled}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded accent-zinc-400"
            />
            <span className="text-sm text-zinc-300">利用規約に同意する</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={onAgree}
            disabled={!agreed}
            className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            同意して開始
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ソーシャルログインボタン ───────────────────────────────────────────────

interface SocialButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ onClick, disabled, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {icon}
    {label}
  </button>
);

// SVG アイコン
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// ─── LoginPage ─────────────────────────────────────────────────────────────

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // ソーシャル初回登録時の利用規約同意モーダル
  const [showSocialTerms, setShowSocialTerms] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setTermsScrolled(false);
    setTermsAgreed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && !termsAgreed) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':       'メールアドレスが見つかりません',
        'auth/wrong-password':       'パスワードが間違っています',
        'auth/invalid-credential':   'メールアドレスまたはパスワードが間違っています',
        'auth/email-already-in-use': 'このメールアドレスは既に使われています',
        'auth/weak-password':        'パスワードは6文字以上にしてください',
        'auth/invalid-email':        'メールアドレスの形式が正しくありません',
      };
      setError(msg[err.code] ?? 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // ソーシャルログイン共通ハンドラ
  const handleSocialLogin = async (credential: UserCredential) => {
    const isNew = getAdditionalUserInfo(credential)?.isNewUser ?? false;
    if (isNew) {
      // 初回登録時 → 利用規約同意モーダルを表示（AuthContextが先にuserをセットするため、
      // signOutして再度確認させる形にする）
      setShowSocialTerms(true);
    }
    // 既存ユーザーは何もしなくてよい（AuthContextが自動でログイン状態にする）
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleSocialLogin(result);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Googleログインに失敗しました');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const canSubmit = mode === 'login' || termsAgreed;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {showSocialTerms && (
        <SocialTermsModal
          onAgree={() => setShowSocialTerms(false)}
          onCancel={() => setShowSocialTerms(false)}
        />
      )}

      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/doujin-pp.png" alt="同人++" className="w-14 h-14 rounded-xl shadow-lg" />
            <span
              className="text-4xl text-zinc-100"
              style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400 }}
            >
              同人++
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            {mode === 'login' ? 'ログインして続ける' : 'アカウントを作成'}
          </p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          {/* ─ ソーシャルログイン ─ */}
          <SocialButton
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            icon={googleLoading
              ? <span className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-zinc-300 animate-spin" />
              : <GoogleIcon />
            }
            label="Googleで続ける"
          />

          {/* ─ 区切り ─ */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">または</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* ─ Email / Password フォーム ─ */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder={mode === 'register' ? '6文字以上' : '••••••••'}
              />
            </div>

            {/* 利用規約（登録時のみ） */}
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="block text-sm text-zinc-400">
                  利用規約
                  {!termsScrolled && (
                    <span className="ml-2 text-xs text-zinc-600">（最後までスクロールしてください）</span>
                  )}
                </label>
                <TermsBox onScrolled={() => setTermsScrolled(true)} scrolled={termsScrolled} />
                <label className={`flex items-center gap-2.5 ${termsScrolled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    disabled={!termsScrolled}
                    onChange={e => setTermsAgreed(e.target.checked)}
                    className="w-4 h-4 rounded accent-zinc-400"
                  />
                  <span className="text-sm text-zinc-300">
                    利用規約に同意する
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading || !canSubmit}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {mode === 'login'
                ? 'アカウントをお持ちでない方はこちら'
                : 'すでにアカウントをお持ちの方はこちら'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
