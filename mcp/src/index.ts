#!/usr/bin/env node
/**
 * 同人++ MCP サーバ（stdio）。
 *
 * Claude から蔵書・買い物リスト・MAP を操作するためのツール群を公開する。
 * 認証は設定 → 連携 で発行した API キー（環境変数 MANA_API_KEY）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ManaClient, ManaApiError, type Circle, type DoujinEvent } from './client.js';
import { searchBookCovers } from './coverSearch.js';

const BASE_URL = (process.env.MANA_BASE_URL ?? 'https://doujin-pp.com').replace(/\/+$/, '');
const API_KEY = process.env.MANA_API_KEY;

if (!API_KEY) {
  console.error(
    '[doujin-pp-mcp] 環境変数 MANA_API_KEY が未設定です。\n' +
    '同人++ の 設定 → 連携 → API キー から発行して設定してください。',
  );
  process.exit(1);
}

const client = new ManaClient(BASE_URL, API_KEY);

// ── レスポンスヘルパ ────────────────────────────────────────────────────────

const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

/** API エラーを Claude が読んで対処できる日本語メッセージに変換する */
function describeError(err: unknown): string {
  if (err instanceof ManaApiError) {
    if (err.status === 401) return '認証に失敗しました。MANA_API_KEY が正しいか、失効していないか確認してください。';
    if (err.status === 403) return '権限がありません。API キーでは管理者操作はできません。';
    if (err.status === 402 || err.body.includes('plan_limit')) {
      return 'プランの上限に達しています。不要なデータを整理するか、Pro プランをご検討ください。';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

// ── 共通ロジック ────────────────────────────────────────────────────────────

/** eventId そのもの、または即売会名（部分一致）から即売会を1件に決める */
async function resolveEvent(ref: string): Promise<DoujinEvent> {
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

/** 買い物リストの並び順は order の通し番号。既存の最大値の次を割り当てる。 */
function nextOrder(circles: Circle[], eventId: string): number {
  const scoped = circles.filter(c => c.eventId === eventId);
  return scoped.length === 0 ? 0 : Math.max(...scoped.map(c => c.order)) + 1;
}

/** X の URL からハンドル名を取り出す。取れなければ null。 */
function xHandleFrom(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

// ── サーバ定義 ──────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'doujin-pp', version: '1.0.0' });

server.registerTool(
  'list_events',
  {
    title: '即売会一覧',
    description:
      '登録済みの即売会（イベント）を一覧する。サークルや頒布物を追加する前に、' +
      'どの即売会に紐づけるかをここで確認する。',
    inputSchema: {},
  },
  async () => {
    try {
      const events = await client.listEvents();
      return ok(events.map(e => ({ id: e.id, name: e.name, date: e.date ?? null })));
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'create_event',
  {
    title: '即売会を作成',
    description: '新しい即売会を登録する。既存の即売会に追加したいだけなら list_events を使うこと。',
    inputSchema: {
      name: z.string().min(1).describe('即売会名（例: コミックマーケット107）'),
      date: z.string().optional().describe('開催日 YYYY-MM-DD'),
      budget: z.number().int().nonnegative().optional().describe('予算（円）'),
    },
  },
  async ({ name, date, budget }) => {
    try {
      const event = await client.createEvent({ name, date, budget });
      return ok({ id: event.id, name: event.name, date: event.date ?? null });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'search_book_cover',
  {
    title: 'タイトルから書影 URL を検索',
    description:
      'タイトルで商業出版物のデータベース（楽天ブックス / OpenBD / Google Books）を検索し、' +
      '書影画像の URL 候補を返す。add_book の coverUrl にそのまま渡せる。\n' +
      '注意: 同人誌はこれらのデータベースに登録されていないため、ほぼヒットしない。' +
      '同人誌の書影は X の投稿画像などから URL を得て、add_book に直接指定すること。',
    inputSchema: {
      title: z.string().min(1).describe('書名'),
      limit: z.number().int().min(1).max(10).optional().describe('返す候補の最大数（既定 5）'),
    },
  },
  async ({ title, limit }) => {
    try {
      const candidates = await searchBookCovers(client, title, limit ?? 5);
      if (candidates.length === 0) {
        return ok({
          candidates: [],
          note: '該当なし。同人誌の場合は商業データベースに載っていないため、書影 URL を別途指定してください。',
        });
      }
      return ok({ candidates });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'add_book',
  {
    title: '蔵書に本を追加',
    description:
      '蔵書（本棚）に 1 冊追加する。coverUrl は search_book_cover の結果や、' +
      'X の投稿画像の URL をそのまま渡せる。',
    inputSchema: {
      title: z.string().min(1).describe('書名'),
      author: z.string().optional().describe('著者名。同人誌で不明ならサークル名を入れる'),
      type: z.enum(['commercial', 'doujin']).optional().describe('商業誌 or 同人誌（既定 doujin）'),
      circleName: z.string().optional().describe('サークル名（同人誌のとき）'),
      coverUrl: z.string().url().optional().describe('書影画像の URL'),
      isbn: z.string().optional(),
      series: z.string().optional().describe('シリーズ名'),
      genre: z.string().optional().describe('ジャンル'),
      tags: z.array(z.string()).optional(),
      price: z.number().int().nonnegative().optional().describe('価格（円）'),
      memo: z.string().optional(),
      status: z
        .enum(['owned', 'lending', 'borrowed', 'wanted', 'sold'])
        .optional()
        .describe('所持状況（既定 owned）'),
    },
  },
  async (args) => {
    try {
      const type = args.type ?? 'doujin';
      const book = await client.createBook({
        ...args,
        type,
        // 同人誌は著者名かサークル名のどちらかがあればよい運用なので、空文字で通す
        author: args.author ?? args.circleName ?? '',
        status: args.status ?? 'owned',
        tags: args.tags ?? [],
      });
      return ok({ id: book.id, title: book.title, coverUrl: book.coverUrl ?? null });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'list_circles',
  {
    title: 'サークル一覧',
    description: '指定した即売会の買い物リスト（サークル）を一覧する。ピン設定の前に circleId を調べるのにも使う。',
    inputSchema: {
      event: z.string().describe('即売会の ID または名前（部分一致可）'),
    },
  },
  async ({ event }) => {
    try {
      const target = await resolveEvent(event);
      const circles = (await client.listCircles()).filter(c => c.eventId === target.id);
      return ok({
        event: { id: target.id, name: target.name },
        circles: circles.map(c => ({
          id: c.id,
          name: c.name,
          author: c.author,
          location: [c.hall, c.block, c.number].filter(Boolean).join(' '),
          status: c.status,
          xUrl: c.xUrl ?? null,
          pinned: c.mapX != null && c.mapY != null,
        })),
      });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'add_circle',
  {
    title: 'サークルと購入予定アイテムを追加',
    description:
      '即売会の買い物リストにサークルを 1 つ追加し、あわせて購入予定の頒布物も登録する。\n' +
      'X（Twitter）のお品書きから登録する場合: この MCP サーバは X を読めないため、' +
      '呼び出す側（Claude）が投稿やプロフィールの内容を読み取り、サークル名・スペース・' +
      '頒布物・価格をこの引数に構造化して渡すこと。xUrl を渡しておくとアプリ内から' +
      'そのサークルの X を開けるようになる。',
    inputSchema: {
      event: z.string().describe('即売会の ID または名前（部分一致可）'),
      name: z.string().min(1).describe('サークル名'),
      author: z.string().optional().describe('作者名'),
      hall: z.string().optional().describe('ホール（例: 東1）'),
      block: z.string().optional().describe('ブロック（例: A）'),
      number: z.string().optional().describe('スペース番号（例: 01a）'),
      xUrl: z.string().url().optional().describe('サークルの X の URL'),
      items: z
        .array(
          z.object({
            title: z.string().min(1).describe('頒布物のタイトル'),
            price: z.number().int().nonnegative().optional().describe('価格（円、既定 0）'),
            quantity: z.number().int().positive().optional().describe('購入予定数（既定 1）'),
            type: z.string().optional().describe('種別（例: 新刊 / 既刊 / グッズ）'),
            coverUrl: z.string().url().optional().describe('表紙画像の URL'),
          }),
        )
        .optional()
        .describe('購入予定の頒布物'),
    },
  },
  async ({ event, name, author, hall, block, number, xUrl, items }) => {
    try {
      const target = await resolveEvent(event);
      const existing = await client.listCircles();

      const circle = await client.createCircle({
        eventId: target.id,
        name,
        // X の URL しか手がかりがない場合、作者名の代わりにハンドルを入れておくと後で照合しやすい
        author: author ?? (xUrl ? (xHandleFrom(xUrl) ?? '') : ''),
        hall: hall ?? '',
        block: block ?? '',
        number: number ?? '',
        order: nextOrder(existing, target.id),
        status: 'pending',
        ...(xUrl ? { xUrl } : {}),
      });

      const created = [];
      for (const item of items ?? []) {
        const saved = await client.createCircleItem({
          circleId: circle.id,
          title: item.title,
          type: item.type ?? '同人誌',
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          ...(item.coverUrl ? { coverUrl: item.coverUrl } : {}),
        });
        created.push({ id: saved.id, title: saved.title, price: saved.price });
      }

      return ok({
        event: { id: target.id, name: target.name },
        circle: { id: circle.id, name: circle.name },
        items: created,
        // xUrl が不正なスキームだとサーバ側で落とされるので、保存結果を明示する
        xUrlSaved: circle.xUrl ?? null,
      });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'add_circle_items',
  {
    title: '既存サークルに頒布物を追加',
    description: 'すでに登録済みのサークルに、購入予定の頒布物を追加する。circleId は list_circles で調べる。',
    inputSchema: {
      circleId: z.string().min(1),
      items: z
        .array(
          z.object({
            title: z.string().min(1),
            price: z.number().int().nonnegative().optional(),
            quantity: z.number().int().positive().optional(),
            type: z.string().optional(),
            coverUrl: z.string().url().optional(),
          }),
        )
        .min(1),
    },
  },
  async ({ circleId, items }) => {
    try {
      const created = [];
      for (const item of items) {
        const saved = await client.createCircleItem({
          circleId,
          title: item.title,
          type: item.type ?? '同人誌',
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          ...(item.coverUrl ? { coverUrl: item.coverUrl } : {}),
        });
        created.push({ id: saved.id, title: saved.title, price: saved.price });
      }
      return ok({ items: created });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'get_venue_map',
  {
    title: '会場マップ画像を取得',
    description:
      '指定した即売会・ホールの会場マップ画像を返す。\n' +
      'set_circle_pin でサークルの位置を打つ前にこれで地図を見て、スペース番号から' +
      'おおよその座標（左上を 0,0、右下を 100,100 とした百分率）を判断すること。' +
      '座標は目視判断なので、ずれた場合はアプリの MAP 画面で微調整できる。',
    inputSchema: {
      event: z.string().describe('即売会の ID または名前（部分一致可）'),
      hall: z.string().optional().describe('ホール名。省略時はその即売会の最初のマップを返す'),
    },
  },
  async ({ event, hall }) => {
    try {
      const target = await resolveEvent(event);
      const maps = (await client.listVenueMaps()).filter(m => m.eventId === target.id);

      if (maps.length === 0) {
        return fail(`「${target.name}」には会場マップが登録されていません。先にアプリの MAP 画面から画像を登録してください。`);
      }

      const map = hall ? maps.find(m => m.hall === hall) : maps[0];
      if (!map) {
        return fail(`ホール「${hall}」のマップが見つかりません。登録済み: ${maps.map(m => m.hall).join(' / ')}`);
      }

      const parsed = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(map.imageDataUrl);
      if (!parsed) {
        return fail('マップ画像の形式を解釈できませんでした（data URL ではありません）。');
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ event: target.name, hall: map.hall, halls: maps.map(m => m.hall) }),
          },
          { type: 'image' as const, data: parsed[2], mimeType: parsed[1] },
        ],
      };
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

server.registerTool(
  'set_circle_pin',
  {
    title: 'サークルを MAP に配置',
    description:
      'サークルの MAP 上の位置を設定する。座標は会場マップ画像の左上を (0,0)、' +
      '右下を (100,100) とした百分率。先に get_venue_map で地図を見て位置を判断すること。',
    inputSchema: {
      circleId: z.string().min(1).describe('list_circles で得たサークル ID'),
      mapX: z.number().min(0).max(100).describe('横位置（%）'),
      mapY: z.number().min(0).max(100).describe('縦位置（%）'),
    },
  },
  async ({ circleId, mapX, mapY }) => {
    try {
      const circle = await client.updateCircle(circleId, { mapX, mapY });
      return ok({ id: circle.id, name: circle.name, mapX: circle.mapX, mapY: circle.mapY });
    } catch (err) {
      return fail(describeError(err));
    }
  },
);

// ── 起動 ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout は MCP の通信路なので、ログは必ず stderr に出す
  console.error(`[doujin-pp-mcp] connected (base: ${BASE_URL})`);
}

main().catch(err => {
  console.error('[doujin-pp-mcp] fatal', err);
  process.exit(1);
});
