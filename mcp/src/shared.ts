import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ManaApiError, type Circle, type DoujinEvent, type ManaClient } from './client.js';

/** ツール登録関数の共通シグネチャ。index.ts から順に呼ぶ */
export type ToolModule = (server: McpServer, client: ManaClient) => void;

export const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

export const fail = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

/** API エラーを Claude が読んで対処できる日本語メッセージに変換する */
export function describeError(err: unknown): string {
  if (err instanceof ManaApiError) {
    if (err.status === 401) return '認証に失敗しました。MANA_API_KEY が正しいか、失効していないか確認してください。';
    if (err.status === 403) return '権限がありません。API キーでは管理者操作とキー自体の管理はできません。';
    if (err.status === 404) return '対象が見つかりません。ID が正しいか確認してください。';
    if (err.status === 402 || err.body.includes('plan_limit')) {
      return 'プランの上限に達しています。不要なデータを整理するか、Pro プランをご検討ください。';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/** ハンドラの決まり文句（try/catch + エラー変換）をまとめる */
export async function guard<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(describeError(err));
  }
}

/** eventId そのもの、または即売会名（部分一致）から即売会を 1 件に決める */
export async function resolveEvent(client: ManaClient, ref: string): Promise<DoujinEvent> {
  const events = await client.listEvents();

  const byId = events.find(e => e.id === ref);
  if (byId) return byId;

  const needle = ref.normalize('NFC').toLowerCase();
  const matches = events.filter(e => e.name.normalize('NFC').toLowerCase().includes(needle));

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(
      `「${ref}」に一致する即売会が見つかりません。` +
      `登録済み: ${events.map(e => e.name).join(' / ') || '(なし)'}`,
    );
  }
  throw new Error(
    `「${ref}」に複数の即売会が一致します。ID で指定してください: ` +
    matches.map(e => `${e.name} (${e.id})`).join(' / '),
  );
}

/** 買い物リストの並び順は order の通し番号。既存の最大値の次を割り当てる */
export function nextOrder(circles: Circle[], eventId: string): number {
  const scoped = circles.filter(c => c.eventId === eventId);
  return scoped.length === 0 ? 0 : Math.max(...scoped.map(c => c.order)) + 1;
}

/** X の URL からハンドル名を取り出す。取れなければ null */
export function xHandleFrom(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

/** スペース表記。入っている項目だけを繋ぐ */
export function spaceLabel(c: Pick<Circle, 'hall' | 'block' | 'number'>): string {
  return [c.hall, c.block, c.number].filter(Boolean).join(' ');
}

/** サークルの色分けに使えるパレットのキー。frontend/src/lib/circleColors.ts と対 */
export const CIRCLE_COLOR_KEYS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'violet', 'pink',
] as const;

/** 一覧レスポンスで使うサークルの要約 */
export function circleSummary(c: Circle) {
  return {
    id: c.id,
    name: c.name,
    author: c.author,
    location: spaceLabel(c),
    status: c.status,
    color: c.color ?? null,
    xUrl: c.xUrl ?? null,
    pinned: c.mapX != null && c.mapY != null,
    mapPage: c.mapPage ?? null,
  };
}
