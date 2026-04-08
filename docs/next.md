# next.md — 作業キュー

Claude Code はこのファイルを上から順に読み取り、対応します。
対応済みの項目は `[x]` にして、「## 対応済み（完了したらここに移動）」に移動させる。
また、凡例ごとにbranchを分けて、作業し、PRの作成まで行うようにしてほしい。

## 凡例
- `[bug]` バグ修正
- `[feat]` 新機能
- `[chore]` 設定・リファクタリング

---

## 未対応

- [ ] [feat] R2 への既存 imageDataUrl（Base64）データの一括移行スクリプト作成（マップ画像）
- [ ] [chore] 既存データ移行完了後に imageDataUrl フィールドをスキーマ・型定義から削除
- [ ] [feat] 書籍・サークルのカバー画像も R2 移行できているか動作確認・テスト

---

## 対応済み（完了したらここに移動）

<!-- 例:
- [x] [bug] マップPDFアップロードが413エラー → fix済み
-->
- [x] [feat] ログインアカウントの情報がサイト上で確認できないので、サイドバーの最下層に追加する → PR #24
- [x] [feat] ログインアカウントの情報の詳細を⚙️ツール内で確認できるようにしてほしい → PR #25
- [x] [feat] 本棚内のインポート・エキスポート機能をJSONとCSV/EXCELの両方に対応させてほしい。また、エキスポートの表示が、「データをシェア」となっているので、「エキスポート」に変更してほしい。 → PR #26
- [x] [feat] 買い物リスト内のインポートをJSONとCSV/EXCELの両方に対応させてほしい。また、エキスポート機能も追加してほしい。テンプレートはCSV/Excelだけ対応で良い。 → PR #27
- [x] [feat] ⚙️ツール内に環境設定をできる機能を追加してほしい（ダークモード/ライトモード・背景画像・フォントサイズ・アニメーション削減） → PR #28
- [x] [feat] 新規アカウント登録の画面で、利用規約に必ず同意する機能を追加してほしい。また、利用規約を読んだことを確認できるまで、チェックが押せないようにしてほしい。 → PR #29
- [x] [feat] 利用規約、プライバシーポリシーを⚙️ツール内で確認できるようにしてほしい。 → PR #30
- [x] [feat] 買い物リストのサークル内アイテムが複数ある場合はアイテムごとに購入可否ステータスを付与。MAPのポップアップにもアイテムごとのステータス表示・変更機能を追加。 → PR #31
- [x] [fix] PWAモバイルサイドバー下部にアカウント情報が表示されていなかった問題を修正 → fix/pwa-sidebar-account-info
- [x] [feat] 設定画面を左カテゴリ＋右コンテンツの2ペインレイアウトにリデザイン（フィードバック=Googleフォームリンク配置） → feat/settings-page-redesign
- [x] [fix] 本棚のフィルタ（商業誌/同人誌）に応じて「本を追加」の種別初期値を自動セット → fix/booklist-auto-type
- [x] [feat] 同人誌タグ機能追加（複数タグ設定・削除、CSV/Excel import/export対応） → feat/book-tags
- [x] [fix] 本のタイトルからの表紙画像検索精度向上（3段階フォールバック・複数結果から選択・https正規化） → fix/cover-image-search
- [x] [feat] 同人誌のサークル名・著者名を分離入力、既存データからの自動入力対応 → feat/book-form-improvements
- [x] [fix] BookFormのUIをセクション分け・種別連動表示にリデザイン → feat/book-form-improvements
- [x] [feat] ログイン不要のアプリ紹介ページ（/about）を実装。機能紹介・公式テンプレートDL・FAQを掲載 → feat/landing-page
- [x] [feat] 公式テンプレートデータ（即売会+ホール一覧JSON）のインポート機能をマップページに追加。アプリ内選択 or ファイル読み込みに対応 → feat/landing-page
- [x] [fix] LandingPage.tsx の TemplateCard ビルドエラー修正（削除済みコンポーネントの参照を除去） → feat/landing-page
- [x] [feat] ランディングページの機能紹介セクションを実スクリーンショット画像に差し替え → feat/landing-page
- [x] [feat] Google・X（Twitter）・LINEでのソーシャルログイン/新規登録機能を追加。初回登録時の利用規約同意モーダルにも対応 → feat/social-login
- [x] [fix] Google認証のレースコンディション修正（LoginPage アンマウント後も pendingTerms 状態が消えないよう AuthContext に移動） → feat/social-login
- [x] [feat] Google 新規登録時にユーザー名入力モーダル（UsernameSetupModal）を表示する機能追加 → feat/social-login
- [x] [feat] Email 新規登録フォームにユーザー名入力欄を追加し、登録時に displayName を設定 → feat/social-login
- [x] [feat] 設定画面（ToolsPage）でユーザー名をインライン編集できる機能追加 → feat/social-login
- [x] [chore] nginx.conf に `server_tokens off` を追加（Nginx バージョン非公開化） → chore/security-hardening
- [x] [chore] nginx.conf にセキュリティヘッダーを追加（X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy） → chore/security-hardening
- [x] [chore] nginx.conf に静的アセットのキャッシュルールを追加（/assets/ 1年 immutable・画像 7日・index.html no-cache） → chore/security-hardening
- [x] [chore] 未使用の LINE 認証コード（backend/src/routes/auth.ts）を削除 → chore/security-hardening
- [x] [chore] Cloudflare CDN を導入（DNS プロキシ有効化） → インフラ作業（コード変更なし）
- [x] [chore] nginx.conf に Cloudflare 実 IP フォワード設定を追加（CF-Connecting-IP / X-Forwarded-Proto / real_ip_header） → chore/security-hardening
- [x] [chore] backend で X-Powered-By ヘッダーを除去（app.disable('x-powered-by')） → chore/security-hardening
- [x] [chore] backend に `trust proxy 1` 設定を追加（Cloudflare 経由の実 IP 取得対応） → chore/security-hardening
- [x] [chore] Cloudflare HTTP/3（QUIC）無効化（ERR_QUIC_PROTOCOL_ERROR 対策） → Cloudflare ダッシュボード作業
- [x] [feat] 画像ストレージを DB の Base64 格納から Cloudflare R2 に移行 → feat/r2-image-storage
  - [x] backend: `@aws-sdk/client-s3` + `s3-request-presigner` を追加
  - [x] backend: `src/lib/r2.ts`（R2 クライアント・presigned URL 生成・オブジェクト削除）を追加
  - [x] backend: `POST /api/upload/presign` エンドポイントを追加（contentType・folder バリデーション含む）
  - [x] backend: Prisma スキーマに `VenueMap.imageUrl String?` を追加
  - [x] backend: `VenueMap.imageDataUrl` を nullable（String?）に変更（後方互換）
  - [x] backend: Prisma マイグレーション実行（`20260406193640_add_image_url_to_venue_map`）
  - [x] frontend: `src/lib/r2Upload.ts`（presigned PUT 経由の R2 直接アップロードユーティリティ）を追加
  - [x] frontend: `MapPage.tsx` のマップ画像アップロード（PDF・画像ファイル・回転・クロップ）を R2 に移行
  - [x] frontend: `VenueMap` 型に `imageUrl?` を追加・`imageDataUrl` を optional 化
  - [x] frontend: 画像表示を `imageUrl ?? imageDataUrl` のフォールバック方式に変更（既存データ後方互換）
  - [x] docker-compose.prod.yml: バックエンドに R2 環境変数（R2_ACCOUNT_ID 等）を追加
- [x] [fix] ライトモードのカラーパレット・ボーダー視認性を大幅改善・温かみのあるデザインに刷新（#f1e5d1 ベース） → fix/light-theme
