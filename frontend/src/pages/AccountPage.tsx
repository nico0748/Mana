import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Crown, ExternalLink, Check, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useAuth } from '../contexts/AuthContext';
import { billingApi, meApi, ApiError, type ResourceKey } from '../lib/api';
import { Button } from '../components/ui/Button';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  books: '蔵書',
  circles: 'サークル',
  events: 'イベント',
  distributions: '頒布物',
  venueMaps: '会場マップ',
};

const formatDate = (ms: number | null): string => {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
};

const UsageBar: React.FC<{ resource: ResourceKey; usage: number; limit: number | null }> = ({ resource, usage, limit }) => {
  const pct = limit === null ? 0 : Math.min(100, (usage / limit) * 100);
  const danger = limit !== null && pct >= 90;
  const warn = limit !== null && pct >= 75 && !danger;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-300">{RESOURCE_LABELS[resource]}</span>
        <span className="font-mono text-xs text-zinc-400">
          {usage}{limit !== null && ` / ${limit}`}
          {limit === null && <span className="text-violet-300 ml-1">(無制限)</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            danger ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${limit === null ? 100 : pct}%` }}
        />
      </div>
    </div>
  );
};

const AccountPage: React.FC = () => {
  const { data, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user: authUser, logout } = useAuth();

  // Stripe からの戻りリンクで status クエリを処理
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'success') {
      setToast('アップグレードを受け付けました。プラン情報を反映しています…');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      const t = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        setToast('Pro プランへようこそ！');
        setTimeout(() => setToast(null), 4000);
      }, 2500);
      navigate('/account', { replace: true });
      return () => clearTimeout(t);
    }
    if (status === 'canceled') {
      setToast('決済をキャンセルしました。');
      navigate('/account', { replace: true });
      setTimeout(() => setToast(null), 3500);
    }
  }, [location.search, queryClient, navigate]);

  // 削除確認に使う名前。displayName を最優先、空なら email にフォールバック。
  // 比較は NFC 正規化で行う（半角/全角・合成文字違いで誤判定されない・なりすまし耐性も上がる）。
  const normalize = (s: string) => s.normalize('NFC').trim();
  const confirmTargetRaw = authUser?.displayName || data?.user?.email || '';
  const confirmTarget = normalize(confirmTargetRaw);

  const handleDeleteAccount = async () => {
    if (!confirmTarget || normalize(deleteInput) !== confirmTarget) {
      setDeleteError('入力内容が一致しません。');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await meApi.deleteAccount(normalize(deleteInput));
      // Firebase 側はバックエンドが削除済み。ローカルの認証情報を消してログイン画面へ。
      try { await logout(); } catch { /* noop */ }
      queryClient.clear();
      navigate('/', { replace: true });
    } catch (e: unknown) {
      let msg = 'アカウント削除に失敗しました。時間をおいて再度お試しください。';
      if (e instanceof ApiError) {
        const code = e.payload?.error;
        if (code === 'confirmation_mismatch') msg = '入力内容が一致しません。';
        else if (code === 'confirm_required') msg = '確認用の入力が必要です。';
        else if (code === 'confirmation_target_missing') msg = '確認用のユーザー名・メールが取得できませんでした。';
      }
      setDeleteError(msg);
      setDeleting(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billingApi.portal();
      window.location.href = url;
    } catch (e: unknown) {
      // バックエンドの生のメッセージはそのまま表示せず、エラーコードからユーザー向け文言にマップする。
      let msg = 'カスタマーポータルの起動に失敗しました。時間をおいて再度お試しください。';
      if (e instanceof ApiError) {
        const code = e.payload?.error;
        if (code === 'billing_unavailable') {
          msg = '決済機能は現在ご利用いただけません。お手数ですが時間をおいて再度お試しください。';
        } else if (code === 'no_customer') {
          msg = 'まだ Pro プランの決済情報が登録されていません。先に Pro プランへお申し込みください。';
        }
      }
      alert(msg);
      setPortalLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

  const { user, limits, usage } = data;
  const isPro = user.plan === 'pro';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>

        <div>
          <h1 className="text-2xl font-bold mb-1">アカウント・プラン</h1>
          <p className="text-sm text-zinc-500">{user.email ?? 'メール未設定'}</p>
        </div>

        {user.role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 ring-1 ring-amber-500/40 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-200">管理者画面</div>
                <div className="text-xs text-zinc-500">ユーザー管理・Pro付与・監査ログ</div>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-zinc-500 rotate-180" />
          </Link>
        )}

        {/* プラン状態カード */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">現在のプラン</h2>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-xs font-bold">
                    <Crown className="w-3 h-3" />
                    Pro
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold">Free</span>
                )}
              </div>
              {isPro ? (
                <div className="text-sm text-zinc-400 space-y-0.5">
                  <p>
                    {user.planInterval === 'yearly' ? '年額 ¥4,800' : '月額 ¥480'}
                    {user.planStatus !== 'active' && user.planStatus !== 'trialing' && (
                      <span className="ml-2 text-amber-400">({user.planStatus})</span>
                    )}
                  </p>
                  {user.cancelAtPeriodEnd ? (
                    <p className="text-amber-400">
                      {formatDate(user.planExpiresAt)} に Free プランへ戻ります
                    </p>
                  ) : (
                    <p>次回更新日: {formatDate(user.planExpiresAt)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  Pro プランは現在準備中です。リリースまでもう少々お待ちください。
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {isPro ? (
              <Button
                variant="outline"
                onClick={handlePortal}
                isLoading={portalLoading}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                お支払い方法・解約
              </Button>
            ) : (
              <Button
                disabled
                className="flex-1 bg-zinc-800 text-zinc-500 cursor-not-allowed"
              >
                <Crown className="w-4 h-4 mr-2" />
                Pro プラン（近日公開）
              </Button>
            )}
          </div>
        </section>

        {/* 使用状況カード */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-bold mb-4">使用状況</h2>
          <div className="space-y-4">
            {(Object.keys(RESOURCE_LABELS) as ResourceKey[]).map(key => (
              <UsageBar key={key} resource={key} usage={usage[key]} limit={limits[key]} />
            ))}
          </div>
        </section>

        {/* Pro 機能一覧 */}
        {!isPro && (
          <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/5 to-zinc-900 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-violet-300" />
              Pro プランの特典
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Coming Soon
              </span>
            </h2>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />蔵書・サークル・イベントすべて無制限</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />頒布物・会場マップも無制限</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />今後追加される Pro 限定機能</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-violet-400 mt-0.5" />いつでもキャンセル可能</li>
            </ul>
          </section>
        )}

        {/* Danger zone: アカウント削除 */}
        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <h2 className="text-base font-bold mb-2 flex items-center gap-2 text-red-300">
            <AlertTriangle className="w-5 h-5" />
            アカウントの削除
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            アカウントを削除すると、登録した蔵書・サークル・即売会・会場マップ・頒布物データはすべて完全に削除され、復元できません。
            Pro プランをご利用中の場合は、削除に先立って自動的にサブスクリプションをキャンセルします。
          </p>
          <Button
            variant="outline"
            onClick={() => { setDeleteInput(''); setDeleteError(null); setDeleteOpen(true); }}
            className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            アカウントを削除する
          </Button>
        </section>
      </div>

      {/* ── 削除確認モーダル ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-semibold">アカウントの削除</h3>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              この操作は <strong className="text-red-300">取り消せません</strong>。以下のデータが削除されます:
            </p>

            <ul className="text-xs text-zinc-400 space-y-0.5 bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
              <li>・蔵書 {usage.books} 冊</li>
              <li>・サークル {usage.circles} 件</li>
              <li>・即売会 {usage.events} 件</li>
              <li>・会場マップ {usage.venueMaps} 件</li>
              <li>・頒布物 {usage.distributions} 件</li>
              <li>・アカウント情報・ログイン手段</li>
              {isPro && <li className="text-amber-300">・Pro プランのサブスクリプション（自動キャンセル）</li>}
            </ul>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                確認のため、ご自身の<strong className="text-zinc-200">{authUser?.displayName?.trim() ? 'ユーザー名' : 'メールアドレス'}</strong>「
                <span className="text-zinc-100 font-mono">{confirmTarget || '(未設定)'}</span>
                」を入力してください
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(null); }}
                disabled={deleting}
                autoFocus
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                placeholder={confirmTarget}
              />
            </div>

            {deleteError && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                キャンセル
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDeleteAccount}
                isLoading={deleting}
                disabled={normalize(deleteInput) !== confirmTarget || !confirmTarget}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                完全に削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
