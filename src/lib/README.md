# src/lib/

外部サービスのSDK初期化、API連携、汎用ユーティリティ関数を格納するディレクトリ。

## ファイル

### `firebase.ts`

Firebase SDKの初期化と各サービスのエクスポートを行うファイル。

**エクスポート:**
| エクスポート名 | 型 | 説明 |
|---|---|---|
| `auth` | `Auth` | Firebase Authentication インスタンス |
| `db` | `Firestore` | Firestore データベースインスタンス |
| `storage` | `FirebaseStorage` | Firebase Storage インスタンス |

**処理内容:**
1. `.env`から`VITE_FIREBASE_*`環境変数を読み込む
2. `initializeApp(firebaseConfig)`でFirebaseアプリを初期化
3. `getAuth()` / `getFirestore()` / `getStorage()`で各サービスを取得してエクスポート

**依存:**
- `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`
- `.env`の`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

---

### `bookApi.ts`

外部書籍データAPIとの連携を担うモジュール。ISBNまたはタイトルから書籍情報を取得する。

**エクスポート関数:**

#### `fetchBookByIsbn(isbn: string): Promise<Partial<Book> | null>`
ISBNを元に書籍情報を取得する。OpenBDを優先し、データがなければGoogle Books APIにフォールバック。

| ステップ | 処理 |
|---------|------|
| 1 | OpenBD API (`https://api.openbd.jp/v1/get?isbn={isbn}`) を呼び出す |
| 2 | レスポンスがあればタイトル・著者・書影URLを返す |
| 3 | OpenBDにデータがなければ Google Books API を呼び出す |
| 4 | Google Booksのレスポンスから同様の情報を返す |
| 5 | 両方とも未取得なら `null` を返す |

#### `searchBookByTitle(title: string): Promise<string | null>`
タイトルで検索し、Google Books APIから書影URLを取得する。書影URLが取得できない場合は`null`を返す。

**使用箇所:** `src/components/books/BookForm.tsx`（ISBNスキャン後・タイトル検索時）

---

### `utils.ts`

汎用ユーティリティ関数を提供するファイル。

#### `cn(...inputs: ClassValue[]): string`
Tailwind CSSのクラス名を安全にマージするヘルパー関数。`clsx`で条件分岐を処理し、`tailwind-merge`で競合するTailwindクラスを正しく解決する。

**例:**
```typescript
cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6')
// → 'py-2 bg-blue-500 px-6'  (px-4がpx-6で上書きされる)
```

**使用箇所:** `src/components/ui/Button.tsx` および全コンポーネントのclassName結合部分
