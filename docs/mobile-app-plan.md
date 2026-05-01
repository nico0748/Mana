# 同人++ モバイルアプリ化 計画書

> 状態: **計画段階（実装未着手）**
> 対象: 既存 WEB アプリ（React + Vite フロントエンド / Express + Prisma バックエンド）のコアロジックを最大限再利用してネイティブアプリを作る
> 結論: **現実的に可能。Expo（React Native）+ NativeWind を推奨。**

---

## 1. 結論サマリ

| 問い | 回答 |
|---|---|
| コアロジックを丸ごと使い回せるか？ | **可能**。バックエンドは無改修で再利用、フロント側もデータ層（API クライアント / TanStack Query / Hooks / 型定義 / 純粋ロジック）はほぼ移植 0 行で動く。 |
| React Native は最適か？ | **Yes（ただし「素の RN」ではなく Expo 推奨）**。React 19 + TypeScript の資産を最大限活かせる唯一の選択肢。 |
| 他に検討した選択肢は？ | Flutter / Capacitor / Tauri Mobile / PWA 強化 — いずれも下記理由で本プロジェクトには劣後（§4 参照）。 |
| 想定工数（MVP） | 約 4〜6 週間（後述 §7 のフェーズ分割）。 |

---

## 2. 現状アーキテクチャと「再利用可能性」の評価

### 2.1 バックエンド（変更最小）

```
backend/
  src/index.ts           ← Express + 認証ミドルウェア + 各 router
  src/routes/*.ts        ← books / circles / events / venueMaps / sync / billing / me / admin / webhook
  prisma/schema.prisma   ← Book / Circle / CircleItem / VenueMap / Distribution / DoujinEvent / User / AdminAuditLog
```

- 認証は **Firebase ID Token** を `Authorization: Bearer` で受ける構造（`backend/src/middleware/auth.ts`）。モバイルクライアントでも全く同じヘッダを送れば動く。
- すべて REST/JSON で副作用なし。**バックエンド側のコード変更は基本ゼロ**。
- 必要な変更点は次の 2 点のみ:
  1. **CORS** — モバイル WebView を使わない場合、`Origin` ヘッダがそもそも飛ばないため CORS の影響は受けないが、開発時に Expo の dev server から叩く場合に備え `CORS_ORIGIN` を緩める設定を用意。
  2. **API ベース URL の絶対指定** — 現在フロントは `BASE = '/api'`（同一オリジン Nginx プロキシ）だが、モバイル版は `https://api.example.com/api` のような絶対 URL を環境変数で持つ必要がある。

### 2.2 フロントエンドの「移植容易度」

`frontend/src/` を「移植容易度」で 3 階層に分類:

| 階層 | 該当ファイル | 移植容易度 |
|---|---|---|
| **A. 無改修で再利用** | `lib/api.ts`, `lib/bookApi.ts`, `lib/onlineStores.ts`, `lib/affiliate.ts`, `lib/dijkstra.ts`, `lib/circlesCsv.ts`, `types/*`, `hooks/useBooks.ts` 等の TanStack Query フック | ◎ ロジックが DOM 非依存。`fetch` / `URL` / `Date` のみ使用 |
| **B. 軽微な置換で再利用** | `lib/firebase.ts`（Web SDK → RN SDK へ差し替え）、`contexts/AuthContext`、`AppSettingsContext`、`UpgradeModalContext` | ○ Firebase の import パスと永続化方式（localStorage → AsyncStorage）を変えるだけ |
| **C. UI を新規実装** | `pages/*`, `components/{books,shopping,map,layout,ui,billing}/*`, `App.tsx`（react-router-dom）, `Onboarding.tsx` | △ TailwindCSS の class 名は NativeWind でほぼそのまま使えるが、`<div>` 等のタグは `<View>` 等への置換が必要 |

ざっくり **コード量ベースで 35〜45 % は無改修、15〜20 % は軽微改修、残り 40〜50 % が UI 再実装**。フォルダ単位の `frontend/src/lib` と `frontend/src/hooks` がほぼまるごと使えるのは大きい。

### 2.3 注意すべき Web 専用依存

| ライブラリ | 用途 | RN での置換 |
|---|---|---|
| `react-zxing` / `@zxing/library` | バーコード（ISBN）スキャン | `expo-camera` + `BarCodeScanner` または `react-native-vision-camera` + `vision-camera-code-scanner`（後者の方が高速） |
| `pdfjs-dist` | PDF 取り込み（会場マップ等） | `react-native-pdf`（表示）/ サーバ側で PDF→画像変換するのが楽 |
| `imagetracerjs` | 画像 → SVG | 純 JS なので **RN でもそのまま動く可能性が高い**（要動作確認）。問題が出れば WebView ラップ |
| `xlsx`（SheetJS） | Excel 読み書き | RN 対応版あり。`expo-file-system` + Buffer polyfill が必要 |
| `framer-motion` | アニメーション | `react-native-reanimated` + `moti`（API がよく似ている） |
| `react-router-dom` | ルーティング | `expo-router`（ファイルベース、Web の Next.js 風） or `@react-navigation/native` |
| `lucide-react` | アイコン | `lucide-react-native`（同パッケージ群） |
| Service Worker / `vite-plugin-pwa`（オフライン） | キャッシュ + バックグラウンド同期 | RN では **より強力な選択肢**: SQLite (`expo-sqlite` / `op-sqlite`) + アプリ独自の同期キュー。`offline-architecture.md` の Phase 2 設計を SQLite で実装 |
| Stripe Checkout（Web） | 決済 | `@stripe/stripe-react-native`（PaymentSheet）。バックエンドの `routes/billing.ts` `routes/webhook.ts` は無改修で再利用 |

---

## 3. 推奨技術スタック

### 3.1 メインスタック

```
Expo SDK (latest stable)         ← React Native のマネージドフレームワーク
├─ TypeScript 5.x                ← 既存と同一
├─ React 19                      ← 既存と同一バージョン
├─ Expo Router                   ← ファイルベースルーティング
├─ NativeWind v4                 ← TailwindCSS v4 互換（既存の className をほぼ流用）
├─ TanStack Query v5             ← 既存の hooks/queries そのまま使用
├─ Firebase JS SDK (modular)     ← @react-native-firebase ではなく公式 modular SDK を推奨
│   + AsyncStorage persistence   ← getReactNativePersistence(AsyncStorage)
├─ Zustand or Jotai              ← 軽量グローバル状態（既存 Context は維持可）
├─ react-native-vision-camera    ← バーコードスキャン（react-zxing 置換）
├─ @stripe/stripe-react-native   ← 決済（PaymentSheet）
├─ expo-sqlite + drizzle-orm     ← オフラインキャッシュ（任意）
└─ moti + react-native-reanimated ← アニメーション
```

### 3.2 ビルド・配信

- **EAS Build**（Expo Application Services）: クラウドで iOS/Android バイナリをビルド。Mac がなくても iOS ビルド可能。
- **EAS Submit**: App Store / Google Play への提出を CLI から自動化。
- **EAS Update**: OTA 配信（JS バンドルだけ差し替えてストア審査をスキップ）。
- **Expo Dev Client**: 開発時にネイティブモジュールを含めて実機ホットリロード。

### 3.3 ディレクトリ構成（提案）

```
mana-library/
├── backend/                   # 既存、無改修
├── frontend/                  # 既存（Web）、無改修
├── mobile/                    # ★ 新設
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   ├── app/                   # Expo Router の screens
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # 本棚
│   │   │   ├── shopping.tsx
│   │   │   ├── map.tsx
│   │   │   └── account.tsx
│   │   └── login.tsx
│   ├── src/
│   │   ├── lib/               # ← frontend/src/lib をコピー（無改修）
│   │   ├── hooks/             # ← frontend/src/hooks をコピー（無改修）
│   │   ├── types/             # ← frontend/src/types をコピー（無改修）
│   │   ├── components/        # ← RN 用に新規実装
│   │   └── contexts/          # ← Web Storage 部分のみ AsyncStorage に置換
│   └── assets/
└── shared/                    # ★ オプション: lib/types を monorepo で共有
    ├── types/
    └── api-client/
```

> **shared 化は Phase 2 以降を推奨**。最初は単純にコピーで進め、二重メンテのコストが顕在化してから pnpm/npm workspaces でモノレポ化するのが安全。

---

## 4. 検討した代替案と却下理由

| 候補 | 評価 | 採否 |
|---|---|---|
| **Expo (React Native)** | React 19 + TS + TailwindCSS の資産を最大限再利用。Firebase / Stripe / カメラ / SQLite のエコシステムが揃う。EAS で iOS/Android ビルドの面倒を見てくれる。 | ★ **採用** |
| 素の React Native (CLI) | 同等の表現力だが、iOS ビルド環境・Cocoapods・ネイティブ設定の保守負担が大きい。Expo の Dev Client で十分柔軟。 | 却下 |
| Flutter (Dart) | パフォーマンスとデザイン自由度は最高だが、**TS のロジック・型定義・hooks をすべて捨てて Dart で書き直し**になる。本プロジェクトには非合理。 | 却下 |
| Capacitor + 既存 React | 既存フロントを WebView でラップ。最短で出せるが、UX がブラウザのままで「アプリらしさ」が出ない。バーコードスキャンや push 通知の体感がネイティブに劣る。最終形ではなく一時的な踏み台として有効。 | △ 緊急時の選択肢 |
| PWA 強化のみ | iOS の制約（push 通知の制限・ホーム追加導線の弱さ・App Store 露出ゼロ）でリーチが伸びない。`docs/offline-architecture.md` の Phase 1+2 をやりきる価値はあるが、ネイティブ代替にはならない。 | 補完 |
| Tauri Mobile | まだ early。本番採用は時期尚早。 | 却下 |
| Kotlin Multiplatform / Swift+Kotlin ネイティブ | 完全に別言語のチーム編成が前提。1 人開発・既存 TS 資産前提では非合理。 | 却下 |

---

## 5. 認証・決済・ストレージの移植方針

### 5.1 Firebase Authentication

- 現状 Web で使っている `firebase` JS SDK の **modular API** はそのまま React Native でも動く（v9+）。
- 唯一の差分: 永続化を `getReactNativePersistence(AsyncStorage)` で初期化する点だけ。
- Google ログインは `expo-auth-session/providers/google` または `@react-native-google-signin/google-signin` を介して `signInWithCredential` に渡す。
- Email/Password はそのまま `signInWithEmailAndPassword` が動く。
- **バックエンドの認証ミドルウェアは無改修**（受け取る ID Token は同じ）。

### 5.2 Stripe（Pro プラン）

- Web は Stripe Checkout（外部リダイレクト）。モバイルではストア審査の関係で **Apple/Google の課金ガイドラインに注意**が必要:
  - **デジタルコンテンツ／アプリ機能の購入は IAP 必須**（Apple App Store の規約）。Pro プランの位置づけ次第では `RevenueCat` 経由で IAP に切り替える検討が必要。
  - 物理サービス・物販等であれば Stripe `PaymentSheet`（`@stripe/stripe-react-native`）で OK。
- 既存の `routes/billing.ts` `routes/webhook.ts` は IAP 採用の場合は **使わなくなる**（webhook を RevenueCat → 自前 API に張り替える）。
- **この判断はストア審査リスクに直結するため最初に確定させる**こと。

### 5.3 Cloudflare R2（マップ画像）

- 既存の **presigned PUT 方式が React Native でもそのまま機能する**。`fetch` で PUT するだけ。
- 画像取得 (`expo-image-picker` / `expo-camera`) → presigned URL に PUT → DB に URL 保存、という Web と同じ流れで OK。

---

## 6. 主要画面のモバイル UX 観点（要再設計箇所）

| 画面 | Web の挙動 | モバイルでの再設計ポイント |
|---|---|---|
| 本棚 (`BookList`) | グリッド + モーダル | スワイプで削除 / 長押しで一括選択を追加検討。仮想化必須（`@shopify/flash-list`） |
| バーコードスキャン | Web カメラ | フルスクリーン + 連続スキャン + 振動フィードバック。`vision-camera` で OS ネイティブ復号 |
| 買い物リスト / NavMode | リスト + ルート探索 | **会場で電波が不安定** → §2.3 のオフライン SQLite 同期キューが必須 |
| MAP (`VenueSchematicMap`) | SVG + react-zoom-pan | `react-native-svg` + `react-native-gesture-handler` でピンチズーム再実装 |
| Account / Admin | 通常フォーム | 既存のレイアウトをほぼそのまま移植可能 |
| Onboarding | ステップ UI | `react-native-pager-view` でスワイプ可能なチュートリアルに |

---

## 7. 段階的ロードマップ

```
Phase 0: 設計確定（1 週間）
  - IAP vs Stripe の最終判断（Apple ガイドライン精査）
  - API ベース URL とビルド環境変数の整理
  - mobile/ ディレクトリ初期化 + Expo + NativeWind + Firebase 動作確認

Phase 1: 読み取り MVP（2 週間）
  - 認証（Email/Password + Google）
  - frontend/src/lib と hooks をコピー、API ベース URL を絶対値化
  - 本棚・買い物リスト・MAP の閲覧画面
  - TestFlight / Internal Testing で配布開始

Phase 2: 書き込み + オフライン（1.5 週間）
  - バーコードスキャン → 書籍追加
  - 買い物リスト購入記録
  - SQLite ベースの書き込みキュー（offline-architecture.md Phase 2 を RN で再実装）

Phase 3: 課金 + リリース（1 週間）
  - Stripe PaymentSheet または IAP（RevenueCat）
  - App Store / Google Play 審査提出
  - EAS Update での OTA 配信運用ルール策定
```

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| Apple の IAP 強制で Stripe が使えない | 高（Pro プランの収益構造が変わる） | Phase 0 で確定。物販系なら Stripe 維持、デジタルなら RevenueCat |
| `imagetracerjs` / `xlsx` などの Web 専用 JS が RN で動かない | 中 | Phase 0 で実機検証。動かない場合はサーバ側に処理を移す |
| iOS のカメラ・通知パーミッション設定漏れで審査落ち | 中 | Expo の `app.json` `infoPlist` で目的説明文を必ず記載 |
| 既存 Web 側のデザイントークン（zinc 系の暗色基調）が NativeWind で再現困難 | 低 | NativeWind v4 は Tailwind v4 互換。既存 className を 90% 以上そのまま流用可能 |
| 二重メンテ（Web と Mobile の同期コスト） | 中 | Phase 2 終了後に `shared/` の monorepo 化で API クライアントと型を一元管理 |

---

## 9. 次のアクション

1. **Phase 0 の意思決定**: IAP vs Stripe の方針確定（要法務・規約確認）。
2. `mobile/` ディレクトリを `chore/mobile-bootstrap` ブランチで初期化（Expo + TS + NativeWind + Firebase Hello World）。
3. `backend` 側で `CORS_ORIGIN` を Expo dev server に対しても許可できるよう `.env` テンプレートを更新。
4. `frontend/src/lib` を `mobile/src/lib` にコピーして、`api.ts` の `BASE` を環境変数化。

---

> **注**: 本ドキュメントは計画段階の検討材料であり、確定した実装方針ではない。Phase 0 の検証結果に応じて改訂される前提。
