import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Crown, ExternalLink, Check } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { billingApi, type ResourceKey } from '../lib/api';
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

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await billingApi.portal();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message ?? 'カスタマーポータルの起動に失敗しました');
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
      </div>
    </div>
  );
};

export default AccountPage;
