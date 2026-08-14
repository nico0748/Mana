import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { CIRCLE_COLOR_KEYS, circleSummary, guard, nextOrder, resolveEvent, xHandleFrom } from '../shared.js';

const itemSchema = z.object({
  title: z.string().min(1).describe('頒布物のタイトル'),
  price: z.number().int().nonnegative().optional().describe('価格（円、既定 0）'),
  quantity: z.number().int().positive().optional().describe('購入予定数（既定 1）'),
  type: z.string().optional().describe('種別（例: 新刊 / 既刊 / グッズ）'),
  coverUrl: z.string().url().optional().describe('表紙画像の URL'),
});

const colorField = z.enum(CIRCLE_COLOR_KEYS).nullable().optional()
  .describe(
    'サークルの色分け。ジャンル分けや、代理購入と自分用の区別に使う。' +
    'null で色を外す。色の意味は set_event_color_labels で名前を付けられる',
  );

export const registerCircleTools: ToolModule = (server, client) => {
  server.registerTool(
    'list_circles',
    {
      title: 'サークル一覧',
      description:
        '指定した即売会の買い物リスト（サークル）を一覧する。circleId を調べるのに使う。' +
        '色や購入ステータスでの絞り込みもできる。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
        color: z.enum(CIRCLE_COLOR_KEYS).optional().describe('この色のサークルだけに絞る'),
        status: z.enum(['pending', 'bought', 'soldout']).optional().describe('この購入状況だけに絞る'),
      },
    },
    async ({ event, color, status }) => guard(async () => {
      const target = await resolveEvent(client, event);
      let circles = (await client.listCircles()).filter(c => c.eventId === target.id);
      if (color) circles = circles.filter(c => c.color === color);
      if (status) circles = circles.filter(c => c.status === status);
      return {
        event: { id: target.id, name: target.name, colorLabels: target.colorLabels ?? null },
        circles: circles.map(circleSummary),
      };
    }),
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
        color: colorField,
        items: z.array(itemSchema).optional().describe('購入予定の頒布物'),
      },
    },
    async ({ event, name, author, hall, block, number, xUrl, color, items }) => guard(async () => {
      const target = await resolveEvent(client, event);
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
        ...(color !== undefined ? { color } : {}),
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

      return {
        event: { id: target.id, name: target.name },
        circle: { id: circle.id, name: circle.name, color: circle.color ?? null },
        items: created,
        // xUrl が不正なスキームだとサーバ側で落とされるので、保存結果を明示する
        xUrlSaved: circle.xUrl ?? null,
      };
    }),
  );

  server.registerTool(
    'update_circle',
    {
      title: 'サークルを更新',
      description:
        'サークルの情報を変更する。指定した項目だけが更新される。\n' +
        '購入状況（status）と色（color）もここで変える。' +
        '「買えた」なら status=bought、「完売だった」なら status=soldout。',
      inputSchema: {
        circleId: z.string().min(1).describe('list_circles で得たサークル ID'),
        name: z.string().min(1).optional(),
        author: z.string().optional(),
        hall: z.string().optional(),
        block: z.string().optional(),
        number: z.string().optional(),
        xUrl: z.string().url().optional(),
        color: colorField,
        status: z.enum(['pending', 'bought', 'soldout']).optional()
          .describe('購入状況。pending=未購入 / bought=購入済 / soldout=完売'),
      },
    },
    async ({ circleId, ...patch }) => guard(async () => {
      const updated = await client.updateCircle(circleId, patch);
      return circleSummary(updated);
    }),
  );

  server.registerTool(
    'set_circles_color',
    {
      title: '複数サークルの色をまとめて変更',
      description:
        '複数のサークルに同じ色をまとめて付ける。ジャンルごとの色分けや、' +
        '代理購入分をまとめて塗るときに使う。null を渡すと色を外す。',
      inputSchema: {
        circleIds: z.array(z.string().min(1)).min(1).describe('対象のサークル ID'),
        color: z.enum(CIRCLE_COLOR_KEYS).nullable().describe('付ける色。null で色なしに戻す'),
      },
    },
    async ({ circleIds, color }) => guard(async () => {
      const updated = [];
      for (const id of circleIds) {
        const c = await client.updateCircle(id, { color });
        updated.push({ id: c.id, name: c.name, color: c.color ?? null });
      }
      return { updated };
    }),
  );

  server.registerTool(
    'delete_circle',
    {
      title: 'サークルを削除',
      description:
        '買い物リストからサークルを削除する。**そのサークルの頒布物も一緒に消える**ので、' +
        '実行前にユーザーに確認すること。取り消しはできない。',
      inputSchema: {
        circleId: z.string().min(1).describe('list_circles で得たサークル ID'),
      },
    },
    async ({ circleId }) => guard(async () => {
      const circles = await client.listCircles();
      const target = circles.find(c => c.id === circleId);
      const items = (await client.listCircleItems()).filter(i => i.circleId === circleId);
      await client.deleteCircle(circleId);
      return {
        deleted: { id: circleId, name: target?.name ?? null },
        alsoDeletedItems: items.length,
      };
    }),
  );
};
