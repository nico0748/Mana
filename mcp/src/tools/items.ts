import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { guard, resolveEvent, spaceLabel } from '../shared.js';

export const registerItemTools: ToolModule = (server, client) => {
  server.registerTool(
    'list_circle_items',
    {
      title: '頒布物の一覧',
      description:
        '購入予定の頒布物を一覧する。サークル単位でも即売会単位でも引ける。' +
        '合計金額も返すので、予算の確認にも使える。',
      inputSchema: {
        circleId: z.string().optional().describe('このサークルの頒布物だけに絞る'),
        event: z.string().optional().describe('この即売会の頒布物だけに絞る（ID または名前）'),
        status: z.enum(['pending', 'bought', 'soldout']).optional().describe('この購入状況だけに絞る'),
      },
    },
    async ({ circleId, event, status }) => guard(async () => {
      const circles = await client.listCircles();
      let items = await client.listCircleItems();

      if (circleId) {
        items = items.filter(i => i.circleId === circleId);
      } else if (event) {
        const target = await resolveEvent(client, event);
        const ids = new Set(circles.filter(c => c.eventId === target.id).map(c => c.id));
        items = items.filter(i => ids.has(i.circleId));
      }
      if (status) items = items.filter(i => i.status === status);

      const byId = new Map(circles.map(c => [c.id, c]));
      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      return {
        total,
        count: items.length,
        items: items.map(i => {
          const c = byId.get(i.circleId);
          return {
            id: i.id,
            title: i.title,
            type: i.type,
            price: i.price,
            quantity: i.quantity,
            status: i.status,
            circle: c ? { id: c.id, name: c.name, location: spaceLabel(c) } : null,
          };
        }),
      };
    }),
  );

  server.registerTool(
    'add_circle_items',
    {
      title: '既存サークルに頒布物を追加',
      description: 'すでに登録済みのサークルに、購入予定の頒布物を追加する。circleId は list_circles で調べる。',
      inputSchema: {
        circleId: z.string().min(1),
        items: z.array(z.object({
          title: z.string().min(1),
          price: z.number().int().nonnegative().optional(),
          quantity: z.number().int().positive().optional(),
          type: z.string().optional(),
          coverUrl: z.string().url().optional(),
        })).min(1),
      },
    },
    async ({ circleId, items }) => guard(async () => {
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
      return { items: created };
    }),
  );

  server.registerTool(
    'update_circle_item',
    {
      title: '頒布物を更新',
      description:
        '頒布物のタイトル・価格・数量・購入状況を変更する。指定した項目だけが更新される。' +
        '「これ買えた」なら status=bought、「完売だった」なら status=soldout。',
      inputSchema: {
        itemId: z.string().min(1).describe('list_circle_items で得た頒布物 ID'),
        title: z.string().min(1).optional(),
        price: z.number().int().nonnegative().optional(),
        quantity: z.number().int().positive().optional(),
        type: z.string().optional(),
        coverUrl: z.string().url().optional(),
        status: z.enum(['pending', 'bought', 'soldout']).optional(),
      },
    },
    async ({ itemId, ...patch }) => guard(async () => {
      const i = await client.updateCircleItem(itemId, patch);
      return { id: i.id, title: i.title, price: i.price, quantity: i.quantity, status: i.status };
    }),
  );

  server.registerTool(
    'set_items_status',
    {
      title: '複数の頒布物の購入状況をまとめて変更',
      description:
        '複数の頒布物の購入状況をまとめて更新する。会場で「このサークルの分は全部買えた」' +
        'のようにまとめて記録するときに使う。',
      inputSchema: {
        itemIds: z.array(z.string().min(1)).min(1).describe('対象の頒布物 ID'),
        status: z.enum(['pending', 'bought', 'soldout'])
          .describe('pending=未購入 / bought=購入済 / soldout=完売'),
      },
    },
    async ({ itemIds, status }) => guard(async () => {
      const updated = [];
      for (const id of itemIds) {
        const i = await client.updateCircleItem(id, { status });
        updated.push({ id: i.id, title: i.title, status: i.status });
      }
      return { updated };
    }),
  );

  server.registerTool(
    'delete_circle_item',
    {
      title: '頒布物を削除',
      description: '購入予定の頒布物を 1 件削除する。取り消しはできない。',
      inputSchema: {
        itemId: z.string().min(1).describe('list_circle_items で得た頒布物 ID'),
      },
    },
    async ({ itemId }) => guard(async () => {
      const target = (await client.listCircleItems()).find(i => i.id === itemId);
      await client.deleteCircleItem(itemId);
      return { deleted: { id: itemId, title: target?.title ?? null } };
    }),
  );
};
