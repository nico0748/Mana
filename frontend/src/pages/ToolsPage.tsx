import React from 'react';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ToolsPage: React.FC = () => {
  const { user } = useAuth();

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
          {/* アバター + 名前 */}
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
            {/* メールアドレス */}
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">メールアドレス</p>
                <p className="text-sm text-zinc-200 break-all">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* ログイン方法 */}
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">ログイン方法</p>
                <p className="text-sm text-zinc-200">
                  {providers.length > 0 ? providers.join(' / ') : '—'}
                </p>
              </div>
            </div>

            {/* アカウント作成日 */}
            {createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">アカウント作成日</p>
                  <p className="text-sm text-zinc-200">{createdAt}</p>
                </div>
              </div>
            )}

            {/* 最終ログイン */}
            {lastSignIn && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">最終ログイン</p>
                  <p className="text-sm text-zinc-200">{lastSignIn}</p>
                </div>
              </div>
            )}

            {/* UID */}
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

      {/* App info */}
      <section className="text-center text-zinc-600 text-xs space-y-1 pt-2">
        <p className="font-semibold text-zinc-500">同人++</p>
        <p>同人活動管理アプリ</p>
        <p className="text-zinc-700">データはすべてこのデバイスに保存されます</p>
      </section>
    </div>
  );
};

export default ToolsPage;
