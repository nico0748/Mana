import React, { useRef } from 'react';
import { Sun, Moon, ImageIcon, Trash2, Type, Zap, ZapOff, User, Mail, Calendar, Shield } from 'lucide-react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useAuth } from '../contexts/AuthContext';

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
