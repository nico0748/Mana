import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  onClose?: () => void;
}

export function RegisterModal({ onClose }: Props) {
  const { register, login } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) return;
    setError('');
    setIsSubmitting(true);
    try {
      await register(displayName.trim());
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!tokenInput.trim()) return;
    setError('');
    setIsSubmitting(true);
    try {
      await login(tokenInput.trim());
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-100 mb-1">
          {mode === 'register' ? 'ユーザー登録' : 'トークンでログイン'}
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          {mode === 'register'
            ? '買い物リスト共有に使う表示名を入力してください'
            : '別デバイスのトークンを入力してください'}
        </p>

        {error && (
          <p className="text-sm text-red-400 mb-3">{error}</p>
        )}

        {mode === 'register' ? (
          <div className="space-y-3">
            <Input
              placeholder="表示名（最大30文字）"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />
            <Button
              onClick={handleRegister}
              isLoading={isSubmitting}
              disabled={!displayName.trim() || isSubmitting}
              className="w-full"
            >
              登録する
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="トークン（UUID）"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button
              onClick={handleLogin}
              isLoading={isSubmitting}
              disabled={!tokenInput.trim() || isSubmitting}
              className="w-full"
            >
              ログイン
            </Button>
          </div>
        )}

        <button
          className="mt-4 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full text-center"
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
        >
          {mode === 'register' ? '既にトークンを持っている方はこちら' : '新規登録はこちら'}
        </button>
      </div>
    </div>
  );
}
