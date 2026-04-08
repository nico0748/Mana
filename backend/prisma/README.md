# backend/prisma/

Prisma ORM のスキーマ定義とマイグレーション履歴を管理するディレクトリ。

## ファイル

### `schema.prisma`

データベーススキーマの定義ファイル。変更後は `prisma migrate dev` でマイグレーションファイルを生成する。

**データソース:** PostgreSQL（`DATABASE_URL` 環境変数）

**モデル一覧:**

| モデル | テーブル | 説明 |
|---|---|---|
| `Book` | `Book` | 書籍データ（商業誌・同人誌） |
| `DoujinEvent` | `DoujinEvent` | 同人即売会イベント |
| `Circle` | `Circle` | サークル（`DoujinEvent` に属する） |
| `CircleItem` | `CircleItem` | サークル内個別頒布アイテム（`Circle` に属する） |
| `VenueMap` | `VenueMap` | 会場マップ画像 |
| `Distribution` | `Distribution` | 自家頒布物（在庫管理） |

**リレーション:**
```
DoujinEvent (1) ─── (N) Circle (1) ─── (N) CircleItem
```
- `Circle.eventId` → `DoujinEvent.id`（`onDelete: Cascade`）
- `CircleItem.circleId` → `Circle.id`（`onDelete: Cascade`）

**共通フィールド（全モデル）:**
- `id: String @id @default(uuid())` — UUID プライマリキー
- `userId: String?` — Firebase UID（nullable: マルチユーザー対応）
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

---

## migrations/

Prisma が自動生成するマイグレーションファイルの履歴。

| マイグレーション | 内容 |
|---|---|
| `20260320195651_init` | 初期スキーマ（Book・DoujinEvent・Circle・VenueMap・Distribution） |
| `20260325000000_add_circle_x_url` | `Circle.xUrl` フィールド追加 |
| `20260327000000_add_user_id` | 全モデルに `userId` フィールド追加（マルチユーザー対応） |
| `20260327155857_add_circle_item_status` | `CircleItem.status` フィールド追加 |
| `20260331000000_add_book_tags` | `Book.tags String[]` フィールド追加（同人誌タグ） |
| `20260331000001_add_book_circle_name` | `Book.circleName` フィールド追加 |

**マイグレーション実行コマンド:**

```bash
# 開発環境（マイグレーションファイルを生成して適用）
npx prisma migrate dev --name <変更内容の名前>

# 本番環境（既存のマイグレーションファイルを適用のみ）
npx prisma migrate deploy
```

本番 Docker では `backend/Dockerfile` の CMD に `prisma migrate deploy` が含まれており、コンテナ起動時に自動実行される。
