# backend/src/

Express アプリのソースコード。

## ファイル

### `index.ts`

Express アプリのエントリーポイント。ミドルウェアとルーターを登録する。

**設定:**
- `app.disable('x-powered-by')` — X-Powered-By ヘッダーを除去（サーバー情報の露出防止）
- `app.set('trust proxy', 1)` — Cloudflare 経由の実 IP を取得
- CORS: `CORS_ORIGIN` 環境変数で許可オリジンを制御
- `express.json({ limit: '50mb' })` — 画像 Data URL の送受信を許容

**ルート登録:**
```
/api  → authenticate ミドルウェア（全 API リクエストを認証）
/api/books        → booksRouter
/api/events       → eventsRouter
/api/circles      → circlesRouter
/api/circle-items → circleItemsRouter
/api/venue-maps   → venueMapsRouter
/api/distributions → distributionsRouter
/api/sync         → syncRouter
```

---

### `prisma.ts`

`PrismaClient` のシングルトンインスタンスをエクスポートするファイル。アプリ全体でクライアントを共有し、接続プールの重複生成を防ぐ。

```typescript
import { prisma } from './prisma';
```

## サブディレクトリ

| ディレクトリ | 内容 |
|---|---|
| [middleware/](middleware/README.md) | Firebase ID トークン検証ミドルウェア |
| [routes/](routes/README.md) | API エンドポイント（リソースごとに分割） |
