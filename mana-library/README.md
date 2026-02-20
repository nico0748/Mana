# mana-library

書籍管理Webアプリケーションのメインパッケージ。React + TypeScript + Vite で構築し、バックエンドに Firebase を使用する。

## ディレクトリ構成

```
mana-library/
├── src/                  # ソースコード
│   ├── main.tsx          # Reactアプリのエントリーポイント
│   ├── App.tsx           # ルートコンポーネント（ルーティング定義）
│   ├── index.css         # グローバルスタイル（Tailwind CSSインポート）
│   ├── vite-env.d.ts     # Vite環境変数の型定義
│   ├── assets/           # 画像・メディアアセット
│   ├── types/            # TypeScript型定義
│   ├── lib/              # ユーティリティ・外部ライブラリ設定
│   ├── context/          # React Contextプロバイダー
│   ├── hooks/            # カスタムReactフック
│   ├── pages/            # ページコンポーネント
│   └── components/       # 再利用可能なコンポーネント
│       ├── ui/           # 汎用UIコンポーネント
│       ├── layout/       # レイアウトコンポーネント
│       └── books/        # 書籍関連コンポーネント
├── public/               # 静的アセット（vite.svg）
├── index.html            # HTMLエントリーポイント
├── package.json          # 依存関係・スクリプト
├── vite.config.ts        # Viteビルド設定
├── tsconfig.json         # TypeScript設定（ルート）
├── tsconfig.app.json     # TypeScript設定（アプリ向け）
├── tsconfig.node.json    # TypeScript設定（Node.js向け）
├── eslint.config.js      # ESLintコード品質設定
├── firestore.rules       # Firestoreセキュリティルール
├── storage.rules         # Firebase Storageセキュリティルール
├── .env                  # Firebase接続情報（環境変数）
└── Implemetation.md      # 実装計画・詳細メモ
```

## 主要ファイルの説明

### エントリーポイント

| ファイル | 説明 |
|----------|------|
| `index.html` | Viteが読み込むHTMLテンプレート。`src/main.tsx`をモジュールとして参照する |
| `src/main.tsx` | ReactのDOM描画エントリーポイント。`<React.StrictMode>`と`<App>`をマウントする |
| `src/App.tsx` | ルーティング定義。`AuthProvider`でラップし、`/login`と`/`（保護ルート）を設定する |
| `src/index.css` | Tailwind CSSのインポート（`@import "tailwindcss"`）のみを記述したグローバルスタイル |

### 設定ファイル

| ファイル | 説明 |
|----------|------|
| `package.json` | npmの依存関係（React, Firebase, Tailwind等）とスクリプト（dev/build/lint/preview）を定義 |
| `vite.config.ts` | ReactプラグインとTailwind CSSプラグインを設定するViteビルド設定 |
| `tsconfig.json` | TypeScript設定のルートファイル。`tsconfig.app.json`と`tsconfig.node.json`を参照 |
| `tsconfig.app.json` | アプリ向けTypeScript設定。ターゲットES2022、strictモード有効、パスエイリアス設定 |
| `eslint.config.js` | ESLint設定。TypeScriptとReact Hooks、React Refreshのルールを適用 |

### セキュリティルール

| ファイル | 説明 |
|----------|------|
| `firestore.rules` | Firestoreのアクセス制御。ユーザーは自分のドキュメントと書籍データのみ読み書き可能 |
| `storage.rules` | Firebase Storageのアクセス制御。書影はログイン済みユーザーが読め、自分のフォルダのみ書き込み可能 |

### 環境設定

| ファイル | 説明 |
|----------|------|
| `.env` | Firebase SDKの接続情報（apiKey, authDomain, projectId等）を環境変数として定義 |

## 開発コマンド

```bash
npm run dev       # 開発サーバー起動（Vite HMR付き）
npm run build     # 本番ビルド（TypeScriptコンパイル + Vite最適化）
npm run lint      # ESLintによるコード品質チェック
npm run preview   # 本番ビルドのプレビュー
```

## データモデル（Firestore）

### `users` コレクション
```
users/{uid}
  - uid: string
  - email: string
  - createdAt: timestamp
```

### `books` コレクション
```
books/{bookId}
  - uid: string          # 書籍の所有者UID
  - title: string        # タイトル
  - author: string       # 著者
  - isbn: string         # ISBN（任意）
  - type: 'commercial' | 'doujin'  # 商業本 or 同人誌
  - category: string     # カテゴリ（任意）
  - status: 'owned' | 'lending' | 'wishlist'  # 所有状態
  - memo: string         # メモ（任意）
  - coverUrl: string     # 書影URL（任意）
  - createdAt: timestamp # 登録日時
```

## 外部API

| API | 用途 |
|-----|------|
| [OpenBD](https://openbd.jp/) | ISBNから日本語書籍情報を取得（主要） |
| [Google Books API](https://developers.google.com/books) | ISBNフォールバック・タイトルから書影を取得 |
