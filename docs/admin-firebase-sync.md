# 管理画面: Firebase ユーザー同期

## 背景

`backend/src/middleware/auth.ts` の `authenticate` ミドルウェアは、ユーザーが
**ログインして API を叩いた瞬間** に `User` テーブルへ upsert する。

このため:

- **Firebase Authentication 上の登録ユーザー数** = 登録した全員
- **DB の `User` テーブル件数** = 実際にアプリを使用したユーザー

両者には差分が生じ、管理画面 (`/admin`) のユーザー一覧 (`GET /api/admin/users`) は
DB を参照しているため、Firebase に登録だけして未利用のユーザーが見えない。

例: Firebase 10人 / DB 3人 の場合、管理画面には 3人しか出ない。

## 実装方針の比較

| 案 | 仕組み | 実装コスト | 運用コスト | スケール耐性 |
|---|---|---|---|---|
| **A. 同期ボタン (採用)** | 管理画面のボタンで Firebase Admin SDK の `listUsers()` を叩いて DB に一括 upsert | 小 (1〜2h) | 手動操作が必要 | 〜10,000 ユーザーまで実用 |
| B. ライブ取得 | `GET /api/admin/users` で毎回 Firebase API を叩く | 中 | 自動 | 表示が遅くなる、API レート制限のリスク |
| C. Cloud Functions | Firebase の `auth.user().onCreate` トリガーで自動同期 | 大 (1日) | 完全自動 | 上限なし |

## 採用案: A（同期ボタン）

### 選定理由

- 同人ツールというニッチ領域で、現実的な上限ユーザー数は 1,000〜数千程度
- 案 A は実装が軽量で、案 C 移行時にも初期一括同期エンドポイントとして残せる
- 表示パスから Firebase API 呼び出しを切り離せるため、管理画面の応答が速い

### 将来の拡張パス

ユーザー数が **数百人/週ペース** で増えてきたら案 C に移行。案 C 実装後も、
本実装の `POST /api/admin/sync-firebase` は「障害復旧後の再同期」「定期 cron 同期」
など別用途で活用可能。

## 仕様

### バックエンド: `POST /api/admin/sync-firebase`

- 認証: 既存の `requireAdmin` ガードを通す
- 処理:
  1. `admin.auth().listUsers(1000, pageToken)` を `nextPageToken` がなくなるまで反復
  2. 取得した各ユーザーを `prisma.user.upsert()` で DB に投入
     - `create`: `firebaseUid`, `email`, `displayName` を Firebase から複写
     - `update`: 既存ユーザーの `email`, `displayName` のみ更新
       （**`role` / `proOverride` は絶対に上書きしない**）
  3. 監査ログ `AdminAuditLog` に `action: 'sync_firebase'` で記録
- レスポンス: `{ created: number, updated: number, total: number, duration: number }`

### フロントエンド

- 場所: 管理画面 (`/admin`) の「ユーザー」タブ
- UI: 検索バーの右隣に「Firebase から同期」ボタン
- 挙動:
  - クリックで POST リクエスト発行（処理中は spinner + 無効化）
  - 完了後にユーザー一覧を再取得し、結果を toast 表示（`新規 2 / 更新 8 / 計 10件 を 1.4s で同期`）
  - エラー時はモーダルでエラー内容を表示

### セキュリティ・整合性

- 既存の `role` / `proOverride` を絶対に上書きしないため、誤操作で管理者権限が消えるリスクなし
- `requireAdmin` + admin route のレート制限 (60 req/min) で保護
- 同期処理は 1 リクエスト = 1 トランザクションではなく、ユーザーごとに upsert（10,000 件規模での
  ロック時間を抑制）
- 監査ログには「いつ誰が同期したか」と件数を記録

### 想定される性能

| Firebase ユーザー数 | listUsers API 呼び出し回数 | 推定所要時間 |
|---|---|---|
| 100 | 1 | < 1秒 |
| 1,000 | 1 | 1〜2秒 |
| 10,000 | 10 | 10〜20秒 |
| 100,000 | 100 | 数分（要 progress UI） |

10,000 ユーザーまでは現状の単発リクエストで対応可能。それ以上は案 C を検討。
