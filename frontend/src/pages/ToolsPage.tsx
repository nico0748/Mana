import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Palette, MessageSquare,
  Briefcase, HelpCircle, User,
  ChevronRight, ChevronLeft,
  Sun, Moon, ImageIcon, Trash2, Type, Zap, ZapOff, Monitor,
  Mail, Calendar, Shield, FileText, ExternalLink, LogOut, MapPin, Crown,
  KeyRound, Copy, Check, Plus, AlertTriangle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi, type ApiKeySummary } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { TERMS_TEXT } from '../legal/terms';
import { PRIVACY_TEXT } from '../legal/privacy';
import { TOKUSHOHO_TEXT } from '../legal/tokushoho';

// ── 型定義 ──────────────────────────────────────────────────────────────────

type CategoryId = 'personalize' | 'data' | 'integration' | 'feedback' | 'service' | 'help' | 'account';

interface Category {
  id: CategoryId;
  label: string;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'personalize', label: '表示と操作',     icon: <Palette       className="w-[18px] h-[18px]" /> },
  { id: 'data',        label: 'データ',         icon: <Database      className="w-[18px] h-[18px]" /> },
  { id: 'integration', label: '連携',           icon: <KeyRound      className="w-[18px] h-[18px]" /> },
  { id: 'feedback',    label: 'フィードバック', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
  { id: 'service',     label: 'サービス',       icon: <Briefcase     className="w-[18px] h-[18px]" /> },
  { id: 'help',        label: 'ヘルプ',         icon: <HelpCircle    className="w-[18px] h-[18px]" /> },
  { id: 'account',     label: 'アカウント',     icon: <User          className="w-[18px] h-[18px]" /> },
];

// ── 共通 UI パーツ ───────────────────────────────────────────────────────────

const SettingRow: React.FC<{
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}> = ({ icon, label, value, onClick, right, danger }) => {
  const content = <>
    <div className="flex items-center gap-3">
      {icon && <span className={danger ? 'text-red-400' : 'text-zinc-500'}>{icon}</span>}
      <span className={`text-sm ${danger ? 'text-red-400' : 'text-zinc-200'}`}>{label}</span>
    </div>
    {right ?? (
      value !== undefined && (
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="text-sm">{value}</span>
          {onClick && <ChevronRight className="w-4 h-4" />}
        </div>
      )
    )}
  </>;
  const className = `w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
    onClick ? 'hover:bg-zinc-800/60 cursor-pointer' : ''
  }`;

  return onClick ? <button onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>;
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-4 pt-5 pb-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{children}</p>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-4 rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
    {children}
  </div>
);

// ── カテゴリ別コンテンツ ─────────────────────────────────────────────────────

const ThemeSettings: React.FC<{
  settings: ReturnType<typeof useAppSettings>['settings'];
  update: ReturnType<typeof useAppSettings>['update'];
}> = ({ settings, update }) => (
  <>
    <SectionTitle>テーマ</SectionTitle>
    <Card>
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">
            {settings.theme === 'system' ? <Monitor className="w-4 h-4" /> :
             settings.theme === 'dark' ? <Moon className="w-4 h-4" /> :
             settings.theme === 'taupe' ? <Palette className="w-4 h-4" /> :
             <Sun className="w-4 h-4" />}
          </span>
          <span className="text-sm text-zinc-200">テーマ</span>
        </div>
        <div className="flex gap-0.5 bg-zinc-800 rounded-lg p-0.5">
          {(['system', 'dark', 'light', 'taupe'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ theme: t })}
              aria-pressed={settings.theme === t}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                settings.theme === t
                  ? 'bg-zinc-600 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              {t === 'system' ? '自動' : t === 'dark' ? 'ダーク' : t === 'light' ? 'ライト' : 'トープ'}
            </button>
          ))}
        </div>
      </div>
    </Card>
    <SectionTitle>アクセントカラー</SectionTitle>
    <Card>
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-200">主要ボタンの色</span>
        <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          {([
            { value: 'emerald', label: '緑', color: 'bg-emerald-500' },
            { value: 'violet', label: '紫', color: 'bg-violet-500' },
            { value: 'blue', label: '青', color: 'bg-blue-500' },
          ] as const).map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => update({ accentColor: value })}
              aria-pressed={settings.accentColor === value}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${settings.accentColor === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
    <p className="px-4 pt-2 text-xs text-zinc-500">「自動」は端末の外観設定に合わせます。</p>
  </>
);

const PersonalizeContent: React.FC<{
  settings: ReturnType<typeof useAppSettings>['settings'];
  update: ReturnType<typeof useAppSettings>['update'];
  reset: ReturnType<typeof useAppSettings>['reset'];
}> = ({ settings, update, reset }) => {
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

  return (
    <div className="pb-6">
      <ThemeSettings settings={settings} update={update} />
      <SectionTitle>背景</SectionTitle>
      <Card>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">背景画像</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.backgroundImageDataUrl && (
                <button
                  onClick={() => update({ backgroundImageDataUrl: null })}
                  aria-label="背景画像を削除"
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
                <button
                  onClick={() => bgImageRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              >
                選択
              </button>
            </div>
          </div>
          {settings.backgroundImageDataUrl && (
            <div className="space-y-2">
              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-700">
                <img src={settings.backgroundImageDataUrl} alt="背景プレビュー" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 flex-shrink-0">不透明度</span>
                <input
                  type="range" min={5} max={100}
                  value={settings.backgroundOpacity}
                  onChange={e => update({ backgroundOpacity: Number(e.target.value) })}
                  className="flex-1 accent-zinc-400"
                />
                <span className="text-xs text-zinc-400 w-8 text-right tabular-nums">{settings.backgroundOpacity}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">表示位置</span>
                <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                  {([
                    { value: 'top', label: '上' },
                    { value: 'center', label: '中央' },
                    { value: 'bottom', label: '下' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => update({ backgroundPosition: value })}
                      aria-pressed={settings.backgroundPosition === value}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${settings.backgroundPosition === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">ぼかし</span>
                <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                  {([0, 4, 8] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => update({ backgroundBlur: value })}
                      aria-pressed={settings.backgroundBlur === value}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${settings.backgroundBlur === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {value === 0 ? 'なし' : `${value}px`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">画像の収まり</span>
                <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                  {([
                    { value: 'cover', label: '全面' },
                    { value: 'contain', label: '全体' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => update({ backgroundFit: value })}
                      aria-pressed={settings.backgroundFit === value}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${settings.backgroundFit === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <input ref={bgImageRef} type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
        </div>
      </Card>

      <SectionTitle>テキスト</SectionTitle>
      <Card>
        <SettingRow
          icon={<Type className="w-4 h-4" />}
          label="フォントサイズ"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['normal', 'large', 'xlarge'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  aria-pressed={settings.fontSize === size}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    settings.fontSize === size ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {size === 'normal' ? '標準' : size === 'large' ? '大' : '特大'}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<Type className="w-4 h-4" />}
          label="行間"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['normal', 'relaxed'] as const).map(value => (
                <button
                  key={value}
                  onClick={() => update({ readingSpacing: value })}
                  aria-pressed={settings.readingSpacing === value}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.readingSpacing === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {value === 'normal' ? '標準' : 'ゆったり'}
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <SectionTitle>コンテンツ表示</SectionTitle>
      <Card>
        <SettingRow
          icon={<Database className="w-4 h-4" />}
          label="本棚の初期表示"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['list', 'box'] as const).map(value => (
                <button
                  key={value}
                  onClick={() => update({ bookViewMode: value })}
                  aria-pressed={settings.bookViewMode === value}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.bookViewMode === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {value === 'list' ? 'リスト' : '表紙'}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<Type className="w-4 h-4" />}
          label="買い物リストの間隔"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {(['comfortable', 'compact'] as const).map(value => (
                <button
                  key={value}
                  onClick={() => update({ contentDensity: value })}
                  aria-pressed={settings.contentDensity === value}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.contentDensity === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {value === 'comfortable' ? '標準' : 'コンパクト'}
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <SectionTitle>マップ</SectionTitle>
      <Card>
        <SettingRow
          icon={<MapPin className="w-4 h-4" />}
          label="サークルマーカーの大きさ"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {([
                { value: 'small',  label: '小' },
                { value: 'normal', label: '標準' },
                { value: 'large',  label: '大' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ mapMarkerSize: value })}
                  aria-pressed={settings.mapMarkerSize === value}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    settings.mapMarkerSize === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<MapPin className="w-4 h-4" />}
          label="ピンに優先順位番号を表示"
          right={
            <button
              type="button"
              role="switch"
              aria-checked={settings.showMapPinNumbers}
              aria-label="ピンに優先順位番号を表示"
              onClick={() => update({ showMapPinNumbers: !settings.showMapPinNumbers })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.showMapPinNumbers ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span
                aria-hidden
                className={`inline-block h-4 w-4 rounded-full bg-zinc-100 shadow-sm transition-transform ${settings.showMapPinNumbers ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          }
        />
        <SettingRow
          icon={<MapPin className="w-4 h-4" />}
          label="完了済みピン"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {([
                { value: 'show', label: '表示' },
                { value: 'muted', label: '薄く' },
                { value: 'hidden', label: '隠す' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ mapCompletedVisibility: value })}
                  aria-pressed={settings.mapCompletedVisibility === value}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${settings.mapCompletedVisibility === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          icon={<MapPin className="w-4 h-4" />}
          label="ピンの形"
          right={
            <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              {([
                { value: 'circle', label: '丸' },
                { value: 'rounded', label: '角丸' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ mapMarkerShape: value })}
                  aria-pressed={settings.mapMarkerShape === value}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${settings.mapMarkerShape === value ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <SectionTitle>アクセシビリティ</SectionTitle>
      <Card>
        <SettingRow
          icon={settings.reduceMotion ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          label="アニメーション削減"
          right={
            <button
              type="button"
              role="switch"
              aria-checked={settings.reduceMotion}
              aria-label="アニメーション削減"
              onClick={() => update({ reduceMotion: !settings.reduceMotion })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.reduceMotion ? 'bg-zinc-500' : 'bg-zinc-700'}`}
            >
              <span
                aria-hidden
                className={`inline-block h-4 w-4 rounded-full bg-zinc-100 shadow-sm transition-transform ${settings.reduceMotion ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          }
        />
        <SettingRow
          icon={<Palette className="w-4 h-4" />}
          label="高コントラスト"
          right={
            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrast}
              aria-label="高コントラスト"
              onClick={() => update({ highContrast: !settings.highContrast })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.highContrast ? 'bg-zinc-100' : 'bg-zinc-700'}`}
            >
              <span
                aria-hidden
                className={`inline-block h-4 w-4 rounded-full shadow-sm transition-transform ${settings.highContrast ? 'translate-x-6 bg-zinc-900' : 'translate-x-1 bg-zinc-100'}`}
              />
            </button>
          }
        />
      </Card>

      <div className="px-4 pt-5 flex items-center gap-4">
        <button
          onClick={() => update({
            theme: 'dark', accentColor: 'emerald', highContrast: false, backgroundImageDataUrl: null, backgroundOpacity: 30,
            backgroundBlur: 0, backgroundPosition: 'center', backgroundFit: 'cover', fontSize: 'normal', readingSpacing: 'normal',
            contentDensity: 'comfortable',
          })}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          表示設定を初期化
        </button>
        <button
          onClick={reset}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          すべての設定をリセット
        </button>
      </div>
    </div>
  );
};

const DataContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>データの出力・取り込み</SectionTitle>
    <Card>
      <SettingRow
        icon={<Database className="w-4 h-4" />}
        label="蔵書データを出力・取り込む"
        value="本棚ページ"
        onClick={() => window.location.assign('/')}
      />
      <SettingRow
        icon={<Database className="w-4 h-4" />}
        label="買い物リストのデータを出力・取り込む"
        value="買い物ページ"
        onClick={() => window.location.assign('/shopping')}
      />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">各ページのサイドバーから、JSON / CSV / Excel形式でデータを出力・取り込めます。</p>
  </div>
);

// ── 連携（API キー） ─────────────────────────────────────────────────────────
//
// MCP サーバのようなブラウザ外のクライアントは Firebase ID トークン（有効期限 1 時間）
// を更新できないため、失効可能な長期キーをここから発行する。
// 平文はサーバに保存されないので、発行直後の一度しか表示できない。

const fmtDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const ApiKeyRow: React.FC<{ apiKey: ApiKeySummary; onRevoke: (id: string) => void }> = ({ apiKey, onRevoke }) => {
  const revoked = apiKey.revokedAt !== null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${revoked ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
            {apiKey.name}
          </span>
          {revoked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 flex-shrink-0">失効済み</span>
          )}
        </div>
        <p className="text-xs text-zinc-600 font-mono truncate">{apiKey.prefix}…</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          作成 {fmtDate(apiKey.createdAt)} ／ 最終利用 {fmtDate(apiKey.lastUsedAt)}
        </p>
      </div>
      {!revoked && (
        <button
          onClick={() => onRevoke(apiKey.id)}
          aria-label={`${apiKey.name} を失効`}
          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const IntegrationContent: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: keys, isLoading, isError } = useQuery({ queryKey: ['apiKeys'], queryFn: apiKeysApi.list });

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await apiKeysApi.create(name.trim());
      setIssued(created.key);
      setCopied(false);
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    } catch {
      setError('キーの発行に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('このキーを失効させますか？\nこのキーを使っている連携はすぐに動かなくなります。')) return;
    try {
      await apiKeysApi.revoke(id);
      await queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    } catch {
      setError('キーの失効に失敗しました。');
    }
  };

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
    } catch {
      setError('クリップボードにコピーできませんでした。手動で選択してコピーしてください。');
    }
  };

  return (
    <div className="pb-8">
      <SectionTitle>API キー</SectionTitle>
      <div className="px-4 pb-3">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Claude などの外部クライアントから、この端末のブラウザを経由せずに蔵書・買い物リストを
          操作するためのキーです。キーはあなたのデータにのみアクセスでき、管理者操作には使えません。
        </p>
      </div>

      {/* 発行直後だけ平文を表示する。リロードすると二度と見られない。 */}
      {issued && (
        <div className="mx-4 mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300 leading-relaxed">
              このキーが表示されるのは今回だけです。閉じる前に控えてください。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 text-xs font-mono text-zinc-200 bg-zinc-900 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
              {issued}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="キーをコピー">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <button
            onClick={() => setIssued(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            控えたので閉じる
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="mx-4 mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="px-4 flex gap-2">
        <div className="flex-1">
          <label htmlFor="api-key-name" className="sr-only">キーの用途</label>
          <Input
            id="api-key-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="用途がわかる名前（例: Claude Code）"
            maxLength={60}
          />
        </div>
        <Button type="submit" isLoading={creating} disabled={!name.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          発行
        </Button>
      </form>

      <SectionTitle>発行済みのキー</SectionTitle>
      <Card>
        {isLoading ? (
          <div role="status" aria-live="polite" className="px-4 py-6 text-sm text-zinc-500">読み込み中…</div>
        ) : isError ? (
          // 取得失敗を「キーが 0 本」と見せると、既にあるのに重複発行されてしまう
          <div role="alert" className="px-4 py-6 text-sm text-rose-400">キーの一覧を取得できませんでした。</div>
        ) : !keys?.length ? (
          <div className="px-4 py-6 text-sm text-zinc-500">まだキーがありません。</div>
        ) : (
          keys.map(k => <ApiKeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />)
        )}
      </Card>
    </div>
  );
};

const FeedbackContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>フィードバック</SectionTitle>
    <Card>
      <SettingRow
        icon={<ExternalLink className="w-4 h-4" />}
        label="フィードバックを送る"
        value="Google フォーム"
        onClick={() => window.open('https://forms.google.com', '_blank')}
      />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">ご意見・ご要望・バグ報告はフォームからお送りください。</p>
  </div>
);

const ServiceContent: React.FC = () => {
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openTokushoho, setOpenTokushoho] = useState(false);

  return (
    <div className="pb-6">
      <SectionTitle>法的情報</SectionTitle>
      <Card>
        <div>
          <button
            onClick={() => setOpenTerms(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">利用規約</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${openTerms ? 'rotate-90' : ''}`} />
          </button>
          {openTerms && (
            <div className="px-4 pb-4 border-t border-zinc-800">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-80 overflow-y-auto">{TERMS_TEXT}</pre>
            </div>
          )}
        </div>
        <div>
          <button
            onClick={() => setOpenPrivacy(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">プライバシーポリシー</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${openPrivacy ? 'rotate-90' : ''}`} />
          </button>
          {openPrivacy && (
            <div className="px-4 pb-4 border-t border-zinc-800">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-80 overflow-y-auto">{PRIVACY_TEXT}</pre>
            </div>
          )}
        </div>
        <div>
          <button
            onClick={() => setOpenTokushoho(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-200">特定商取引法に基づく表記</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${openTokushoho ? 'rotate-90' : ''}`} />
          </button>
          {openTokushoho && (
            <div className="px-4 pb-4 border-t border-zinc-800">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap mt-3 max-h-80 overflow-y-auto">{TOKUSHOHO_TEXT}</pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const HelpContent: React.FC = () => (
  <div className="pb-6">
    <SectionTitle>アプリ情報</SectionTitle>
    <Card>
      <SettingRow label="アプリ名" value="同人++" />
      <SettingRow label="説明" value="同人活動管理アプリ" />
    </Card>
    <p className="px-4 pt-3 text-xs text-zinc-600">設定はこのデバイスに保存されます。</p>
  </div>
);

const AccountContent: React.FC<{ user: ReturnType<typeof useAuth>['user']; logout: ReturnType<typeof useAuth>['logout'] }> = ({ user, logout }) => {
  const { refreshUser } = useAuth();
  const { data: me } = useCurrentUser();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? '');
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setNameSaving(true);
    try {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(user, { displayName: nameInput.trim() });
      await refreshUser();
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  };

  const createdAt = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const lastSignIn = user?.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const providers = user?.providerData.map(p => {
    if (p.providerId === 'google.com') return 'Google';
    if (p.providerId === 'password') return 'メール / パスワード';
    return p.providerId;
  }) ?? [];

  const isPro = me?.user.plan === 'pro';

  return (
    <div className="pb-6">
      <SectionTitle>プラン</SectionTitle>
      <Link
        to="/account"
        className="mx-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 p-4 flex items-center justify-between gap-3 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-violet-500/15' : 'bg-zinc-800'}`}>
            <Crown className={`w-4 h-4 ${isPro ? 'text-violet-300' : 'text-zinc-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">{isPro ? 'Pro プラン' : 'Free プラン'}</p>
            <p className="text-xs text-zinc-500 truncate">
              {isPro ? '次回更新日や解約はこちら' : 'Pro プランは近日公開予定'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
      </Link>

      <SectionTitle>プロフィール</SectionTitle>
      <div className="mx-4 rounded-xl border border-zinc-800 p-4 flex items-center gap-3">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-12 h-12 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{user?.displayName ?? '名前未設定'}</p>
          <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
        </div>
      </div>

      <SectionTitle>詳細情報</SectionTitle>
      <Card>
        {/* ユーザー名（インライン編集） */}
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-sm text-zinc-200">ユーザー名</span>
            </div>
            {!editingName ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 truncate max-w-[140px]">{user?.displayName ?? '未設定'}</span>
                <button
                  onClick={() => { setNameInput(user?.displayName ?? ''); setEditingName(true); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  変更
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="w-36 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
                <button
                  onClick={handleSaveName}
                  disabled={!nameInput.trim() || nameSaving}
                  className="text-xs text-zinc-900 bg-zinc-100 hover:bg-white px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {nameSaving ? '…' : '保存'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
        <SettingRow icon={<Mail className="w-4 h-4" />} label="メールアドレス" value={user?.email ?? '—'} />
        <SettingRow icon={<Shield className="w-4 h-4" />} label="ログイン方法" value={providers.length > 0 ? providers.join(' / ') : '—'} />
        {createdAt && <SettingRow icon={<Calendar className="w-4 h-4" />} label="アカウント作成日" value={createdAt} />}
        {lastSignIn && <SettingRow icon={<Calendar className="w-4 h-4" />} label="最終ログイン" value={lastSignIn} />}
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3 mb-0.5">
            <Shield className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-200">ユーザーID</span>
          </div>
          <p className="text-xs text-zinc-500 font-mono break-all pl-7">{user?.uid ?? '—'}</p>
        </div>
      </Card>

      <SectionTitle>セッション</SectionTitle>
      <Card>
        <SettingRow
          icon={<LogOut className="w-4 h-4" />}
          label="ログアウト"
          onClick={logout}
          danger
        />
      </Card>
    </div>
  );
};

// ── ToolsPage ────────────────────────────────────────────────────────────────

const ToolsPage: React.FC = () => {
  const { settings, update, reset } = useAppSettings();
  const { user, logout } = useAuth();
  const { data: me } = useCurrentUser();
  const [selected, setSelected] = useState<CategoryId>('personalize');
  // モバイルでカテゴリを選択したかどうか
  const [mobilePanel, setMobilePanel] = useState(false);

  // API キーは MCP 連携の検証中につき、当面は管理者のみ発行できる。
  // サーバ側でも requireAdmin で弾いているので、ここは導線を出さないための出し分け。
  const isAdmin = me?.user.role === 'admin';
  const visibleCategories = isAdmin
    ? categories
    : categories.filter(c => c.id !== 'integration');

  // 「連携」を開いたまま管理者権限が外れると、選択中のカテゴリがナビから消えて
  // 見出しだけ残り中身が空になる。選択値をそのまま使わず、表示可能なものへ倒した
  // 値を描画に使うことで、権限が変わった直後のフレームでもずれない。
  const activeCategory: CategoryId = visibleCategories.some(c => c.id === selected)
    ? selected
    : visibleCategories[0].id;

  const handleSelect = (id: CategoryId) => {
    setSelected(id);
    setMobilePanel(true);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'personalize': return <PersonalizeContent settings={settings} update={update} reset={reset} />;
      case 'data':        return <DataContent />;
      // 管理者以外はナビに出さないが、権限が変わった直後などに備えて描画側でも塞ぐ
      case 'integration': return isAdmin ? <IntegrationContent /> : null;
      case 'feedback':    return <FeedbackContent />;
      case 'service':     return <ServiceContent />;
      case 'help':        return <HelpContent />;
      case 'account':     return <AccountContent user={user} logout={logout} />;
    }
  };

  const selectedCategory = visibleCategories.find(c => c.id === activeCategory)!;

  const navList = (
    <nav className="py-2">
      {visibleCategories.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleSelect(cat.id)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            activeCategory === cat.id
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          }`}
        >
          <span className={activeCategory === cat.id ? 'text-zinc-300' : 'text-zinc-600'}>{cat.icon}</span>
          <span className="text-sm font-medium">{cat.label}</span>
          {/* モバイルのみ: 矢印 */}
          <ChevronRight className="w-4 h-4 ml-auto text-zinc-700 lg:hidden" />
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))]">

      {/* ── 左カテゴリパネル ── */}
      {/* デスクトップ: 常時表示 / モバイル: mobilePanel=false のとき表示 */}
      <aside className={`
        ${mobilePanel ? 'hidden' : 'flex'} lg:flex
        flex-col w-full lg:w-56 flex-shrink-0
        border-r border-zinc-800 bg-zinc-950 overflow-y-auto
      `}>
        <div className="px-4 py-4 border-b border-zinc-800">
          <h1 className="text-base font-semibold text-zinc-200">設定</h1>
        </div>
        {navList}
      </aside>

      {/* ── 右コンテンツパネル ── */}
      {/* デスクトップ: 常時表示 / モバイル: mobilePanel=true のとき表示 */}
      <main className={`
        ${mobilePanel ? 'flex' : 'hidden'} lg:flex
        flex-col flex-1 overflow-y-auto bg-zinc-950
      `}>
        {/* ヘッダー */}
        <div className="tools-panel-header sticky top-0 z-10 px-4 py-3.5 border-b border-zinc-800 flex items-center gap-3">
          {/* モバイルのみ: 戻るボタン */}
          <button
            onClick={() => setMobilePanel(false)}
            className="lg:hidden p-1 -ml-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-zinc-200">{selectedCategory.label}</h2>
        </div>

        {/* コンテンツ */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default ToolsPage;
