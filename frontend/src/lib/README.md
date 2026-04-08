# src/lib/

外部サービスの SDK 初期化・REST API クライアント・汎用ユーティリティ関数を格納するディレクトリ。

## ファイル

### `firebase.ts`

Firebase SDK の初期化と認証インスタンスのエクスポートを行うファイル。

**エクスポート:**
| エクスポート名 | 型 | 説明 |
|---|---|---|
| `app` | `FirebaseApp` | Firebase アプリインスタンス |
| `auth` | `Auth` | Firebase Authentication インスタンス |

**処理内容:**
1. `.env` から `VITE_FIREBASE_*` 環境変数を読み込む
2. `initializeApp(firebaseConfig)` で Firebase アプリを初期化
3. `getAuth()` で認証インスタンスを取得してエクスポート

> Firebase Firestore・Firebase Storage は使用していない（データは PostgreSQL、画像は Cloudflare R2）。

---

### `api.ts`

バックエンド REST API への全リクエストをラップする型付きクライアント。

**内部 `req()` 関数:**
- `auth.currentUser?.getIdToken()` で Firebase IDトークンを取得
- `Authorization: Bearer <token>` ヘッダーをリクエストに付与
- 非 2xx レスポンスは `Error` として throw

**エクスポートする API オブジェクト:**

| オブジェクト | エンドポイント群 |
|---|---|
| `booksApi` | `GET/POST/PUT/DELETE /api/books` |
| `eventsApi` | `GET/POST/PUT/DELETE /api/events` |
| `circlesApi` | `GET/POST/PUT/DELETE /api/circles`（一括登録 `/bulk` 含む）|
| `circleItemsApi` | `GET/POST/PUT/DELETE /api/circle-items` |
| `venueMapsApi` | `GET/POST/PUT/DELETE /api/venue-maps` |
| `distributionsApi` | `GET/POST/PUT/DELETE /api/distributions` |
| `syncApi` | `GET /api/sync/export`, `POST /api/sync/import` |

---

### `bookApi.ts`

外部書籍データ API との連携モジュール。ISBN またはタイトルから書籍情報・書影を取得する。

**エクスポート関数:**

#### `fetchBookByIsbn(isbn: string): Promise<Partial<Book> | null>`
ISBN を元に書籍情報を取得する（3段階フォールバック）。

| ステップ | 処理 |
|---------|------|
| 1 | OpenBD API で ISBN 検索 |
| 2 | OpenBD にデータがなければ Google Books API で検索 |
| 3 | 両方とも未取得なら `null` を返す |

#### `searchBookByTitle(title: string): Promise<string[]>`
タイトルで Google Books API を検索し、書影 URL の候補リストを返す（複数件から選択可能）。

**使用箇所:** `src/components/books/BookForm.tsx`

---

### `circlesCsv.ts`

サークルデータの CSV / Excel インポート・エクスポート・テンプレート生成を担うモジュール。

**主要な関数:**
- `exportCirclesCsv(circles, items)` — サークル一覧を CSV に変換してダウンロード
- `exportCirclesExcel(circles, items)` — サークル一覧を Excel に変換してダウンロード
- `importCirclesCsv(file)` — CSV / Excel ファイルを解析してサークルデータを返す
- `downloadCirclesTemplate()` — CSV テンプレートをダウンロード

**使用箇所:** `src/pages/ShoppingListPage.tsx`

---

### `utils.ts`

汎用ユーティリティ関数を提供するファイル。

#### `cn(...inputs: ClassValue[]): string`
Tailwind CSS のクラス名を安全にマージするヘルパー関数。`clsx` で条件分岐を処理し、`tailwind-merge` で競合するクラスを正しく解決する。

**例:**
```typescript
cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6')
// → 'py-2 bg-blue-500 px-6'  (px-4 が px-6 で上書き)
```

---

### `affiliate.ts`

アフィリエイトリンク生成ユーティリティ。書籍の ISBN や URL から Amazon 等のアフィリエイトリンクを生成する。

**使用箇所:** `src/components/books/BookDetailModal.tsx`

---

### `imageToSvg.ts`

ビットマップ画像（会場マップ画像等）を SVG パスに変換するユーティリティ。`ImageTracer.js` を使用。

**使用箇所:** `src/pages/MapPage.tsx`（マップ画像アップロード後の SVG 生成）

---

### `pdfUtils.ts`

PDF ファイルをキャンバスに描画して画像データを取得するユーティリティ。`pdf.js` を使用。

**使用箇所:** `src/pages/MapPage.tsx`（PDF マップのアップロード処理）

---

### `dijkstra.ts`

ダイクストラ法による最短経路探索アルゴリズムの実装。

**使用箇所:** `src/hooks/useVenueRoute.ts`（会場内ルートナビ）
