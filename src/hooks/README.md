# src/hooks/

Firestoreとのデータ同期・書籍のCRUD操作を担うカスタムReactフックを格納するディレクトリ。

## ファイル

### `useBooks.ts`

書籍データの管理を一元化するカスタムフック。Firestoreのリアルタイムリスナーと全CRUD操作を提供する。

**使用箇所:** `src/components/books/BookList.tsx`

---

#### 戻り値

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `books` | `Book[]` | 現在のユーザーの書籍リスト（リアルタイム同期） |
| `loading` | `boolean` | データ取得中は`true` |
| `error` | `string \| null` | エラーメッセージ。正常時は`null` |
| `addBook` | `Function` | 書籍を新規追加する |
| `updateBook` | `Function` | 既存書籍を更新する |
| `deleteBook` | `Function` | 書籍を削除する |

---

#### `addBook(bookData, imageFile?)`
Firestoreに新規書籍を追加する。

1. `imageFile`が渡された場合はFirebase Storageに`covers/{uid}/{timestamp}`でアップロードし、`coverUrl`を取得
2. `{...bookData, uid, coverUrl, createdAt: serverTimestamp()}`をFirestoreの`books`コレクションに保存

#### `updateBook(bookId, bookData, imageFile?)`
既存書籍を更新する。

1. `imageFile`が渡された場合はStorage新規アップロードし`coverUrl`を更新
2. FirestoreのドキュメントをIDで指定し`updateDoc`で部分更新

#### `deleteBook(bookId)`
書籍をFirestoreから削除する。`deleteDoc`で該当ドキュメントを削除。

---

#### リアルタイム同期

フックのマウント時に`onSnapshot`リスナーを`books`コレクションに設定。ユーザー自身の書籍（`uid == currentUser.uid`）のみをフィルタリングして取得。コンポーネントのアンマウント時にリスナーを自動解除。

```
Firestore books コレクション
    ↓ onSnapshot (リアルタイム監視)
useBooks.books state
    ↓
BookList → BookItem[] の再描画
```

---

#### エラーハンドリング

各CRUD操作は`try/catch`で囲み、失敗時は`error`ステートにメッセージを設定。成功時は`error`を`null`にリセット。
