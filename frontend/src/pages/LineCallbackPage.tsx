import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

const LineCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');

    if (err) {
      setError('LINEログインに失敗しました');
      return;
    }

    if (!token) {
      setError('トークンが取得できませんでした');
      return;
    }

    signInWithCustomToken(auth, token)
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch(() => {
        setError('ログイン処理に失敗しました');
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="text-sm text-zinc-400 hover:text-zinc-200 underline"
          >
            ログインページへ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
        <p className="text-sm text-zinc-500">LINEでログイン中...</p>
      </div>
    </div>
  );
};

export default LineCallbackPage;
