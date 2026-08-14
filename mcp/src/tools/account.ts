import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { guard, nextOrder } from '../shared.js';

export const registerAccountTools: ToolModule = (server, client) => {
  server.registerTool(
    'get_account',
    {
      title: 'アカウントとプランの状況',
      description:
        '現在のプラン、各データの登録上限と使用数を返す。' +
        'まとめて登録する前に、上限に引っかからないか確認するのに使う。' +
        '上限が null の項目は無制限。',
      inputSchema: {},
    },
    async () => guard(async () => {
      const me = await client.getMe();
      const remaining: Record<string, number | null> = {};
      for (const [key, limit] of Object.entries(me.limits)) {
        remaining[key] = limit === null ? null : Math.max(0, limit - (me.usage[key] ?? 0));
      }
      return {
        plan: me.user.plan,
        planStatus: me.user.planStatus,
        email: me.user.email,
        limits: me.limits,
        usage: me.usage,
        remaining,
      };
    }),
  );

  server.registerTool(
    'list_event_templates',
    {
      title: '公式テンプレートの一覧',
      description:
        '運営が承認した即売会テンプレートを一覧する。イベント名・日程・会場マップが入っており、' +
        'import_event_template で自分の即売会として取り込める。',
      inputSchema: {},
    },
    async () => guard(async () => {
      const templates = await client.listEventTemplates();
      return templates.map(t => ({
        id: t.id,
        name: t.name,
        date: t.date ?? null,
        hallCount: t.hallCount,
        circleCount: t.circleCount,
      }));
    }),
  );

  server.registerTool(
    'import_event_template',
    {
      title: 'テンプレートから即売会を取り込む',
      description:
        '公式テンプレートを自分の即売会として取り込む。イベント名・日程・会場マップが作られる。\n' +
        'includeCircles を true にすると、テンプレートに含まれるサークルも未購入の状態で取り込む' +
        '（マップ上のピン位置も引き継ぐ）。既存の即売会には影響しない。',
      inputSchema: {
        templateId: z.string().min(1).describe('list_event_templates で得たテンプレート ID'),
        includeCircles: z.boolean().optional()
          .describe('サークルも取り込むか（既定 false）'),
        name: z.string().optional().describe('作成する即売会名。省略時はテンプレート名'),
      },
    },
    async ({ templateId, includeCircles, name }) => guard(async () => {
      const template = await client.getEventTemplate(templateId);

      const event = await client.createEvent({
        name: name ?? template.name,
        date: template.date,
      });

      // 会場マップはテンプレートに画像込みで入っている。
      // 元の即売会で未登録だったホールは imageDataUrl が空のまま来るので飛ばす。
      let maps = 0;
      for (const m of template.venueMaps) {
        if (!m.imageDataUrl) continue;
        await client.createVenueMap({
          eventId: event.id,
          hall: m.hall,
          page: 1,
          imageDataUrl: m.imageDataUrl,
          ...(m.generatedSvg ? { generatedSvg: m.generatedSvg } : {}),
        });
        maps++;
      }

      let circles = 0;
      if (includeCircles) {
        // 取り込みは新規なので、購入状況は全て未購入から始める
        for (const c of template.circles) {
          await client.createCircle({
            eventId: event.id,
            name: c.name,
            author: c.author,
            hall: c.hall,
            block: c.block,
            number: c.number,
            order: nextOrder([], event.id) + circles,
            status: 'pending',
            ...(c.xUrl ? { xUrl: c.xUrl } : {}),
            ...(c.menuImageUrl ? { menuImageUrl: c.menuImageUrl } : {}),
            ...(c.mapX != null ? { mapX: c.mapX } : {}),
            ...(c.mapY != null ? { mapY: c.mapY } : {}),
          });
          circles++;
        }
      }

      return {
        event: { id: event.id, name: event.name, date: event.date ?? null },
        importedVenueMaps: maps,
        importedCircles: circles,
        skippedVenueMaps: template.venueMaps.length - maps,
      };
    }),
  );
};
