# Stripe セットアップガイド (Pro プラン)

同人++ の有料 Pro プラン (月額 ¥480 / 年額 ¥4,800) は Stripe Checkout + Customer Portal + Webhook で動作する。
このドキュメントは、Stripe アカウントの初期設定からローカル開発・本番運用までの手順を一通りまとめたもの。

## 全体像

```
┌─ ブラウザ ─────────────┐    ┌─ Stripe ───────────┐
│                       │    │                    │
│  /account             │    │  Checkout          │
│   ↓ POST /billing/    │───→│   Session          │
│     checkout          │    │   ↓                │
│   ← url               │    │   決済 (4242…)     │
│                       │    │   ↓                │
│  redirect → Stripe ───┼───→│                    │
│                       │    │  Webhook           │
│  redirect ← /account  │←───│   ↓ POST /api/     │
│   ?status=success     │    │     webhook/stripe │
└───────────────────────┘    └──────┬─────────────┘
                                    │
                              署名検証
                                    ↓
                           ┌─ backend ──────┐
                           │  syncSubscrip- │
                           │  tion()        │
                           │   ↓            │
                           │  prisma.user   │
                           │  .updateMany   │
                           └────────────────┘
```

ポイント:
- 決済 URL は backend が `/api/billing/checkout` で都度発行し、フロントは Stripe.js を読み込まない (依存ゼロ)
- プラン状態は **DB が単一ソース**。Webhook 経由で `User.plan` / `planStatus` / `planExpiresAt` を更新
- `effectivePlan()` (`backend/src/lib/plans.ts`) が `planExpiresAt` を見て Webhook 取りこぼし時のセーフティネットになる

## 前提

- Stripe アカウント (https://dashboard.stripe.com/register)
- Stripe Dashboard で `test mode` と `live mode` を切り替えながら作業する
- ローカル開発時は Stripe CLI (`brew install stripe/stripe-cli/stripe`)

## Step 1. Stripe アカウントと API キー

1. https://dashboard.stripe.com にログイン
2. 画面左下の **「テストモード」トグル** を ON にして開発開始
3. **Developers → API keys**
   - **Publishable key** (`pk_test_...`): 今回は使わない (フロントは Stripe.js 不要)
   - **Secret key** (`sk_test_...`): バックエンドの `STRIPE_SECRET_KEY` に設定

> 本番デプロイ時は同じ画面でテストモードを OFF にし、`sk_live_...` を取得して `.env.prod` に投入する

## Step 2. Product と Price を作成

Pro プランの月額・年額の 2 つの Recurring Price を作る。

1. **Product catalog → Add a product**
2. Product:
   - Name: `同人++ Pro`
   - Description (任意): `蔵書・サークル・イベント無制限`
3. Pricing 設定:
   - **Price 1 (月額)**:
     - `Standard pricing` / `Recurring`
     - Amount: `480`
     - Currency: `JPY`
     - Billing period: `Monthly`
   - **Price 2 (年額)**: 同じ Product に追加で作成
     - Amount: `4,800`
     - Currency: `JPY`
     - Billing period: `Yearly`
4. 作成後、それぞれの **Price ID** (`price_xxx`) をメモ
   - 月額 → `STRIPE_PRICE_MONTHLY`
   - 年額 → `STRIPE_PRICE_YEARLY`

> JPY は最小単位が「円」(USD 等の 100倍する必要なし)。`480` 入力で 480円。
> 消費税対応 (Stripe Tax) は別タスク。本実装は税込み金額で固定表示する素朴な方式。

## Step 3. Customer Portal を有効化

ユーザーが解約・支払い方法変更を行う UI は Stripe 側にホストする。

1. **Settings → Billing → Customer Portal**
2. **Functionality** で以下を許可:
   - ✅ Customers can cancel subscriptions
   - ✅ Customers can update payment methods
   - ✅ Customers can update billing address (任意)
   - ✅ Customers can view invoice history (任意)
3. **Cancellation** の挙動:
   - `Cancel at period end` を推奨 (即時解約より UX が穏やか)
4. **Business information** の必須項目を埋める (会社名・お問い合わせ先など)
5. 一番下の **Save** を押す

> 「Test mode」と「Live mode」で別設定。両方で有効化が必要

## Step 4. Webhook endpoint を登録

### ローカル開発 (Stripe CLI でフォワード)

ローカルでは endpoint URL の代わりに Stripe CLI でイベントをフォワードする (Step 7 参照)。Dashboard 登録は不要。

### 本番

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL**: `https://yourdomain.com/api/webhook/stripe`
3. **Events to send**: 以下 5 つを選択
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. **Add endpoint** で確定
5. 作成後の詳細画面で **Signing secret** (`whsec_...`) を表示し、`STRIPE_WEBHOOK_SECRET` に設定

> Cloudflare 経由でも raw body はそのまま透過するので追加設定不要。

## Step 5. 環境変数投入

`.env` (開発) または `.env.prod` (本番) に下記を設定:

```env
# 開発時 (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # Stripe CLI から取得
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
APP_URL=http://localhost:5173
```

```env
# 本番 (live mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook endpoint 詳細から取得
STRIPE_PRICE_MONTHLY=price_...         # live mode の price ID
STRIPE_PRICE_YEARLY=price_...
APP_URL=https://yourdomain.com
```

| 変数名 | 取得元 | 用途 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys | バックエンドが Stripe API を叩く |
| `STRIPE_WEBHOOK_SECRET` | Webhooks → endpoint 詳細 (本番) / `stripe listen` 出力 (開発) | Webhook の署名検証 |
| `STRIPE_PRICE_MONTHLY` | Products → Price 詳細 | 月額プランの Stripe 内部 ID |
| `STRIPE_PRICE_YEARLY` | Products → Price 詳細 | 年額プランの Stripe 内部 ID |
| `APP_URL` | 自分で決める | Checkout 完了後の戻り先ベース URL |

> Stripe を未設定でもアプリは起動する。決済導線のみエラーを返す。

## Step 6. backend を再起動

Docker:
```bash
docker compose up -d --build backend
```

開発で素の Node を使っている場合は `.env` 読み込み直しのため再起動。

## Step 7. ローカル開発フロー (Stripe CLI)

ローカルでは Webhook を Stripe CLI 経由で受信する。

### 初回セットアップ

```bash
brew install stripe/stripe-cli/stripe
stripe login                            # ブラウザで認証
```

### 開発時の作業フロー

ターミナル A (アプリ):
```bash
docker compose up
```

ターミナル B (Stripe CLI フォワード):
```bash
stripe listen --forward-to http://localhost:3000/api/webhook/stripe
```

起動直後に表示される `whsec_...` を `.env` の `STRIPE_WEBHOOK_SECRET` に貼って backend を再起動する (この secret は `stripe login` ごとに発行される一時的なもの)。

ターミナル C (イベント発火):
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### テストカード

| カード番号 | 挙動 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 9995` | 残高不足で失敗 |
| `4000 0027 6000 3184` | 3D セキュア認証要求 |

CVC・有効期限は何でも OK (例: `12/34`、`123`)。

## 動作確認チェックリスト

### 制限が効いているか

- [ ] Free で本 200冊作成 OK、201冊目で **402 + UpgradeModal** が出る
- [ ] Free でサークル 50 OK、51 でブロック
- [ ] Free でイベント 3 OK、4 でブロック
- [ ] Free で CSV bulk import (10件) を残枠 5 で実行 → ブロック
- [ ] 既存 200冊以上のユーザーで表示・編集・削除 OK、追加だけ拒否

### Stripe 連携

- [ ] `/account` → 「Pro にアップグレード」→ Checkout (`4242...`) → success → 2-3 秒以内に Pro 表示
- [ ] `stripe trigger checkout.session.completed` 後、DB の `User.plan = 'pro'`
- [ ] `/account` → 「お支払い方法・解約」→ Customer Portal → 解約 → `cancelAtPeriodEnd = true` → 「{date} に Free に戻ります」表示
- [ ] `stripe trigger customer.subscription.deleted` 後、DB の `plan = 'free'`
- [ ] `stripe trigger invoice.payment_failed` 後、DB の `planStatus = 'past_due'`

### DB 直接確認

```bash
docker exec mana-library-db-1 psql -U mana -d mana_library -c \
  "SELECT \"firebaseUid\", plan, \"planStatus\", \"planInterval\", \"planExpiresAt\", \"cancelAtPeriodEnd\" FROM \"User\";"
```

## 本番デプロイ前チェックリスト

- [ ] Stripe を **Live mode** に切り替えて Product / Price / Customer Portal を再作成
- [ ] Live mode の Webhook endpoint (`https://yourdomain.com/api/webhook/stripe`) を登録
- [ ] `.env.prod` に `sk_live_...` / `whsec_...` (本番用) / live mode の price ID を投入
- [ ] `APP_URL` を `https://yourdomain.com` に設定
- [ ] backend を `docker compose -f docker-compose.prod.yml up -d --build backend` で再起動
- [ ] 本番ドメインで実カードでの決済テスト (少額の月額で 1 サイクル試して即解約)
- [ ] Webhook 配送ログ (Stripe Dashboard → Webhooks → endpoint → Recent events) で 200 OK を確認

## トラブルシュート

### `Webhook signature verification failed`

`STRIPE_WEBHOOK_SECRET` が間違っているか、env 反映前に backend が起動した可能性。

- **ローカル**: `stripe listen` を再起動して新しい `whsec_...` を `.env` に貼り直して backend を再起動
- **本番**: Webhook endpoint 詳細から signing secret を再表示・コピーして `.env.prod` に投入

### Webhook が届かない

`backend/src/index.ts` で Webhook ルートが `express.json()` より **前に** マウントされているか確認。順序ミスで raw body が壊れて署名検証が失敗する。

```ts
app.use('/api/webhook/stripe', webhookRouter);   // ← json より前
app.use(express.json({ limit: '50mb' }));
app.use('/api', authenticate);
```

### Pro 化が反映されない

1. `stripe listen` または本番 Webhook endpoint が動いているか
2. backend のログで `Webhook handler error` が出ていないか
3. DB の `User.stripeCustomerId` が Stripe Customer ID と一致しているか
4. `effectivePlan()` のセーフティネット: Webhook が来なくても `planExpiresAt > now()` なら Pro として振る舞う。逆に DB が `plan='pro'` のままでも `planExpiresAt` 経過で自動 Free 降格

### 「Pro にアップグレード」ボタンを押しても何も起きない

backend ログを確認。よくある原因:
- `STRIPE_SECRET_KEY` 未設定 → `503 Stripe not configured`
- `STRIPE_PRICE_MONTHLY` 未設定 → `500 price_not_configured`

### 解約後すぐ Free に戻したくない

現状の挙動: `customer.subscription.deleted` 受信時に `plan='free'` にする (`current_period_end` は記録)。
期間内は Pro 機能を使わせる仕様にしたい場合は `effectivePlan()` のロジックを変えれば OK
(現状でも `plan='pro'` のまま `cancelAtPeriodEnd=true` で運用すれば期間内は Pro 扱い)。

## 関連ファイル

| 役割 | パス |
|---|---|
| プラン定数 | `backend/src/lib/plans.ts` |
| 制限チェック | `backend/src/lib/enforceLimit.ts` |
| Stripe クライアント | `backend/src/lib/stripe.ts` |
| Checkout / Portal | `backend/src/routes/billing.ts` |
| Webhook | `backend/src/routes/webhook.ts` |
| マウント順 | `backend/src/index.ts` |
| User モデル | `backend/prisma/schema.prisma` |
| アカウントページ | `frontend/src/pages/AccountPage.tsx` |
| アップグレードモーダル | `frontend/src/components/billing/UpgradeModal.tsx` |
| 残量フック | `frontend/src/hooks/useCurrentUser.ts` |

## 将来やること (Out of Scope)

- 領収書 PDF の自動メール: Stripe Dashboard → Settings → Emails で `Successful payments` を ON
- Stripe Tax / 適格請求書発行
- 年間プラン途中切り替え時のプロレーション挙動精査
- 複数プラン (Team / Enterprise) への拡張
- Pro 限定機能の追加 (共有リンク、CSV エクスポート拡張、優先サポート等)
