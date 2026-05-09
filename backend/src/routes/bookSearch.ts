import { Router } from 'express';
import rateLimit from 'express-rate-limit';

// 楽天ブックス書籍検索 API のフロントエンド向けプロキシ。
//
// なぜプロキシするか:
//  - 楽天 WebService は CORS を設定していないため、ブラウザ直接呼び出しは失敗する
//  - applicationId（実質 API キー）をクライアントに露出したくない
//  - 楽天側のレート制限（1秒/req 程度）はサーバ側で吸収する方が望ましい
//
// 環境変数 `RAKUTEN_APP_ID` が未設定の場合は 503 を返してフロント側でスキップさせる。

const RAKUTEN_BOOKS_API = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404';

// 楽天 API はアプリ単位で 1 秒 1 リクエスト程度が目安。本番ユーザー数で過剰にリクエストが集中しないよう
// 軽くレート制限を掛けておく（VPS 単一 IP からの outbound を考慮）。
const rateLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

export const publicBookSearchRouter = Router();

publicBookSearchRouter.use(rateLimiter);

publicBookSearchRouter.get('/rakuten', async (req, res) => {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    res.status(503).json({ error: 'rakuten_unavailable' });
    return;
  }

  const { title, isbn } = req.query;
  const hits = Math.min(30, Math.max(1, Number(req.query.hits ?? 30) || 30));

  if (typeof title !== 'string' && typeof isbn !== 'string') {
    res.status(400).json({ error: 'title_or_isbn_required' });
    return;
  }

  const params = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    formatVersion: '2',
    hits: String(hits),
    booksGenreId: '001', // 「本」ジャンル全体
  });
  if (typeof title === 'string' && title.trim()) params.set('title', title.trim());
  if (typeof isbn === 'string' && isbn.trim()) params.set('isbn', isbn.replace(/-/g, '').trim());

  try {
    const r = await fetch(`${RAKUTEN_BOOKS_API}?${params.toString()}`);
    if (!r.ok) {
      // 楽天側のエラーをそのまま返さず、コードだけ通知する
      console.warn('[rakuten-search] upstream non-OK', r.status);
      res.status(502).json({ error: 'upstream_error' });
      return;
    }
    const data = await r.json();
    // formatVersion=2 のレスポンスは Items が直接配列で各要素が item の中身（Item ラッパなし）
    res.json(data);
  } catch (err) {
    console.error('[rakuten-search] upstream fetch failed', err);
    res.status(502).json({ error: 'upstream_error' });
  }
});
