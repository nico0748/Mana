# 同人++（doujin++）

蔵書管理 + 同人イベント買い物リスト + 会場マップを一体化した PWA。
React + TypeScript + Vite（フロントエンド）、Express + Prisma + PostgreSQL（バックエンド）で構成し、Docker Compose で一括起動できる。

## ディレクトリ構成

```
doujin++/
├── frontend/                   # React アプリ（Vite ビルド → Nginx 配信）
│   ├── src/
│   │   ├── lib/api.ts          # REST API クライアント（全エンドポイント）
│   │   ├── hooks/              # useBooks, useSync, useVenueRoute
│   │   ├── pages/              # 本棚 / 買い物リスト / MAP / ナビ / ツール
│   │   └── components/         # UI・レイアウト・書籍コンポーネント
│   ├── nginx.conf              # Nginx 設定（SPA フォールバック + /api プロキシ）
│   └── Dockerfile              # multi-stage build（Node → Nginx）
├── backend/                    # Express API サーバー
│   ├── src/
│   │   ├── index.ts            # アプリエントリー（全ルーター登録）
│   │   ├── prisma.ts           # PrismaClient シングルトン
│   │   └── routes/             # books / circles / events / venueMaps 等
│   ├── prisma/
│   │   └── schema.prisma       # DB スキーマ定義・マイグレーション管理
│   └── Dockerfile              # multi-stage build（Node ビルド → 実行）
├── docker-compose.yml          # 3 サービス定義（frontend / backend / db）
└── .env.example                # 環境変数テンプレート
```

## 主要ファイルの説明

| ファイル | 説明 |
|---|---|
| `frontend/src/lib/api.ts` | バックエンド REST API への全リクエストをラップする型付きクライアント |
| `frontend/nginx.conf` | `/api/*` をバックエンドへ転送し、それ以外は `index.html` を返す SPA 設定 |
| `backend/src/index.ts` | Express アプリ本体。`/api/books`, `/api/circles` 等を登録 |
| `backend/prisma/schema.prisma` | テーブル定義のソース。変更後は `prisma migrate dev` でマイグレーション生成 |
| `docker-compose.yml` | 3 サービスの起動順・環境変数・ボリュームをまとめて管理 |

## 外部 API

| API | 用途 |
|---|---|
| [OpenBD](https://openbd.jp/) | ISBN から日本語書籍情報を取得（主要） |
| [Google Books API](https://developers.google.com/books) | ISBN フォールバック・タイトルから書影を取得 |

---

## Docker

### システム構成

```
ブラウザ
  │  :80
  ▼
┌──────────────────────────────────────────────┐
│              Docker Compose ネットワーク      │
│                                              │
│  ┌─────────────┐   /api/*    ┌────────────┐  │
│  │  frontend   │ ──proxy──▶ │  backend   │  │
│  │  Nginx:80   │            │ Express    │  │
│  └─────────────┘            │ :3000      │  │
│                             └─────┬──────┘  │
│                                   │ Prisma  │
│                                   ▼         │
│                          ┌────────────────┐ │
│                          │      db        │ │
│                          │ PostgreSQL     │ │
│                          │ :5432          │ │
│                          └────────────────┘ │
└──────────────────────────────────────────────┘
```

- **frontend（Nginx）** … React アプリの静的ファイルを配信。`/api/*` へのリクエストはバックエンドへ転送するリバースプロキシとして機能する。ブラウザからは全て同一オリジン（`:80`）に見えるため CORS が発生しない。
- **backend（Express）** … REST API サーバー。Prisma 経由で PostgreSQL を操作する。
- **db（PostgreSQL）** … データの永続化先。`postgres_data` ボリュームにマウントしているためコンテナを削除してもデータは残る。

### 前提条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) または Docker Engine + Docker Compose Plugin がインストールされていること

```bash
docker --version          # Docker version 24.x 以上
docker compose version    # Docker Compose version v2.x 以上
```

### 環境変数の設定

```bash
cp .env.example .env
# 必要に応じて .env を編集（デフォルトのままでも動作する）
```

`.env.example` の内容：

```
DATABASE_URL=postgresql://doujin:doujin_password@db:5432/doujin_pp
PORT=3000
```

> **注意**: `.env` はリポジトリにコミットしないこと。`.gitignore` に追加しておくこと。

### 起動・停止

```bash
# 全サービスをビルドして起動（初回・Dockerfile 変更後は --build を付ける）
docker compose up -d --build

# ブラウザで http://localhost:80 にアクセス

# ログをリアルタイムで確認
docker compose logs -f

# 特定サービスのログのみ確認
docker compose logs -f backend

# 停止（コンテナ削除・データは保持）
docker compose down

# 停止 + DB ボリュームも削除（データが全て消える）
docker compose down -v
```

### 各サービスの状態確認

```bash
# 起動中のコンテナ一覧
docker compose ps

# backend コンテナに入って操作
docker compose exec backend sh

# DB に直接接続
docker compose exec db psql -U doujin -d doujin_pp
```

### DB マイグレーション

`backend/prisma/schema.prisma` を変更した場合の手順：

```bash
# 1. ローカルでマイグレーションファイルを生成（開発時）
cd backend
npx prisma migrate dev --name <変更内容の名前>

# 2. 本番（コンテナ起動時）は自動で migrate deploy が実行される
#    backend/Dockerfile の CMD 参照：
#    sh -c "npx prisma migrate deploy && node dist/index.js"
```

### multi-stage build の仕組み

```
frontend/Dockerfile               backend/Dockerfile
─────────────────────             ──────────────────────────
Stage 1: builder (node:22)        Stage 1: builder (node:22)
  npm ci                            npm ci
  npm run build → dist/             npx prisma generate
                                    npm run build → dist/
Stage 2: nginx:alpine
  COPY dist/ → /usr/share/nginx/  Stage 2: node:22-alpine
  COPY nginx.conf                   COPY dist/ node_modules/ prisma/
  EXPOSE 80                         EXPOSE 3000
                                    CMD migrate deploy && node dist/
```

ビルド専用の `node_modules`（数百 MB）は最終イメージに含まれないため、イメージサイズを大幅に削減できる。

### 開発時のローカル起動（Docker を使わない場合）

```bash
# DB のみ Docker で起動
docker compose up -d db

# バックエンドをローカル起動
cd backend
cp ../.env.example .env          # DATABASE_URL の @db を @localhost に書き換える
npm install
npx prisma migrate dev
npm run dev                      # http://localhost:3000

# フロントエンドをローカル起動（別ターミナル）
cd frontend
npm install
npm run dev                      # http://localhost:5173
                                 # vite.config.ts の proxy で /api → localhost:3000 に転送
```

### トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| `backend` が起動直後に落ちる | DB の healthcheck が通るまで待機しているため、初回は少し時間がかかる。`docker compose logs backend` でエラー内容を確認 |
| `relation "Book" does not exist` | マイグレーションが未実行。`docker compose restart backend` で再実行される |
| ポート 80 が使用中 | `docker-compose.yml` の `ports: "80:80"` を `"8080:80"` 等に変更 |
| イメージのキャッシュが古い | `docker compose up -d --build --no-cache` で完全再ビルド |
