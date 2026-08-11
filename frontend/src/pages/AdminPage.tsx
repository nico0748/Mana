import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ShieldCheck, Users, ScrollText, Crown, Search, Loader2, Lock, AlertTriangle,
  RefreshCw, Megaphone, ImagePlus, X, Send, Save, CalendarClock, Pencil,
  FileJson, MapPin, Check, ChevronDown, ChevronUp, Users2, Trash2, HelpCircle,
} from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  adminApi, announcementsApi, eventTemplatesApi, faqsApi, ApiError,
  type AdminUser, type AdminAuditLogEntry, type AdminStats, type Role,
} from '../lib/api';
import { Button } from '../components/ui/Button';
import { AnnouncementItem } from '../components/AnnouncementItem';
import type {
  Announcement, AnnouncementCategory,
  EventTemplateAdminView, EventTemplateStatus,
  Faq,
} from '../types';

type Tab = 'dashboard' | 'users' | 'audit' | 'announcements' | 'event-templates' | 'faqs';

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

  const [syncToast, setSyncToast] = React.useState<string | null>(null);
  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncFirebase(),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setSyncToast(
        `同期完了: 新規 ${r.created} / 更新 ${r.updated} / 計 ${r.total}件 (${(r.durationMs / 1000).toFixed(1)}秒)`,
      );
      window.setTimeout(() => setSyncToast(null), 5000);
    },
    onError: (err) => {
      const msg = err instanceof ApiError && err.payload?.error
        ? `同期に失敗しました: ${err.payload.error}`
        : '同期に失敗しました';
      setSyncToast(msg);
      window.setTimeout(() => setSyncToast(null), 6000);
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="UID / メール / 表示名で検索"
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending}
          title="Firebase に登録された全ユーザーを DB に取り込みます"
          className="shrink-0"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Firebase から同期
        </Button>
      </div>

      {syncToast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
          {syncToast}
        </div>
      )}

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

// ── Announcements tab ────────────────────────────────────────────────────────
const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: 'feature', label: '機能追加' },
  { value: 'fix',     label: '不具合修正' },
  { value: 'event',   label: 'イベント' },
  { value: 'info',    label: 'お知らせ' },
];

// 画像 1 枚あたりの上限。Express の JSON ペイロード上限 (50mb) と DB 行サイズを考慮した安全圏。
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// epoch ms ⇄ <input type="datetime-local"> 形式の文字列 ("YYYY-MM-DDTHH:mm") 変換。
// datetime-local はローカルタイム解釈なので、Date のメンバ getter/setter で直接組み立てる。
const toLocalDatetimeInput = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const parseLocalDatetimeInput = (s: string): number | null => {
  if (!s) return null;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const AnnouncementsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const formRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [category, setCategory] = React.useState<AnnouncementCategory>('info');
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  // datetime-local 用の文字列。空 = サーバ時刻 / 既存値据え置き。
  const [createdAtInput, setCreatedAtInput] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState<Announcement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['announcements', 'public'],
    queryFn: announcementsApi.list,
    staleTime: 30_000,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('info');
    setImageDataUrl(null);
    setImageError(null);
    setCreatedAtInput('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setCategory(a.category);
    setImageDataUrl(a.imageUrl ?? null);
    setImageError(null);
    setCreatedAtInput(toLocalDatetimeInput(a.createdAt));
    if (fileRef.current) fileRef.current.value = '';
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildPayload = () => {
    const createdAtMs = parseLocalDatetimeInput(createdAtInput);
    return {
      title: title.trim(),
      body,
      imageUrl: imageDataUrl,
      category,
      ...(createdAtMs != null ? { createdAt: createdAtMs } : {}),
    };
  };

  const createMutation = useMutation({
    mutationFn: () => announcementsApi.create(buildPayload()),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['announcements', 'public'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('not editing');
      return announcementsApi.update(editingId, buildPayload());
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['announcements', 'public'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: (_, id) => {
      // 編集中の項目を削除した場合はフォームもリセット
      if (editingId === id) resetForm();
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['announcements', 'public'] });
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`画像は ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)}MB 以下にしてください`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => setImageError('画像の読み込みに失敗しました');
    reader.readAsDataURL(file);
  };

  const isEditing = editingId !== null;
  const submitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;
  const submitError = isEditing ? updateMutation.error : createMutation.error;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* ── 投稿 / 編集フォーム ── */}
      <div
        ref={formRef}
        className={[
          'rounded-2xl border bg-zinc-900/60 p-5 space-y-4 transition-colors',
          isEditing ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-zinc-800',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-4 h-4 text-amber-300" />
                <span>編集中</span>
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4" />
                <span>新規投稿</span>
              </>
            )}
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
              編集をキャンセル
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
            maxLength={200}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            投稿日時 {isEditing
              ? '（変更可・並び順にも反映されます）'
              : '（任意・空ならサーバ時刻）'}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="datetime-local"
              value={createdAtInput}
              onChange={(e) => setCreatedAtInput(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            {createdAtInput && (
              <button
                type="button"
                onClick={() => setCreatedAtInput('')}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                クリア
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            本文（Markdown 対応・見出し / リスト / リンク / コード等）
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={'## 見出し\n\n- 箇条書き\n- **強調**\n- [リンク](https://example.com)'}
            rows={8}
            maxLength={20000}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">画像（任意・1 枚まで・5MB 以下）</label>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-200 cursor-pointer transition-colors">
              <ImagePlus className="w-4 h-4" />
              {imageDataUrl ? '画像を変更' : '画像を追加'}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            {imageDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setImageDataUrl(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                画像を取り除く
              </button>
            )}
          </div>
          {imageError && <p className="text-xs text-red-400 mt-1.5">{imageError}</p>}
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="プレビュー"
              className="mt-3 max-h-48 rounded-lg border border-zinc-800"
            />
          )}
        </div>

        {submitError && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {isEditing ? '更新に失敗しました。' : '投稿に失敗しました。'}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={submitting}>
              キャンセル
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!canSubmit}
          >
            {isEditing
              ? <><Save className="w-4 h-4 mr-2" />更新する</>
              : <><Send className="w-4 h-4 mr-2" />投稿する</>}
          </Button>
        </div>
      </div>

      {/* ── 既存お知らせ一覧（投稿日時の降順） ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">投稿済みのお知らせ</h3>
        {isLoading && (
          <div className="text-zinc-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
          </div>
        )}
        {error && <div className="text-red-400 text-sm">お知らせの取得に失敗しました。</div>}
        {data && data.length === 0 && (
          <div className="text-zinc-500 text-sm">まだ投稿はありません。</div>
        )}
        {data && data.length > 0 && (
          <div className="space-y-4">
            {data.map(a => (
              <AnnouncementItem
                key={a.id}
                announcement={a}
                onEdit={startEdit}
                onDelete={(id) => setConfirmDelete(data.find(x => x.id === id) ?? null)}
                deleting={deleteMutation.isPending && confirmDelete?.id === a.id}
                highlighted={editingId === a.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 削除確認 ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-semibold">お知らせを削除</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              「<span className="text-zinc-200">{confirmDelete.title}</span>」を削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                isLoading={deleteMutation.isPending}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Event templates tab ──────────────────────────────────────────────────────

const STATUS_FILTERS: { value: EventTemplateStatus | 'all'; label: string }[] = [
  { value: 'pending',  label: '申請中' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'all',      label: '全て' },
];

const STATUS_BADGE: Record<EventTemplateStatus, string> = {
  pending:  'bg-amber-500/15 text-amber-300 ring-amber-500/40',
  approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  rejected: 'bg-red-500/15 text-red-300 ring-red-500/40',
};

const STATUS_LABEL: Record<EventTemplateStatus, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
};

const TemplateRow: React.FC<{
  template: EventTemplateAdminView;
  onApprove: () => void;
  onReject: (reason: string | null) => void;
  onDelete: () => void;
  busy: boolean;
}> = ({ template, onApprove, onReject, onDelete, busy }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [rejectMode, setRejectMode] = React.useState(false);
  const [reason, setReason] = React.useState('');

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${STATUS_BADGE[template.status]}`}>
                {STATUS_LABEL[template.status]}
              </span>
              <span className="text-sm font-semibold text-zinc-100 truncate">{template.name}</span>
              {template.date && <span className="text-xs text-zinc-500">{template.date}</span>}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{template.hallCount} ホール</span>
              <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{template.circleCount} サークル</span>
              <span className="font-mono text-[10px] text-zinc-600 truncate">submitter: {template.submittedByUid}</span>
              <span className="text-zinc-600">{new Date(template.createdAt).toLocaleString('ja-JP')}</span>
            </div>
            {template.rejectionReason && (
              <p className="mt-1 text-xs text-red-300 bg-red-400/5 border border-red-400/20 rounded px-2 py-1">
                却下理由: {template.rejectionReason}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {template.status === 'pending' && (
              <>
                <Button variant="default" size="sm" onClick={onApprove} disabled={busy}>
                  <Check className="w-3.5 h-3.5 mr-1" />承認
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRejectMode(v => !v)} disabled={busy}>
                  却下
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="詳細"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-400/10 border border-zinc-800 hover:border-red-500/30 rounded-lg transition-colors disabled:opacity-40"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">削除</span>
            </button>
          </div>
        </div>

        {rejectMode && template.status === 'pending' && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-zinc-500 mb-1">却下理由（任意・申請者には表示されません）</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 会場マップの解像度が低い"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setRejectMode(false); setReason(''); }} disabled={busy}>
                キャンセル
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onReject(reason.trim() || null)}
                disabled={busy}
              >
                却下する
              </Button>
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-950/40 px-4 py-3 space-y-3">
          <p className="text-[11px] text-zinc-500">
            会場マップスナップショット（{template.venueMaps.length} 枚）
          </p>
          {template.venueMaps.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">マップなし</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {template.venueMaps.map((m, i) => (
                <div key={`${m.hall}-${i}`} className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <div className="px-3 py-1.5 text-xs text-zinc-300 border-b border-zinc-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    {m.hall}
                  </div>
                  {m.imageDataUrl ? (
                    <img
                      src={m.imageDataUrl}
                      alt={m.hall}
                      className="w-full max-h-40 object-contain bg-zinc-950"
                    />
                  ) : (
                    <div className="px-3 py-6 text-center text-[10px] text-zinc-600">画像なし</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {template.circles.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60">
              <p className="text-[11px] text-zinc-500 mb-2 flex items-center gap-1">
                <Users2 className="w-3 h-3" />
                サークルスナップショット（{template.circles.length} 件）
              </p>
              <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {template.circles.map((c, i) => (
                  <li key={`${c.hall}-${c.block}-${c.number}-${i}`} className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono text-zinc-500 w-20 flex-shrink-0">
                      {c.hall} {c.block}-{c.number}
                    </span>
                    <span className="text-zinc-200 truncate">{c.name}</span>
                    {c.author && <span className="text-zinc-500 truncate">/ {c.author}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {template.sourceEventId && (
            <p className="text-[10px] text-zinc-600 font-mono break-all">source event: {template.sourceEventId}</p>
          )}
        </div>
      )}
    </li>
  );
};

// 削除確認モーダル: ステータスに応じて警告強度を変える。
const TemplateDeleteConfirm: React.FC<{
  template: EventTemplateAdminView;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}> = ({ template, onConfirm, onCancel, busy }) => {
  const isApproved = template.status === 'approved';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-semibold">
            {isApproved ? '公開中のテンプレートを削除' : 'テンプレート申請を削除'}
          </h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          「<span className="text-zinc-200">{template.name}</span>」を削除します。
          {isApproved ? (
            <>
              <br />
              <span className="text-amber-300">
                このテンプレートは公開中で、ユーザーが /templates ページから閲覧・取り込みできる状態です。
                削除すると即座に公開一覧から消えます。
              </span>
            </>
          ) : null}
          <br />
          この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            キャンセル
          </Button>
          <Button variant="default" size="sm" onClick={onConfirm} isLoading={busy}>
            削除する
          </Button>
        </div>
      </div>
    </div>
  );
};

const EventTemplatesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<EventTemplateStatus | 'all'>('pending');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = React.useState<EventTemplateAdminView | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'event-templates', filter],
    queryFn: () => eventTemplatesApi.adminList(filter === 'all' ? undefined : filter),
    staleTime: 15_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'event-templates'] });
    queryClient.invalidateQueries({ queryKey: ['eventTemplates', 'public'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: EventTemplateStatus; rejectionReason?: string | null }) =>
      eventTemplatesApi.adminUpdate(id, { status, rejectionReason: rejectionReason ?? null }),
    onSuccess: () => { setErrorMsg(null); refresh(); },
    onError: () => setErrorMsg('更新に失敗しました'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventTemplatesApi.adminDelete(id),
    onSuccess: () => {
      setErrorMsg(null);
      setConfirmDeleteTarget(null);
      refresh();
    },
    onError: () => setErrorMsg('削除に失敗しました'),
  });

  const busyId = updateMutation.variables?.id ?? (deleteMutation.variables as string | undefined);
  const busy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {isLoading && (
        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
        </div>
      )}
      {error && <div className="text-red-400 text-sm">テンプレート一覧の取得に失敗しました。</div>}
      {data && data.length === 0 && (
        <div className="text-zinc-500 text-sm">該当する申請はありません。</div>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map(t => (
            <TemplateRow
              key={t.id}
              template={t}
              busy={busy && busyId === t.id}
              onApprove={() => updateMutation.mutate({ id: t.id, status: 'approved' })}
              onReject={(reason) => updateMutation.mutate({ id: t.id, status: 'rejected', rejectionReason: reason })}
              onDelete={() => setConfirmDeleteTarget(t)}
            />
          ))}
        </ul>
      )}

      {confirmDeleteTarget && (
        <TemplateDeleteConfirm
          template={confirmDeleteTarget}
          onCancel={() => setConfirmDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(confirmDeleteTarget.id)}
          busy={deleteMutation.isPending}
        />
      )}
    </div>
  );
};

// ── FAQ tab ──────────────────────────────────────────────────────────────────

const FaqsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const formRef = React.useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [orderInput, setOrderInput] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState<Faq | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['faqs', 'public'],
    queryFn: faqsApi.list,
    staleTime: 30_000,
  });

  const resetForm = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setOrderInput('');
    setErrorMsg(null);
  };

  const startEdit = (f: Faq) => {
    setEditingId(f.id);
    setQuestion(f.question);
    setAnswer(f.answer);
    setOrderInput(String(f.order));
    setErrorMsg(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildPayload = () => {
    const trimmedOrder = orderInput.trim();
    const order = trimmedOrder === '' ? undefined : Number(trimmedOrder);
    return {
      question: question.trim(),
      answer: answer.trim(),
      ...(order !== undefined && Number.isFinite(order) ? { order } : {}),
    };
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['faqs', 'public'] });

  const createMutation = useMutation({
    mutationFn: () => faqsApi.create(buildPayload()),
    onSuccess: () => { resetForm(); refresh(); },
    onError: () => setErrorMsg('投稿に失敗しました'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('not editing');
      return faqsApi.update(editingId, buildPayload());
    },
    onSuccess: () => { resetForm(); refresh(); },
    onError: () => setErrorMsg('更新に失敗しました'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => faqsApi.delete(id),
    onSuccess: (_, id) => {
      if (editingId === id) resetForm();
      setConfirmDelete(null);
      refresh();
    },
    onError: () => setErrorMsg('削除に失敗しました'),
  });

  const isEditing = editingId !== null;
  const submitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = question.trim().length > 0 && answer.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* ── 投稿 / 編集フォーム ── */}
      <div
        ref={formRef}
        className={[
          'rounded-2xl border bg-zinc-900/60 p-5 space-y-4 transition-colors',
          isEditing ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-zinc-800',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-4 h-4 text-amber-300" />
                <span>編集中</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-4 h-4" />
                <span>新規 FAQ</span>
              </>
            )}
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
              編集をキャンセル
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">質問</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例: テンプレートデータとは？"
            maxLength={200}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">回答</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="回答を入力してください"
            rows={5}
            maxLength={5000}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            表示順（小さいほど上に表示。空のままなら末尾に追加）
          </label>
          <input
            type="number"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="例: 1"
            className="w-32 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {errorMsg && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={submitting}>
              キャンセル
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!canSubmit}
          >
            {isEditing
              ? <><Save className="w-4 h-4 mr-2" />更新する</>
              : <><Send className="w-4 h-4 mr-2" />投稿する</>}
          </Button>
        </div>
      </div>

      {/* ── 既存 FAQ 一覧 ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">登録済みの FAQ</h3>
        {isLoading && (
          <div className="text-zinc-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />読み込み中…
          </div>
        )}
        {error && <div className="text-red-400 text-sm">FAQ の取得に失敗しました。</div>}
        {data && data.length === 0 && (
          <div className="text-zinc-500 text-sm">まだ FAQ はありません。</div>
        )}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map(f => (
              <li
                key={f.id}
                className={[
                  'rounded-xl border bg-zinc-900/60 px-4 py-3',
                  editingId === f.id ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-zinc-800',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono tabular-nums">#{f.order}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100 leading-snug mb-1">{f.question}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(f)}
                      disabled={deleteMutation.isPending && confirmDelete?.id === f.id}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 削除確認 ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-semibold">FAQ を削除</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              「<span className="text-zinc-200">{confirmDelete.question}</span>」を削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                isLoading={deleteMutation.isPending}
              >
                削除する
              </Button>
            </div>
          </div>
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
            active={tab === 'announcements'}
            onClick={() => setTab('announcements')}
            icon={<Megaphone className="w-4 h-4" />}
            label="お知らせ"
          />
          <TabButton
            active={tab === 'event-templates'}
            onClick={() => setTab('event-templates')}
            icon={<FileJson className="w-4 h-4" />}
            label="テンプレート申請"
          />
          <TabButton
            active={tab === 'faqs'}
            onClick={() => setTab('faqs')}
            icon={<HelpCircle className="w-4 h-4" />}
            label="FAQ"
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
        {tab === 'announcements' && <AnnouncementsTab />}
        {tab === 'event-templates' && <EventTemplatesTab />}
        {tab === 'faqs' && <FaqsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
};

export default AdminPage;
