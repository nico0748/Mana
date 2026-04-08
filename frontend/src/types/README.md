# src/types/

アプリケーション全体で共有する TypeScript 型定義を管理するディレクトリ。

## ファイル

### `index.ts`

アプリで使用する主要インターフェースのエクスポートファイル。`venueMap.ts` と `pathfinding.ts` の型も再エクスポートする。

#### `Book` インターフェース

PostgreSQL（Prisma）に保存される書籍データの型定義。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | `string` | ○ | UUID |
| `title` | `string` | ○ | 書籍タイトル |
| `author` | `string` | ○ | 著者名 |
| `circleName` | `string` | - | サークル名（同人誌の場合） |
| `isbn` | `string` | - | ISBN番号 |
| `type` | `'commercial' \| 'doujin'` | ○ | 書籍種別 |
| `category` | `string` | - | カテゴリ・ジャンル |
| `ndcCode` | `string` | - | NDC（日本十進分類法）コード |
| `status` | `BookStatus` | ○ | 所有状態 |
| `price` | `number` | - | 価格 |
| `memo` | `string` | - | 自由メモ |
| `coverUrl` | `string` | - | 書影画像のURL |
| `tags` | `string[]` | - | タグ一覧（同人誌向け） |
| `createdAt` | `number` | ○ | 登録日時（Unix ms） |
| `updatedAt` | `number` | ○ | 更新日時（Unix ms） |

#### `BookStatus` 型

```typescript
type BookStatus = 'owned' | 'lending' | 'borrowed' | 'wishlist' | 'wanted'
// owned:    所持中
// lending:  貸出中
// borrowed: 借り中
// wishlist: 欲しい本リスト
// wanted:   入手希望
```

#### `DoujinEvent` インターフェース

同人即売会イベントの型定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string` | イベント名 |
| `date` | `string` | 開催日（ISO 日付文字列 e.g. "2024-12-30"） |
| `budget` | `number` | 予算 |

#### `Circle` インターフェース

即売会の参加サークル情報の型定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `eventId` | `string` | 紐付くイベントID |
| `name` | `string` | サークル名 |
| `author` | `string` | 著者名 |
| `hall` / `block` / `number` | `string` | 配置場所（ホール・ブロック・スペース番号） |
| `order` | `number` | 巡回順序 |
| `status` | `'pending' \| 'bought' \| 'soldout'` | 購入ステータス |
| `xUrl` | `string` | X (Twitter) プロフィールURL |
| `menuImageUrl` | `string` | メニュー画像URL |
| `mapX` / `mapY` | `number` | マップ上のピン座標（0.0–1.0 の相対座標） |

#### `CircleItem` インターフェース

サークル内の個別頒布物の型定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `circleId` | `string` | 紐付くサークルID |
| `title` | `string` | 頒布物タイトル |
| `type` | `string` | 種別（新刊・既刊等） |
| `price` | `number` | 価格 |
| `quantity` | `number` | 購入数量 |
| `coverUrl` | `string` | 表紙画像URL |
| `status` | `'pending' \| 'bought' \| 'soldout'` | 個別購入ステータス |

#### `VenueMap` インターフェース

会場マップ画像データの型定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `eventId` | `string` | 紐付くイベントID |
| `hall` | `string` | ホール名 |
| `imageDataUrl` | `string` | Base64 エンコードされたマップ画像 |
| `generatedSvg` | `string` | 画像から生成した SVG データ |

#### `Distribution` インターフェース

自家頒布物の在庫管理データの型定義。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `title` | `string` | 頒布物タイトル |
| `price` | `number` | 頒布価格 |
| `stock` | `number` | 在庫数 |
| `sold` | `number` | 販売数 |
| `coverUrl` | `string` | 表紙画像URL |

---

### `venueMap.ts`

会場レイアウト構造の型定義。`index.ts` から再エクスポートされる。

- `Point`, `Rect`, `HallArea`, `BlockNaming`
- `Hall`, `Block`, `Space`, `HallConnection`, `VenueLayout`

---

### `pathfinding.ts`

会場内経路探索（ダイクストラ法）のグラフデータ型定義。`index.ts` から再エクスポートされる。

- `MapNodeType`, `MapEdgeType`
- `MapNode`, `MapEdge`, `VenueGraph`
- `PathSegment`, `PathResult`

---

### `template.ts`

公式テンプレートデータ（即売会・ホール一覧）の型定義。

---

### `imagetracerjs.d.ts`

`ImageTracer.js`（ビットマップ→SVG 変換ライブラリ）の TypeScript 型宣言ファイル。
