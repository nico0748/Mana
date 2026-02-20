# src/

アプリケーションのソースコード全体を格納するディレクトリ。

## ディレクトリ構成

```
src/
├── main.tsx          # ReactアプリのDOMマウントエントリーポイント
├── App.tsx           # ルートコンポーネント・ルーティング定義
├── index.css         # グローバルスタイル（Tailwind CSSインポート）
├── vite-env.d.ts     # Vite固有の環境変数型定義
├── assets/           # 静的アセット（画像等）
├── types/            # TypeScript型定義
├── lib/              # ユーティリティ・外部SDKの初期化
├── context/          # React Context（グローバル状態管理）
├── hooks/            # カスタムReactフック
├── pages/            # ページレベルコンポーネント
└── components/       # 再利用可能なUIコンポーネント
```

## ファイル説明

### `main.tsx`
Reactアプリケーションのエントリーポイント。`ReactDOM.createRoot()`で`index.html`の`#root`要素にアプリをマウントする。`<React.StrictMode>`で囲んで開発時の警告を有効化。

### `App.tsx`
ルートコンポーネント。`AuthProvider`でアプリ全体をラップし、`BrowserRouter`内でルーティングを定義する。

```
/login  → Login（公開ルート）
/       → ProtectedRoute > AppLayout > BookList（保護ルート）
```

### `index.css`
Tailwind CSSのベーススタイルをインポートする1行のみのグローバルスタイルシート。

### `vite-env.d.ts`
`import.meta.env`（Viteの環境変数）の型定義を提供するTypeScript宣言ファイル。

## サブディレクトリ

| ディレクトリ | 内容 |
|-------------|------|
| [types/](types/README.md) | アプリ全体で使用するTypeScript型定義 |
| [lib/](lib/README.md) | Firebase SDK初期化・外部API連携・ユーティリティ関数 |
| [context/](context/README.md) | Firebase Authの状態をReact Contextで管理 |
| [hooks/](hooks/README.md) | Firestoreへの書籍CRUDを担うカスタムフック |
| [pages/](pages/README.md) | ルーティングのターゲットとなるページコンポーネント |
| [components/](components/README.md) | UI・レイアウト・書籍関連の再利用可能コンポーネント |

## データフロー概要

```
Firebase Auth ──→ AuthContext ──→ ProtectedRoute
Firestore      ──→ useBooks   ──→ BookList / BookDetailModal / BookForm
Firebase Storage──→ useBooks  ──→ BookForm（書影アップロード）
外部BookAPI    ──→ bookApi.ts ──→ BookForm（ISBN・タイトル検索）
```
