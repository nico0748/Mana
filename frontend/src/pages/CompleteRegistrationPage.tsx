import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
  updatePassword,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { PENDING_SIGNUP_EMAIL_KEY } from './LoginPage';

type Phase = 'verifying' | 'need-email' | 'form' | 'submitting' | 'done' | 'error';

const CompleteRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = React.useState<Phase>('verifying');
  const [errorMsg, setErrorMsg] = React.useState('');

  // 入力欄
  const [emailInput, setEmailInput] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');

  // メールリンクから来たかチェック → サインイン
  React.useEffect(() => {
    const url = window.location.href;
    if (!isSignInWithEmailLink(auth, url)) {
      setErrorMsg('無効なリンクです。登録画面から再度メール送信をお試しください。');
      setPhase('error');
      return;
    }

    const stored = window.localStorage.getItem(PENDING_SIGNUP_EMAIL_KEY) ?? '';
    if (!stored) {
      // 別端末でリンクを開いた場合は手動入力で確認
      setPhase('need-email');
      return;
    }
    void runSignIn(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSignIn = async (email: string) => {
    setPhase('verifying');
    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
      const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
      if (!isNew) {
        // 既存ユーザーがメールリンク経由で来た場合はそのままホームへ
        navigate('/', { replace: true });
        return;
      }
      // 表示名がすでに設定されている (極稀) ケースもフォーム表示
      setUsername(result.user.displayName ?? '');
      setPhase('form');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/invalid-action-code': 'リンクの有効期限が切れているか、既に使用されています。再度メールを送信してください。',
        'auth/expired-action-code': 'リンクの有効期限が切れています。再度メールを送信してください。',
        'auth/invalid-email':       'メールアドレスの形式が正しくありません',
      };
      setErrorMsg(msg[err.code] ?? `エラーが発生しました (${err.code})`);
      setPhase('error');
    }
  };

  const handleEmailConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    void runSignIn(emailInput.trim());
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setErrorMsg('セッションが切れました。最初からやり直してください。');
      setPhase('error');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('ユーザー名を入力してください');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('パスワードは 6 文字以上にしてください');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('パスワードが一致しません');
      return;
    }
    setErrorMsg('');
    setPhase('submitting');
    try {
      await updateProfile(auth.currentUser, { displayName: username.trim() });
      await updatePassword(auth.currentUser, password);
      setPhase('done');
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/weak-password':           'パスワードは 6 文字以上にしてください',
        'auth/requires-recent-login':   'セッションが切れました。最初からやり直してください。',
      };
      setErrorMsg(msg[err.code] ?? `エラーが発生しました (${err.code})`);
      setPhase('form');
    }
  };

  // ── 表示 ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/doujin-pp.png" alt="同人++" className="w-14 h-14 rounded-xl shadow-lg" />
            <span className="text-4xl text-zinc-100" style={{ fontFamily: '"Reggae One", system-ui', fontWeight: 400 }}>
              同人++
            </span>
          </div>
          <p className="text-sm text-zinc-500">アカウント登録の完了</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          {phase === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
              <p className="text-sm text-zinc-400">確認中…</p>
            </div>
          )}

          {phase === 'need-email' && (
            <form onSubmit={handleEmailConfirm} className="space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                登録時に入力したメールアドレスを確認のため再入力してください。
              </p>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm rounded-lg transition-colors"
              >
                確認
              </button>
            </form>
          )}

          {(phase === 'form' || phase === 'submitting') && (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                ユーザー名と次回以降のログイン用パスワードを設定してください。
              </p>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">ユーザー名</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={30}
                  required
                  placeholder="アプリ内で表示される名前"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="6文字以上"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">パスワード（確認）</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  required
                  placeholder="同じパスワードを再入力"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </div>
              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={phase === 'submitting'}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === 'submitting' ? '登録中…' : '登録を完了する'}
              </button>
            </form>
          )}

          {phase === 'error' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-left">
                {errorMsg}
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ログイン画面に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteRegistrationPage;
