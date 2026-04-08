# backend/

Express + TypeScript + Prisma で構成された REST API サーバー。Firebase Admin SDK でリクエストの認証を行い、PostgreSQL にデータを永続化する。

## 技術スタック

| 技術 | 用途 |
|---|---|
| Express | HTTP サーバー・ルーティング |
| TypeScript | 型安全な実装 |
| Prisma ORM | PostgreSQL アクセス・マイグレーション管理 |
| Firebase Admin SDK | Firebase ID トークン検証（認証） |
| `dotenv` | 環境変数管理 |

## ディレクトリ構成

```
backend/
├── src/
│   ├── index.ts          # アプリエントリー（ミドルウェア・ルーター登録）
│   ├── prisma.ts         # PrismaClient シングルトン
│   ├── middleware/
│   │   └── auth.ts       # Firebase ID トークン検証ミドルウェア
│   └── routes/
│       ├── books.ts      # /api/books
│       ├── events.ts     # /api/events
│       ├── circles.ts    # /api/circles
│       ├── circleItems.ts # /api/circle-items
│       ├── venueMaps.ts  # /api/venue-maps
│       ├── distributions.ts # /api/distributions
│       └── sync.ts       # /api/sync（インポート・エクスポート）
└── prisma/
    ├── schema.prisma     # DB スキーマ定義
    └── migrations/       # Prisma マイグレーションファイル
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `PORT` | リッスンポート（デフォルト: `3000`） |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Firebase サービスアカウント JSON を Base64 エンコードしたもの |
| `CORS_ORIGIN` | 許可する CORS オリジン（未設定時は全許可） |

## 起動

```bash
npm install
npm run dev    # ts-node で開発サーバー起動
npm run build  # TypeScript コンパイル → dist/
npm start      # dist/index.js を実行
```

本番（Docker）では `prisma migrate deploy && node dist/index.js` が実行される（`Dockerfile` の CMD 参照）。

## 認証フロー

全 `/api/*` リクエストは `authenticate` ミドルウェアを通過する。

```
リクエスト
  → authenticate ミドルウェア
  → Authorization: Bearer <ID Token> を検証（Firebase Admin SDK）
  → 検証成功: req.uid = decoded.uid → 次のルートへ
  → 検証失敗: 401 Unauthorized
```

各ルートは `(req as any).uid` からログインユーザーの UID を取得し、自分のデータのみを CRUD する。

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/books` | 書籍一覧取得（自分のデータのみ） |
| POST | `/api/books` | 書籍作成 |
| PUT | `/api/books/:id` | 書籍更新 |
| DELETE | `/api/books/:id` | 書籍削除 |
| GET | `/api/events` | イベント一覧 |
| POST/PUT/DELETE | `/api/events/:id` | イベント CRUD |
| GET | `/api/circles` | サークル一覧 |
| POST/PUT/DELETE | `/api/circles/:id` | サークル CRUD |
| POST | `/api/circles/bulk` | サークル一括作成 |
| GET | `/api/circle-items` | サークルアイテム一覧 |
| POST/PUT/DELETE | `/api/circle-items/:id` | アイテム CRUD |
| GET | `/api/venue-maps` | マップ一覧 |
| POST/PUT/DELETE | `/api/venue-maps/:id` | マップ CRUD |
| GET | `/api/distributions` | 頒布物一覧 |
| POST/PUT/DELETE | `/api/distributions/:id` | 頒布物 CRUD |
| GET | `/api/sync/export` | 全データエクスポート（JSON） |
| POST | `/api/sync/import` | データインポート（upsert） |
