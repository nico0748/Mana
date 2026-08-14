import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { CIRCLE_COLOR_KEYS, guard, resolveEvent } from '../shared.js';

export const registerEventTools: ToolModule = (server, client) => {
  server.registerTool(
    'list_events',
    {
      title: '即売会一覧',
      description:
        '登録済みの即売会（イベント）を一覧する。サークルや頒布物を追加する前に、' +
        'どの即売会に紐づけるかをここで確認する。色に付けた名前もここで返る。',
      inputSchema: {},
    },
    async () => guard(async () => {
      const events = await client.listEvents();
      return events.map(e => ({
        id: e.id,
        name: e.name,
        date: e.date ?? null,
        budget: e.budget ?? null,
        colorLabels: e.colorLabels ?? null,
      }));
    }),
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
    async ({ name, date, budget }) => guard(async () => {
      const e = await client.createEvent({ name, date, budget });
      return { id: e.id, name: e.name, date: e.date ?? null };
    }),
  );

  server.registerTool(
    'update_event',
    {
      title: '即売会を更新',
      description:
        '即売会の名前・開催日・予算を変更する。指定した項目だけが更新される。' +
        '色に付ける名前は set_event_color_labels を使うこと。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
        name: z.string().min(1).optional(),
        date: z.string().optional().describe('開催日 YYYY-MM-DD'),
        budget: z.number().int().nonnegative().optional().describe('予算（円）'),
      },
    },
    async ({ event, ...patch }) => guard(async () => {
      const target = await resolveEvent(client, event);
      const updated = await client.updateEvent(target.id, patch);
      return { id: updated.id, name: updated.name, date: updated.date ?? null, budget: updated.budget ?? null };
    }),
  );

  server.registerTool(
    'set_event_color_labels',
    {
      title: '色に名前を付ける',
      description:
        'サークルに付けた色が何を指すかを、即売会ごとに決める（例: red = 代理購入、blue = 自分用）。' +
        '渡した色だけが書き換わり、空文字を渡すとその色の名前を消せる。' +
        '同じ赤でも即売会ごとに意味を変えられる。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
        labels: z.record(z.enum(CIRCLE_COLOR_KEYS), z.string())
          .describe('色キー → 名前。例: { "red": "代理購入", "blue": "自分用" }'),
      },
    },
    async ({ event, labels }) => guard(async () => {
      const target = await resolveEvent(client, event);
      // 渡された色だけを差し替える。既存のラベルは残す。
      const merged = { ...(target.colorLabels ?? {}), ...labels };
      const updated = await client.updateEvent(target.id, { colorLabels: merged });
      return { id: updated.id, name: updated.name, colorLabels: updated.colorLabels ?? null };
    }),
  );

  server.registerTool(
    'delete_event',
    {
      title: '即売会を削除',
      description:
        '即売会を削除する。**紐づくサークルと頒布物も一緒に消える**ので、実行前に必ずユーザーに確認すること。' +
        '取り消しはできない。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
      },
    },
    async ({ event }) => guard(async () => {
      const target = await resolveEvent(client, event);
      // 何が巻き添えで消えるかを返して、ユーザーが影響を把握できるようにする
      const circles = (await client.listCircles()).filter(c => c.eventId === target.id);
      await client.deleteEvent(target.id);
      return {
        deleted: { id: target.id, name: target.name },
        alsoDeletedCircles: circles.length,
      };
    }),
  );
};
