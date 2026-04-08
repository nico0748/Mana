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
- [ ] [test] 書籍・サークルのカバー画像も R2 移行できているか動作確認・テスト
- [ ] [fix] 設定のパーソナライズにおけるライトテーマのUI/UXを大幅に改善する。以下のデザイン用件に従って、ライトモードを一新してほしい。また、adobeのカラーテーマと配色パターンの記事リンクを参考にしながら進めてほしい。https://www.adobe.com/jp/creativecloud/roc/blog/photography/color-pattern.html
```
# UI Design System Prompt
# Based on: newt239.dev UI/UX patterns
# Base color: #fff8f0 (warm off-white)

## Color System

Base background      : #fff8f0  /* warm off-white — page background */
Surface (cards)      : #fffdf9  /* slightly brighter than base */
Hover background     : #f0e0cc  /* warm beige for hover states */
Tint (accent bg)     : #fdebd8  /* button secondary hover, link hover */
Border default       : #e8d5c0  /* 0.5px — default dividers & card borders */
Border hover         : #d4a574  /* border color on hover/focus */
Text primary         : #2d1a0a  /* dark warm brown — headings & body */
Text secondary       : #8a6a50  /* mid-tone — subtitles, labels */
Text muted           : #b89880  /* dates, handles, hints */
Accent (primary)     : #c4622d  /* terracotta — CTA buttons, links */
Accent hover         : #a8501f  /* darkened accent for hover state */
Gradient start→end   : #f4a862 → #c4622d → #8a2a0a  /* thumbnails, hero */

## Typography

Font family   : system-ui, "LINE Seed JP", sans-serif
Body size     : 14–15px / line-height 1.7
Weight scale  : 400 (body), 500 (headings & labels only)
Heading sizes : h1=22px, h2=18px, h3=15px — all weight 500
Mono (dates)  : font-family: monospace — used for timestamps only

## Component Styles

Border radius   : 8px (inputs, small cards), 12px (cards), 16px (large panels)
Border width    : 0.5px everywhere (except featured card: 1.5px accent border)
Card background : #fffdf9 on base #fff8f0
Card shadow     : none at rest → 0 8px 24px rgba(180,120,60,0.12) on hover

## Button Variants

Primary
  background : #c4622d  color: #fff8f0
  hover      : background → #a8501f
  active     : transform: scale(0.97)
  radius     : 8px / padding: 7px 16px

Secondary (outlined)
  background : transparent  color: #c4622d  border: 1px solid #c4622d
  hover      : background → #fdebd8

Ghost
  background : transparent  color: #8a6a50  border: 0.5px solid #e8d5c0
  hover      : background → #f0e0cc, border → #d4a574, color → #2d1a0a

## Hover Interactions

Card (Works/content)
  transform   : translateY(-3px)
  border-color: #e8d5c0 → #d4a574
  box-shadow  : 0 8px 24px rgba(180,120,60,0.12)
  transition  : all 0.2s ease

Navigation links
  background  : transparent → #f0e0cc
  color       : #8a6a50 → #2d1a0a
  transition  : 0.15s

Timeline item
  padding-left: +4px (indent increase)
  dot (::before): scale(1.4) + color → #c4622d
  transition  : 0.15s

Track / List row
  background  : transparent → #f0e0cc
  transition  : 0.12s

Link card (SNS etc.)
  background  : #fffdf9 → #fdebd8
  border-color: #e8d5c0 → #d4a574
  transition  : 0.15s

## Layout Patterns

Navigation
  position        : sticky top-0
  backdrop-filter : blur(8px)
  background      : rgba(255,248,240,0.85)
  border-bottom   : 0.5px solid #e8d5c0

Works grid
  columns     : repeat(auto-fill, minmax(200px,1fr))
  gap         : 12px
  card-link   : entire card is <a> wrapping thumb + title + desc

Timeline
  border-left   : 1.5px solid #e8d5c0
  dot (::before): 6px circle, color #d4a574, abs-positioned at left:-4px
  year-label    : 10px, color #b89880, letter-spacing 0.08em

AI Theme Input
  layout      : flex row — input (flex:1) + primary button
  container   : border 0.5px #e8d5c0, focus → border #c4622d
  note        : "All prompts are recorded." warning text below

Media list (tracks)
  layout      : flex row — art(34px sq) + title/artist + duration(right)
  art-radius  : 5px
  hover       : full row background change

## Animation Timing

Default   : transition: all 0.15s ease
Cards    : transition: transform 0.2s ease, box-shadow 0.2s ease
Dot scale: transition: transform 0.15s, background 0.15s
Tracks   : transition: background 0.12s

## Key Design Rules

1. No pure black or pure white — use warm tones only (#2d1a0a / #fff8f0)
2. Border width is always 0.5px unless it's a featured/accent element
3. No decorative shadows at rest — shadows appear only on hover
4. All interactive elements transition in 0.12–0.20s
5. Entire card = clickable link (large tap target for mobile)
6. Gradient used only in visual/thumbnail areas, not UI chrome
7. Font weight: 400 (body) and 500 (labels) only — never 600/700
```

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
- [x] [fix] 設定パネルのヘッダーがライトモード時にダーク背景のままになる問題を修正（インラインstyle → CSSクラス化） → fix/light-theme-settings-panel
- [x] [feat] 設定のパーソナライズにMAPサークルマーカーサイズ調整（小/標準/大）を追加 → feat/map-marker-size-setting
- [x] [feat] 買い物リストにX（Twitter）代理購入シェア機能を追加（即売会単位・サークル単位） → feat/shopping-list-x-share
