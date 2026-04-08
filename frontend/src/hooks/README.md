# src/hooks/

React Query を用いたサーバー状態管理・書籍 CRUD・インポートエクスポート・ルートナビを担うカスタムフックを格納するディレクトリ。

## ファイル

### `useBooks.ts`

書籍データの管理を一元化するカスタムフック。React Query（`@tanstack/react-query`）で REST API とのデータ同期を行う。

**使用箇所:** `src/components/books/BookList.tsx`

#### シグネチャ

```typescript
const { books, loading, error, addBook, updateBook, deleteBook, uploadImage } =
  useBooks(sortField?, sortDirection?);
```

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| `sortField` | `'createdAt' \| 'title' \| 'author' \| 'ndcCode'` | `'createdAt'` | ソートキー |
| `sortDirection` | `'asc' \| 'desc'` | `'desc'` | ソート方向 |

#### 戻り値

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `books` | `Book[]` | ソート済みの書籍リスト |
| `loading` | `boolean` | データ取得中は `true` |
| `error` | `string \| null` | エラーメッセージ。正常時は `null` |
| `addBook` | `(data) => Promise<Book>` | 書籍を新規追加する |
| `updateBook` | `(id, data) => Promise<Book>` | 既存書籍を更新する |
| `deleteBook` | `(id) => Promise<void>` | 書籍を削除する |
| `uploadImage` | `(file) => Promise<string>` | 画像ファイルを Base64 Data URL に変換する |

#### データフロー

```
useQuery(['books'])
  → booksApi.list() → GET /api/books
  → rawBooks（React Query キャッシュ）
  → useMemo でソート
  → books（表示用）

addBook / updateBook / deleteBook
  → useMutation
  → 成功後 queryClient.invalidateQueries(['books']) で自動再取得
```

---

### `useSync.ts`

本棚データ（書籍リスト）のインポート・エクスポートを担うカスタムフック。

#### 戻り値

| 関数 | 説明 |
|------|------|
| `exportBooksJson()` | 全データを JSON でエクスポート（PWA は `navigator.share`、それ以外はダウンロード） |
| `exportBooksCsv()` | 書籍一覧を CSV でエクスポート（BOM 付き UTF-8） |
| `exportBooksExcel()` | 書籍一覧を Excel（`.xlsx`）でエクスポート |
| `importBooks(file)` | JSON / CSV / Excel ファイルをインポートして一括登録 |

**CSV/Excel のカラム:** タイトル・著者・サークル名・ISBN・種別・カテゴリ・NDCコード・ステータス・価格・メモ・タグ

**使用箇所:** `src/pages/ToolsPage.tsx`

---

### `useVenueRoute.ts`

会場マップ上でのサークル間最短経路を計算するカスタムフック。

**内部処理:**
1. `VenueGraph`（グラフデータ）と出発・到着サークルの座標を受け取る
2. `lib/dijkstra.ts` のダイクストラ法で最短経路を探索
3. SVG パスとして描画可能な座標列を返す

**使用箇所:** `src/pages/NavModePage.tsx`（ナビモード）
