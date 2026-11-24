# Vercel デプロイ手順

フロント（Vite の静的ビルド）、バックエンド（Express を 1 本の Vercel Function として実行）、
DB（Vercel Marketplace の Neon Postgres）を、すべて 1 つの Vercel プロジェクトで動かす構成です。

```
ブラウザ ──▶ Vercel
             ├─ /assets/*, /sw.js, …   frontend/dist の静的ファイル
             ├─ /api/*                 api/index.js → backend/src/app.ts（Express）
             └─ それ以外               /index.html（SPA フォールバック）
                                         │
                                         ▼
                                 Neon Postgres（Vercel Marketplace）
```

関係するファイル:

| ファイル | 役割 |
|---|---|
| `vercel.json` | install / build コマンド、出力先、rewrites、セキュリティヘッダー（旧 nginx.conf から移植） |
| `scripts/vercel-build.sh` | frontend と backend のビルド。本番デプロイ時のみ `prisma migrate deploy` |
| `api/index.js` | Vercel Function の入口。`backend/dist/app.js` の Express アプリをそのまま export |
| `backend/src/app.ts` | Express アプリ本体（`listen` しない） |
| `backend/src/index.ts` | ローカル開発・Docker 用。`app.listen` するだけ |

## 初回セットアップ

1. **プロジェクト作成**: Vercel で GitHub の `nico0748/Mana` を Import。Root Directory はリポジトリ直下のまま、
   Framework Preset は「Other」（`vercel.json` の設定が使われます）。
2. **DB**: プロジェクトの Storage タブ → Marketplace の **Neon** を作成して接続。
   `DATABASE_URL`（プーラー経由）と `DATABASE_URL_UNPOOLED`（直結）が環境変数に自動で入ります。
   Functions は `vercel.json` で東京（`hnd1`）に置いているので、DB のリージョンもできるだけ近いところを選ぶ（離れるとクエリごとに往復の遅延が乗ります）。
3. **環境変数**（Settings → Environment Variables、Production と Preview）:

   | 変数 | 備考 |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT_B64` | サービスアカウント JSON を base64 したもの |
   | `INITIAL_ADMIN_UIDS` | 管理者の Firebase UID（カンマ区切り） |
   | `APP_URL` | 例: `https://doujin-pp.com`（Stripe の戻り先） |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Stripe |
   | `RAKUTEN_APP_ID` | 任意 |
   | `VITE_FIREBASE_*`（6 個）, `VITE_LINE_CHANNEL_ID` | フロントのビルド時に埋め込まれる |

   `CORS_ORIGIN` は同一オリジン配信なので不要です。
4. **デプロイ**: main に push すると本番デプロイ。初回のビルドで `prisma migrate deploy` が走り、空の DB にスキーマが作られます。
5. **Stripe Webhook**: Stripe ダッシュボードで送信先を `https://<ドメイン>/api/webhook/stripe` に変更し、新しい署名シークレットを `STRIPE_WEBHOOK_SECRET` に入れ直す。
6. **Firebase**: Authentication → 承認済みドメインに `*.vercel.app` のドメイン（と独自ドメイン）を追加。
7. **独自ドメイン**: Settings → Domains に `doujin-pp.com` を追加し、表示された DNS レコードを Cloudflare に設定
   （Cloudflare のプロキシはオフ＝DNS only にする。Vercel 側で証明書を発行するため）。

## 注意点

- **プラン**: Stripe 課金を含む商用利用は Hobby プランの規約外のため **Pro** が必要です。
- **リクエストサイズ**: Vercel Functions のボディ上限は 4.5MB。Express 側の上限は 2MB なので通常は問題ないが、
  会場マップ画像（Base64 で DB 保存）を大きくする変更を入れるときは注意。
- **レート制限**: `express-rate-limit` はメモリストアのため、Function のインスタンスごとにカウントされます（VPS 時代より緩くなる）。
  厳密にしたくなったら Upstash Redis などの共有ストアへ切り替える。
- **プレビューデプロイ**: 既定ではマイグレーションを流しません。Neon のブランチ DB をプレビューに割り当てた場合は、
  Preview 環境に `RUN_MIGRATIONS=1` を設定すると流れるようになります。
- **MCP**: `mcp/` はローカルで動かす stdio サーバなので Vercel には載せません。`MANA_BASE_URL` を本番 URL に向ければそのまま使えます。
- 旧 VPS 構成（`docker-compose.prod.yml`, `deploy.sh`, nginx 設定）は残してあり、`Deploy to VPS` ワークフローは手動実行のみにしています。
