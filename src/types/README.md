# src/types/

アプリケーション全体で共有するTypeScript型定義を管理するディレクトリ。

## ファイル

### `index.ts`

アプリで使用する全インターフェースと型のエクスポートファイル。

#### `Book` インターフェース

Firestoreに保存される書籍データの型定義。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | `string` | ○ | FirestoreのドキュメントID |
| `uid` | `string` | ○ | 所有者のユーザーUID |
| `title` | `string` | ○ | 書籍タイトル |
| `author` | `string` | ○ | 著者名 |
| `isbn` | `string` | - | ISBN番号（任意） |
| `type` | `BookType` | ○ | 書籍種別（商業 or 同人誌） |
| `category` | `string` | - | カテゴリ・ジャンル（任意） |
| `status` | `BookStatus` | ○ | 所有状態 |
| `memo` | `string` | - | 自由メモ（任意） |
| `coverUrl` | `string` | - | 書影画像のURL（任意） |
| `createdAt` | `Date` | ○ | 登録日時 |

#### `BookType` 型

```typescript
type BookType = 'commercial' | 'doujin'
// commercial: 商業本（市販・出版社発行）
// doujin:     同人誌（同人・自費出版）
```

#### `BookStatus` 型

```typescript
type BookStatus = 'owned' | 'lending' | 'wishlist'
// owned:    手元にある（所持中）
// lending:  貸し出し中
// wishlist: 欲しい本リスト
```

## 使用箇所

- `src/hooks/useBooks.ts` - CRUD操作の引数・戻り値の型
- `src/components/books/` 配下の全コンポーネント - Props型として使用
- `src/lib/bookApi.ts` - APIレスポンスをBookの部分型としてマッピング
