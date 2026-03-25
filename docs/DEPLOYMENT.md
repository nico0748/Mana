# doujin++ デプロイ要件定義

## アーキテクチャ概要

doujin++ は **完全クライアントサイドの静的 SPA** である。

| 項目 | 内容 |
|------|------|
| フレームワーク | React 19 + TypeScript + Vite |
| ストレージ | Dexie (IndexedDB) — ブラウザローカルのみ |
| バックエンド | **なし**（サーバー不要） |
| 外部 API | OpenBD・Google Books・国立国会図書館（すべて公開 API・認証不要） |
| データ同期 | JSON ファイルのエクスポート/インポート（Web Share API） |
| 認証 | **なし**（現時点では不要） |

ビルド成果物（`dist/`）を静的ファイルホスティングに配置するだけで公開できる。

---

## デプロイ要件

### 1. HTTPS 必須

以下の機能が **Secure Context（HTTPS）** を必要とする。

| 機能 | 理由 |
|------|------|
| バーコードスキャン（`@zxing/library`） | カメラアクセスは HTTPS のみ許可 |
| Web Share API（エクスポート） | HTTPS 環境でのみ動作 |

HTTP では上記機能が動作しない。デプロイ先は HTTPS を標準提供するサービスを選ぶこと。

### 2. SPA ルーティング対応

React Router（`BrowserRouter`）を使用しているため、すべての URL リクエストを `index.html` にフォールバックする設定が必要。

設定しないと `/settings` 等の直接アクセスや画面リロード時に 404 になる。

### 3. ビルドコマンド

```bash
npm ci          # 依存インストール
npm run build   # TypeScript コンパイル + Vite 最適化ビルド
# 出力先: dist/
```

### 4. 環境変数

現時点では **不要**。外部 API はすべて公開エンドポイントで認証キーを使わない。

将来的に Firebase 等を追加する場合は `.env` に `VITE_` プレフィックスで定義し、ホスティング側のシークレット機能に設定する。

---

## 推奨デプロイ先

### 第一候補: Firebase Hosting

将来 Firestore/Authentication を追加する可能性がある場合は親和性が高い。

```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # dist/ を公開ディレクトリに指定
firebase deploy
```

**`firebase.json` 設定例**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

- 無料枠: 10 GB ストレージ / 360 MB/日 転送
- カスタムドメイン・HTTPS 自動対応

### 第二候補: Vercel

GitHub リポジトリと連携するだけで自動デプロイが完結する。

**`vercel.json` 設定例**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- 無料枠: 個人利用に十分
- PR ごとのプレビュー URL が自動生成される

### 第三候補: Netlify

`public/` に `_redirects` ファイルを追加するだけで SPA ルーティングに対応できる。

**`public/_redirects` ファイル**
```
/*  /index.html  200
```

### 第四候補: GitHub Pages

無料だが SPA ルーティングの対応に追加の工夫が必要（`404.html` へのリダイレクトハック等）。また `vite.config.ts` に `base` の設定が必要になる場合がある。

```ts
// vite.config.ts（リポジトリ名がサブパスになる場合）
export default defineConfig({
  base: '/doujin-pp/',
  // ...
})
```

---

## CI/CD パイプライン（GitHub Actions 例）

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      # Firebase の場合
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
```

---

## デプロイ前チェックリスト

- [ ] `npm run build` がエラーなく完了する
- [ ] `npm run lint` がパスする
- [ ] `dist/` に `index.html` が生成されている
- [ ] SPA フォールバック設定をホスティング側に追加した
- [ ] デプロイ後に HTTPS で提供されることを確認
- [ ] バーコードスキャン機能が HTTPS 環境で動作することを確認
- [ ] エクスポート/インポートが動作することを確認
- [ ] モバイルブラウザでの表示・動作を確認

---

## 制約事項・注意点

### データの永続性
IndexedDB はブラウザごと・端末ごとにデータが独立する。ユーザーがブラウザのデータを消去するとデータも消える。
→ エクスポート機能を使った定期バックアップをユーザーに案内することを推奨。

### マルチデバイス同期
現時点では対応していない。別端末でデータを共有するにはエクスポート→インポートの手動操作が必要。
→ 将来的に Firebase Firestore を追加することで対応可能。

### `vite-plugin-mkcert` について
開発用のローカル HTTPS 設定プラグインであり、本番ビルドには含まれない。本番環境の HTTPS はホスティング側が提供する。

---

## 収益化要件

> **前提条件（重要）**
>
> 現在の 同人++ は **個人の同人活動管理ツール**であり、データはすべてブラウザのローカルストレージ（IndexedDB）に保存される。
> 収益化のためにはアプリを **不特定多数のユーザーに使ってもらう必要**があり、そのためには以下の対応が前提となる。
>
> - Firebase Authentication + Firestore によるマルチユーザー対応
> - ランディングページ（アプリの紹介ページ）の作成
> - アプリの告知・集客（SNS・ブログ等）

---

### SEO 対策

#### 基本方針

SPA（Single Page Application）はサーバーサイドレンダリングがないため、アプリ内の動的コンテンツ（蔵書一覧等）は検索エンジンにインデックスされない。
SEO の目標は **アプリ自体を検索で見つけてもらうこと（アプリ認知の向上）** に絞る。

#### 1. `index.html` のメタタグ設定

```html
<!-- index.html の <head> に追記 -->
<title>同人++ — 同人活動管理アプリ</title>
<meta name="description" content="商業本・同人誌をまとめて管理できる無料の蔵書管理Webアプリ。バーコードスキャンでかんたん登録。" />
<meta name="keywords" content="蔵書管理, 本 管理, 同人誌 管理, バーコード, 読書記録" />

<!-- OGP（SNS シェア時のカード表示） -->
<meta property="og:title" content="同人++ — 同人活動管理アプリ" />
<meta property="og:description" content="商業本・同人誌をまとめて管理できる無料の蔵書管理Webアプリ。" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://your-domain.example" />
<meta property="og:image" content="https://your-domain.example/ogp.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="同人++ — 同人活動管理アプリ" />
<meta name="twitter:description" content="商業本・同人誌をまとめて管理できる無料の蔵書管理Webアプリ。" />
<meta name="twitter:image" content="https://your-domain.example/ogp.png" />
```

#### 2. `robots.txt`（`public/` に配置）

```txt
User-agent: *
Allow: /

Sitemap: https://your-domain.example/sitemap.xml
```

#### 3. `sitemap.xml`（`public/` に配置）

SPA のため公開ページが `/` のみであれば最小構成でよい。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.example/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

#### 4. Google Search Console への登録

1. [Google Search Console](https://search.google.com/search-console) でサイトを追加
2. 所有権確認（HTML ファイル配置 or メタタグ挿入）
3. sitemap.xml を送信

#### 5. 構造化データ（任意）

アプリ自体を `SoftwareApplication` として記述すると検索結果にリッチスニペットが表示される可能性がある。

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "同人++",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "Web",
  "description": "商業本・同人誌をまとめて管理できる蔵書管理Webアプリ",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  }
}
</script>
```

---

### アフィリエイト設定

#### 収益モデルの選択肢

| 方法 | 特徴 | 本アプリへの適合度 |
|------|------|------------------|
| Amazon アソシエイト | ISBN から直接商品リンクを生成できる | **最適（商業本）** |
| 楽天アフィリエイト | 楽天ブックスへのリンク | 適合 |
| Google AdSense | バナー広告 | UX を損なう可能性あり |

#### Amazon アソシエイト（推奨）

**登録手順**

1. [Amazonアソシエイト・プログラム](https://affiliate.amazon.co.jp/) に申込
2. サイト審査通過後、アソシエイト ID（例: `yoursite-22`）を取得
3. 初回販売から 180 日以内に 3 件の紹介販売が必要（審査条件）

**ISBN からリンクを生成するロジック**

`Book` 型に `isbn` フィールドが存在し、`type === 'commercial'` の場合にリンクを表示する。

```ts
// src/lib/affiliate.ts
const AMAZON_ASSOCIATE_ID = import.meta.env.VITE_AMAZON_ASSOCIATE_ID;

export const buildAmazonLink = (isbn: string): string => {
  // ISBN-13 の場合はそのまま、ISBN-10 の場合も dp/ で使用可能
  return `https://www.amazon.co.jp/dp/${isbn}/?tag=${AMAZON_ASSOCIATE_ID}`;
};
```

```ts
// .env に追記
VITE_AMAZON_ASSOCIATE_ID=yoursite-22
```

**`BookDetailModal.tsx` への組み込みポイント**

現在の詳細モーダル（`src/components/books/BookDetailModal.tsx`）の書籍詳細エリアに、以下の条件でリンクボタンを追加する。

- 表示条件: `book.isbn` が存在 かつ `book.type === 'commercial'`
- 表示位置: Edit / Delete ボタンの行に並べる（またはその下）
- リンクは新しいタブで開く（`target="_blank" rel="noopener noreferrer"`）

```tsx
{book.isbn && book.type === 'commercial' && (
  <a
    href={buildAmazonLink(book.isbn)}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-1 text-center px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
  >
    Amazonで見る
  </a>
)}
```

> **注意**: Amazon アソシエイトの規約上、アフィリエイトリンクであることを明示する必要がある（「広告」「PR」等の表記）。また同人誌（`type === 'doujin'`）は Amazon に存在しないためリンクを表示しない設計が適切。

#### 楽天アフィリエイト（任意・補完）

```ts
// src/lib/affiliate.ts に追記
const RAKUTEN_AFFILIATE_ID = import.meta.env.VITE_RAKUTEN_AFFILIATE_ID;

export const buildRakutenLink = (isbn: string): string => {
  return `https://books.rakuten.co.jp/search/?sitem=${isbn}&rafcid=${RAKUTEN_AFFILIATE_ID}`;
};
```

#### Google AdSense（任意）

蔵書管理アプリのような機能特化型ツールではバナー広告は UX を著しく損なうため、導入は慎重に検討すること。
導入する場合は `index.html` に AdSense スクリプトを追加し、広告枠をコンポーネント外に配置するのが最小限の影響で済む。

---

### 収益化チェックリスト

- [ ] Firebase Auth + Firestore でマルチユーザー対応を実装した
- [ ] `index.html` にメタタグ・OGP を設定した
- [ ] `robots.txt` / `sitemap.xml` を `public/` に配置した
- [ ] Google Search Console にサイトを登録し、sitemap を送信した
- [ ] Amazon アソシエイトプログラムに申込・審査通過した
- [ ] `.env` に `VITE_AMAZON_ASSOCIATE_ID` を設定した
- [ ] 本番環境のホスティング設定にも環境変数を追加した
- [ ] 書籍詳細モーダルにアフィリエイトリンクを実装した
- [ ] アフィリエイトリンクに「広告」「PR」等の開示表記を追加した
- [ ] Amazon アソシエイト申込から 180 日以内に 3 件の紹介販売を達成した
