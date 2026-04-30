import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ShieldCheck, Users, ScrollText, Crown, Search, Loader2, Lock, AlertTriangle,
} from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  adminApi, ApiError,
  type AdminUser, type AdminAuditLogEntry, type AdminStats, type Role,
} from '../lib/api';
import { Button } from '../components/ui/Button';

type Tab = 'dashboard' | 'users' | 'audit';

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// ── Tab nav ──────────────────────────────────────────────────────────────────
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={[
      'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
      active
        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
    ].join(' ')}
  >
    {icon}
    {label}
  </button>
);

// ── Dashboard ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number | string; accent?: string }> = ({
  label, value, accent,
}) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
    <div className="text-xs text-zinc-500 mb-1">{label}</div>
    <div className={`text-3xl font-bold ${accent ?? 'text-zinc-100'}`}>{value}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 text-sm flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
    </div>;
  }
  if (error || !data) {
    return <div className="text-red-400 text-sm">統計情報を取得できませんでした。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="登録ユーザー" value={data.totalUsers} />
        <StatCard label="管理者" value={data.adminCount} accent="text-amber-300" />
        <StatCard label="Pro オーバーライド" value={data.proOverrideCount} accent="text-violet-300" />
        <StatCard label="課金 Pro ユーザー" value={data.paidProCount} accent="text-emerald-300" />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <ScrollText className="w-4 h-4" />
          直近の監査ログ（最新10件）
        </h3>
        {data.recentAuditLog.length === 0 ? (
          <div className="text-zinc-500 text-xs">記録なし</div>
        ) : (
          <ul className="space-y-2 text-xs">
            {data.recentAuditLog.map((log) => (
              <AuditRow key={log.id} log={log} compact />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ── Audit log row ────────────────────────────────────────────────────────────
const AuditRow: React.FC<{ log: AdminAuditLogEntry; compact?: boolean }> = ({ log, compact }) => {
  const before = log.before as { role?: string; proOverride?: boolean } | null;
  const after = log.after as { role?: string; proOverride?: boolean } | null;
  const diff: string[] = [];
  if (before && after) {
    if (before.role !== after.role) diff.push(`role: ${before.role} → ${after.role}`);
    if (before.proOverride !== after.proOverride)
      diff.push(`proOverride: ${before.proOverride} → ${after.proOverride}`);
  }

  return (
    <li className={[
      'rounded-lg border border-zinc-800 bg-zinc-950/40',
      compact ? 'px-3 py-2' : 'px-4 py-3',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-zinc-300">
          <span className="font-mono text-emerald-400">{log.action}</span>
          {log.targetUid && (
            <span className="text-zinc-500">→ <span className="font-mono text-zinc-300">{log.targetUid}</span></span>
          )}
        </div>
        <span className="text-zinc-500 font-mono">{formatDateTime(log.createdAt)}</span>
      </div>
      <div className="mt-1 text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>actor: <span className="font-mono text-zinc-400">{log.actorUid}</span></span>
        {diff.map((d) => <span key={d} className="text-amber-300">{d}</span>)}
      </div>
    </li>
  );
};

// ── Users tab ────────────────────────────────────────────────────────────────
const UsersTab: React.FC<{ currentUid: string }> = ({ currentUid }) => {
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = React.useState<{
    user: AdminUser;
    field: 'role' | 'proOverride';
    next: Role | boolean;
  } | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['admin', 'users', debouncedQ],
    queryFn: ({ pageParam }) => adminApi.listUsers({ q: debouncedQ || undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
  });

  const users = data?.pages.flatMap((p) => p.users) ?? [];

  const mutation = useMutation({
    mutationFn: ({ uid, body }: { uid: string; body: { role?: Role; proOverride?: boolean } }) =>
      adminApi.updateUser(uid, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const confirmChange = async () => {
    if (!pendingChange) return;
    const body =
      pendingChange.field === 'role'
        ? { role: pendingChange.next as Role }
        : { proOverride: pendingChange.next as boolean };
    try {
      await mutation.mutateAsync({ uid: pendingChange.user.firebaseUid, body });
      setPendingChange(null);
    } catch (err) {
      const msg = err instanceof ApiError && err.payload?.error
        ? `エラー: ${err.payload.error}`
        : '更新に失敗しました';
      alert(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="UID / メール / 表示名で検索"
          className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {isLoading && (
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
        </div>
      )}
      {error && <div className="text-red-400 text-sm">ユーザー一覧の取得に失敗しました。</div>}

      {users.length > 0 && (
        <ul className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800 overflow-hidden">
          {users.map((u) => (
            <li key={u.firebaseUid} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-100 font-medium">
                    <span className="truncate">{u.displayName ?? '(no name)'}</span>
                    {u.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40">
                        <ShieldCheck className="w-3 h-3" />admin
                      </span>
                    )}
                    {u.effectivePlan === 'pro' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/40">
                        <Crown className="w-3 h-3" />Pro
                      </span>
                    )}
                    {u.isInitialAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 ring-1 ring-zinc-600">
                        <Lock className="w-3 h-3" />env固定
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">{u.email ?? '—'}</div>
                  <div className="text-[10px] font-mono text-zinc-600 truncate">{u.firebaseUid}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ToggleButton
                    label="管理者"
                    on={u.role === 'admin'}
                    disabled={u.isInitialAdmin || u.firebaseUid === currentUid}
                    onClick={() =>
                      setPendingChange({
                        user: u, field: 'role', next: u.role === 'admin' ? 'user' : 'admin',
                      })
                    }
                  />
                  <ToggleButton
                    label="Pro付与"
                    on={u.proOverride}
                    disabled={u.isInitialAdmin}
                    onClick={() =>
                      setPendingChange({
                        user: u, field: 'proOverride', next: !u.proOverride,
                      })
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            もっと読み込む
          </Button>
        </div>
      )}

      {pendingChange && (
        <ConfirmModal
          user={pendingChange.user}
          field={pendingChange.field}
          next={pendingChange.next}
          onCancel={() => setPendingChange(null)}
          onConfirm={confirmChange}
          loading={mutation.isPending}
        />
      )}
    </div>
  );
};

const ToggleButton: React.FC<{
  label: string; on: boolean; disabled?: boolean; onClick: () => void;
}> = ({ label, on, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={[
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      on
        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/25'
        : 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700 hover:bg-zinc-700',
    ].join(' ')}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
    {label}
  </button>
);

const ConfirmModal: React.FC<{
  user: AdminUser;
  field: 'role' | 'proOverride';
  next: Role | boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}> = ({ user, field, next, onCancel, onConfirm, loading }) => {
  const description =
    field === 'role'
      ? `「${user.displayName ?? user.email ?? user.firebaseUid}」のロールを ${next} に変更します。`
      : `「${user.displayName ?? user.email ?? user.firebaseUid}」の Pro オーバーライドを ${next ? '有効' : '無効'} にします。`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 ring-1 ring-amber-500/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">変更の確認</h3>
            <p className="text-xs text-zinc-400">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="default" size="sm" onClick={onConfirm} isLoading={loading}>
            実行
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Audit tab ────────────────────────────────────────────────────────────────
const AuditTab: React.FC = () => {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }) => adminApi.auditLog({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
  });

  const logs = data?.pages.flatMap((p) => p.logs) ?? [];

  if (isLoading) {
    return <div className="text-zinc-500 text-sm flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
    </div>;
  }
  if (error) return <div className="text-red-400 text-sm">監査ログ取得に失敗しました。</div>;
  if (logs.length === 0) return <div className="text-zinc-500 text-sm">記録なし</div>;

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-xs">
        {logs.map((l) => <AuditRow key={l.id} log={l} />)}
      </ul>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
            もっと読み込む
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Top page ─────────────────────────────────────────────────────────────────
const AdminPage: React.FC = () => {
  const { data: me, isLoading } = useCurrentUser();
  const [tab, setTab] = React.useState<Tab>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (me?.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-10 h-10 text-zinc-700 mb-4" />
        <h1 className="text-zinc-300 text-base font-semibold">404 — Not Found</h1>
        <p className="text-zinc-500 text-sm mt-2">このページは存在しません。</p>
        <Link to="/" className="mt-6 text-xs text-zinc-500 hover:text-zinc-300">トップへ戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/account" className="text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            管理者画面
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          <TabButton
            active={tab === 'dashboard'}
            onClick={() => setTab('dashboard')}
            icon={<ShieldCheck className="w-4 h-4" />}
            label="ダッシュボード"
          />
          <TabButton
            active={tab === 'users'}
            onClick={() => setTab('users')}
            icon={<Users className="w-4 h-4" />}
            label="ユーザー"
          />
          <TabButton
            active={tab === 'audit'}
            onClick={() => setTab('audit')}
            icon={<ScrollText className="w-4 h-4" />}
            label="監査ログ"
          />
        </div>

        {tab === 'dashboard' && <Dashboard />}
        {tab === 'users' && <UsersTab currentUid={me.user.firebaseUid} />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
};

export default AdminPage;
