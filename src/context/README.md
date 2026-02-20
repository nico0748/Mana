# src/context/

React Contextを使ったグローバル状態管理のプロバイダーを格納するディレクトリ。

## ファイル

### `AuthContext.tsx`

Firebase Authenticationの認証状態をアプリ全体で共有するためのContextプロバイダー。

**エクスポート:**

#### `AuthProvider` コンポーネント
アプリのルート（`App.tsx`）でラップして使用するContextプロバイダー。

- Firebaseの`onAuthStateChanged`でログイン状態の変化を監視
- ログイン状態が確定するまで`loading: true`を保持
- `currentUser`と`loading`をContextに提供

#### `useAuth()` カスタムフック
コンポーネントから認証状態にアクセスするためのフック。

```typescript
const { currentUser, loading } = useAuth()
```

**戻り値:**
| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `currentUser` | `User \| null` | ログイン中のFirebaseユーザー。未ログイン時は`null` |
| `loading` | `boolean` | 認証状態の初期確認中は`true`、確定後は`false` |

**使用箇所:**
- `src/components/layout/ProtectedRoute.tsx` - 未認証ユーザーをログインページへリダイレクト
- `src/components/layout/Sidebar.tsx` - ユーザー情報表示・ログアウト処理
- `src/hooks/useBooks.ts` - 書籍データの取得・操作時にUIDを使用
- `src/pages/Login.tsx` - ログイン済みの場合はホームへリダイレクト

**フロー:**
```
アプリ起動
  → AuthProvider がマウント
  → onAuthStateChanged でFirebaseに認証状態を問い合わせ
  → loading: true の間は ProtectedRoute がローディング表示
  → ユーザー確定後 loading: false → 各コンポーネントが描画
```
