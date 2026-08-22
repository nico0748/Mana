import { z } from 'zod';
import type { ToolModule } from '../shared.js';
import { guard } from '../shared.js';
import { searchBookCovers } from '../coverSearch.js';

const BOOK_STATUS = ['owned', 'lending', 'borrowed', 'wishlist', 'wanted'] as const;

export const registerBookTools: ToolModule = (server, client) => {
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
    async ({ title, limit }) => guard(async () => {
      const candidates = await searchBookCovers(client, title, limit ?? 5);
      if (candidates.length === 0) {
        return {
          candidates: [],
          note: '該当なし。同人誌の場合は商業データベースに載っていないため、書影 URL を別途指定してください。',
        };
      }
      return { candidates };
    }),
  );

  server.registerTool(
    'list_books',
    {
      title: '蔵書の一覧・検索',
      description:
        '蔵書（本棚）を一覧する。キーワードや種別、所持状況で絞り込める。' +
        '更新や削除の前に book ID を調べるのにも使う。',
      inputSchema: {
        query: z.string().optional().describe('書名・著者・サークル名・シリーズの部分一致'),
        type: z.enum(['commercial', 'doujin']).optional().describe('商業誌 / 同人誌'),
        status: z.enum(BOOK_STATUS).optional().describe('所持状況'),
        limit: z.number().int().min(1).max(200).optional().describe('返す最大件数（既定 50）'),
      },
    },
    async ({ query, type, status, limit }) => guard(async () => {
      let books = await client.listBooks();
      if (type) books = books.filter(b => b.type === type);
      if (status) books = books.filter(b => b.status === status);
      if (query) {
        const q = query.normalize('NFC').toLowerCase();
        const hit = (v?: string | null) => !!v && v.normalize('NFC').toLowerCase().includes(q);
        books = books.filter(b => hit(b.title) || hit(b.author) || hit(b.circleName) || hit(b.series));
      }
      const capped = books.slice(0, limit ?? 50);
      return {
        total: books.length,
        returned: capped.length,
        books: capped.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          type: b.type,
          circleName: b.circleName ?? null,
          series: b.series ?? null,
          status: b.status,
          price: b.price ?? null,
          coverUrl: b.coverUrl ?? null,
        })),
      };
    }),
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
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        price: z.number().int().nonnegative().optional().describe('価格（円）'),
        memo: z.string().optional(),
        status: z.enum(BOOK_STATUS).optional().describe('所持状況（既定 owned）'),
      },
    },
    async (args) => guard(async () => {
      const book = await client.createBook({
        ...args,
        type: args.type ?? 'doujin',
        // 同人誌は著者名かサークル名のどちらかがあればよい運用なので、空文字で通す
        author: args.author ?? args.circleName ?? '',
        status: args.status ?? 'owned',
        tags: args.tags ?? [],
      });
      return { id: book.id, title: book.title, coverUrl: book.coverUrl ?? null };
    }),
  );

  server.registerTool(
    'update_book',
    {
      title: '蔵書を更新',
      description:
        '蔵書の情報を変更する。指定した項目だけが更新される。' +
        '「貸した」なら status=lending、「借りた」なら status=borrowed、' +
        '「手放した」なら status=sold ではなく wishlist などは使わず、所持一覧から外したい場合は削除する。',
      inputSchema: {
        bookId: z.string().min(1).describe('list_books で得た本の ID'),
        title: z.string().min(1).optional(),
        author: z.string().optional(),
        circleName: z.string().optional(),
        coverUrl: z.string().url().optional(),
        series: z.string().optional(),
        genre: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        price: z.number().int().nonnegative().optional(),
        memo: z.string().optional(),
        status: z.enum(BOOK_STATUS).optional(),
      },
    },
    async ({ bookId, ...patch }) => guard(async () => {
      const b = await client.updateBook(bookId, patch);
      return { id: b.id, title: b.title, status: b.status };
    }),
  );

  server.registerTool(
    'delete_book',
    {
      title: '蔵書から本を削除',
      description: '蔵書から本を 1 冊削除する。取り消しはできないので、実行前にユーザーに確認すること。',
      inputSchema: {
        bookId: z.string().min(1).describe('list_books で得た本の ID'),
      },
    },
    async ({ bookId }) => guard(async () => {
      const target = (await client.listBooks()).find(b => b.id === bookId);
      await client.deleteBook(bookId);
      return { deleted: { id: bookId, title: target?.title ?? null } };
    }),
  );
};
