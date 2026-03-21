# src/pages/

ルーティングのターゲットとなるページレベルのコンポーネントを格納するディレクトリ。`App.tsx`の`<Route>`に直接割り当てられるコンポーネントを置く。

## ファイル

### `Login.tsx`

ユーザーのログイン・新規登録ページ。Firebase Authenticationを使ったメール/パスワード認証を提供する。

**ルート:** `/login`（公開、`ProtectedRoute`なし）

**機能:**
- メールアドレス・パスワードでのサインイン（`signInWithEmailAndPassword`）
- 新規アカウント作成（`createUserWithEmailAndPassword`）
- 新規登録時はFirestoreの`users/{uid}`にユーザーdocumentを作成
- ログイン済みの場合はホーム（`/`）にリダイレクト
- フォームの「ログイン / 新規登録」モード切り替え
- Firebaseエラーコードを日本語メッセージに変換して表示

**状態管理（useState）:**
| 状態 | 型 | 説明 |
|-----|-----|------|
| `email` | `string` | 入力中のメールアドレス |
| `password` | `string` | 入力中のパスワード |
| `isSignUp` | `boolean` | 新規登録モードかどうか |
| `loading` | `boolean` | 認証処理中かどうか |
| `error` | `string \| null` | エラーメッセージ |

**フロー:**
```
フォーム送信
  → signInWithEmailAndPassword / createUserWithEmailAndPassword
  → 成功: 新規登録ならusersドキュメント作成 → navigate('/')
  → 失敗: Firebaseエラーコードを日本語に変換してerror表示
```

**依存:**
- `src/lib/firebase.ts` - `auth`, `db`
- `src/context/AuthContext.tsx` - `useAuth`（ログイン済み判定）
- `src/components/ui/` - `Button`, `Input`
- `react-router-dom` - `useNavigate`
