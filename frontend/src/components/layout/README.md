# src/components/layout/

アプリ全体のページ構造・ナビゲーション・認証フローを制御するレイアウトコンポーネントを格納するディレクトリ。

## ファイル

### `AppLayout.tsx`

認証済みユーザーが見るアプリのメインレイアウトコンポーネント。サイドバーとメインコンテンツエリアで構成される。

**構造:**
```
<div className="flex h-screen">
  <Sidebar />          ← 固定幅の左サイドバー
  <main>               ← スクロール可能なメインコンテンツ
    <Outlet />         ← React RouterのネストされたRouteが描画される場所
  </main>
</div>
```

**使用箇所:** `src/App.tsx`の保護ルート内で`element={<AppLayout />}`として設定され、子ルートのコンポーネントが`<Outlet />`に差し込まれる。

---

### `Sidebar.tsx`

画面左側に固定表示されるナビゲーションサイドバー。

**表示内容:**
- アプリロゴ / タイトル
- ナビゲーションリンク（現在は書籍一覧のみ）
- ログイン中のユーザーメールアドレス
- ログアウトボタン

**機能:**
- `useAuth()`からログイン中のユーザー情報を取得して表示
- ログアウトボタンクリックで`signOut(auth)`を呼び出し、`/login`へリダイレクト

**依存:**
- `src/context/AuthContext.tsx` - `useAuth`
- `src/lib/firebase.ts` - `auth`（signOut用）

---

### `ProtectedRoute.tsx`

未認証ユーザーの保護ルートへのアクセスを防ぐ認証ガードコンポーネント。

**ロジック:**
```
loading === true  → ローディングスピナーを表示（認証確認待ち）
currentUser === null → <Navigate to="/login" replace />（ログインページにリダイレクト）
currentUser あり  → <Outlet />（保護されたコンテンツを描画）
```

**使用箇所:** `src/App.tsx`で`/`ルートの`element={<ProtectedRoute />}`として設定。`AppLayout`とその配下の全ルートを保護する。

**依存:** `src/context/AuthContext.tsx` - `useAuth`
