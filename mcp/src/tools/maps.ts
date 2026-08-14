import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { describeError, fail, guard, resolveEvent } from '../shared.js';

export const registerMapTools: ToolModule = (server, client) => {
  server.registerTool(
    'list_venue_maps',
    {
      title: '会場マップの一覧',
      description:
        '登録済みの会場マップを一覧する。ホールとページの構成、ピンの数を返す。' +
        '複数ページ PDF はページごとに 1 枚として登録される。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
      },
    },
    async ({ event }) => guard(async () => {
      const target = await resolveEvent(client, event);
      const maps = (await client.listVenueMaps())
        .filter(m => m.eventId === target.id)
        .sort((a, b) => a.hall.localeCompare(b.hall, 'ja') || (a.page ?? 1) - (b.page ?? 1));
      const circles = (await client.listCircles()).filter(c => c.eventId === target.id);

      return {
        event: { id: target.id, name: target.name },
        maps: maps.map(m => ({
          id: m.id,
          hall: m.hall,
          page: m.page ?? 1,
          // 画像本体は大きいので返さない。中身を見たいときは get_venue_map を使う
          pinnedCircles: circles.filter(
            c => c.hall === m.hall && c.mapX != null && (c.mapPage ?? 1) === (m.page ?? 1),
          ).length,
        })),
      };
    }),
  );

  server.registerTool(
    'get_venue_map',
    {
      title: '会場マップ画像を取得',
      description:
        '指定した即売会・ホール・ページの会場マップ画像を返す。\n' +
        'set_circle_pin でサークルの位置を打つ前にこれで地図を見て、スペース番号から' +
        'おおよその座標（左上を 0,0、右下を 100,100 とした百分率）を判断すること。' +
        '座標は目視判断なので、ずれた場合はアプリの MAP 画面で微調整できる。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
        hall: z.string().optional().describe('ホール名。省略時はその即売会の最初のマップ'),
        page: z.number().int().positive().optional().describe('複数ページ PDF のページ（既定 1）'),
      },
    },
    async ({ event, hall, page }) => {
      try {
        const target = await resolveEvent(client, event);
        const maps = (await client.listVenueMaps()).filter(m => m.eventId === target.id);

        if (maps.length === 0) {
          return fail(`「${target.name}」には会場マップが登録されていません。先にアプリの MAP 画面から画像を登録してください。`);
        }

        const wantPage = page ?? 1;
        const inHall = hall ? maps.filter(m => m.hall === hall) : maps;
        if (inHall.length === 0) {
          return fail(`ホール「${hall}」のマップが見つかりません。登録済み: ${[...new Set(maps.map(m => m.hall))].join(' / ')}`);
        }

        const map = inHall.find(m => (m.page ?? 1) === wantPage) ?? (hall ? undefined : inHall[0]);
        if (!map) {
          const pages = inHall.map(m => m.page ?? 1).sort((a, b) => a - b);
          return fail(`ホール「${hall}」の ${wantPage} ページ目はありません。登録済みページ: ${pages.join(', ')}`);
        }

        const parsed = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(map.imageDataUrl);
        if (!parsed) {
          return fail('マップ画像の形式を解釈できませんでした（data URL ではありません）。');
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                event: target.name,
                hall: map.hall,
                page: map.page ?? 1,
                halls: [...new Set(maps.map(m => m.hall))],
                pagesInHall: inHall.map(m => m.page ?? 1).sort((a, b) => a - b),
              }),
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
        '右下を (100,100) とした百分率。先に get_venue_map で地図を見て位置を判断すること。\n' +
        '複数ページの会場マップでは、ピンは置いたページにだけ表示される。',
      inputSchema: {
        circleId: z.string().min(1).describe('list_circles で得たサークル ID'),
        mapX: z.number().min(0).max(100).describe('横位置（%）'),
        mapY: z.number().min(0).max(100).describe('縦位置（%）'),
        page: z.number().int().positive().optional()
          .describe('複数ページ PDF の何ページ目に置くか（既定 1）'),
      },
    },
    async ({ circleId, mapX, mapY, page }) => guard(async () => {
      const circle = await client.updateCircle(circleId, { mapX, mapY, mapPage: page ?? 1 });
      return {
        id: circle.id, name: circle.name,
        mapX: circle.mapX, mapY: circle.mapY, mapPage: circle.mapPage ?? 1,
      };
    }),
  );

  server.registerTool(
    'clear_circle_pin',
    {
      title: 'サークルのピンを外す',
      description: 'MAP 上に置いたサークルのピンを外す。サークル自体は消えない。',
      inputSchema: {
        circleId: z.string().min(1).describe('list_circles で得たサークル ID'),
      },
    },
    async ({ circleId }) => guard(async () => {
      // undefined を送ると項目ごと無視されるので、明示的に null で消す
      const circle = await client.updateCircle(circleId, {
        mapX: null as unknown as number, mapY: null as unknown as number,
      });
      return { id: circle.id, name: circle.name, pinned: circle.mapX != null };
    }),
  );

  server.registerTool(
    'delete_venue_map',
    {
      title: '会場マップを削除',
      description:
        '会場マップを削除する。ページを指定しなければ、そのホールの全ページを消す。' +
        'サークルのピン座標は残るので、同じホールに新しいマップを登録すると同じ位置に出る。' +
        '取り消しはできないので、実行前にユーザーに確認すること。',
      inputSchema: {
        event: z.string().describe('即売会の ID または名前（部分一致可）'),
        hall: z.string().min(1).describe('ホール名'),
        page: z.number().int().positive().optional().describe('省略時はそのホールの全ページ'),
      },
    },
    async ({ event, hall, page }) => guard(async () => {
      const target = await resolveEvent(client, event);
      let maps = (await client.listVenueMaps())
        .filter(m => m.eventId === target.id && m.hall === hall);
      if (page != null) maps = maps.filter(m => (m.page ?? 1) === page);

      if (maps.length === 0) {
        throw new Error(`「${target.name}」のホール「${hall}」${page != null ? ` ${page} ページ目` : ''}にマップがありません。`);
      }
      for (const m of maps) await client.deleteVenueMap(m.id);
      return { deleted: maps.map(m => ({ hall: m.hall, page: m.page ?? 1 })) };
    }),
  );
};
