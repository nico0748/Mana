# Webアプリケーション セキュリティ要件

本ドキュメントは doujin++ に適用すべきセキュリティ要件を OWASP Top 10 および一般的なベストプラクティスに基づいて整理したものである。

---

## 1. 認証・認可

### 1.1 認証

| 要件 | 優先度 | 現状 |
|---|---|---|
| OAuth 2.0 / OpenID Connect による認証（Google / LINE） | 高 | 未実装 |
| セッショントークンは HttpOnly・Secure・SameSite=Lax の Cookie で管理 | 高 | 未実装 |
| JWTを使う場合は署名アルゴリズムに RS256 または ES256 を使用（HS256不可） | 高 | 未実装 |
| ログイン失敗のレート制限（ブルートフォース対策） | 中 | 未実装 |
| セッション有効期限の設定（例: アクセストークン15分、リフレッシュトークン30日） | 中 | 未実装 |

### 1.2 認可

| 要件 | 優先度 | 現状 |
|---|---|---|
| 全APIエンドポイントで認証済みユーザーであることを検証 | 高 | 未実装 |
| ユーザーは自分のデータのみ参照・更新できる（所有権チェック） | 高 | 未実装 |
| 管理操作が必要な場合はロールベースアクセス制御（RBAC）を追加 | 低 | 対象外 |

---

## 2. 入力バリデーション・インジェクション対策

### 2.1 SQLインジェクション

- **現状**: Prisma ORM を使用しており、プリペアドステートメントが自動適用されるため、通常の操作ではSQLインジェクションは発生しない
- **注意点**: `prisma.$queryRaw` / `prisma.$executeRaw` を使う場合は必ず `Prisma.sql` テンプレートリテラルを使用すること（文字列結合禁止）

```ts
// NG
prisma.$queryRaw(`SELECT * FROM circles WHERE name = '${name}'`);

// OK
prisma.$queryRaw`SELECT * FROM circles WHERE name = ${name}`;
```

### 2.2 XSS（クロスサイトスクリプティング）

| 要件 | 優先度 | 対応方法 |
|---|---|---|
| React の JSX は自動エスケープされるため通常は安全 | — | React デフォルト |
| `dangerouslySetInnerHTML` の使用箇所を最小化・監査する | 高 | MapPage の SVG 表示で使用中 → 信頼できるソース（自社生成SVG）に限定 |
| ユーザー入力をそのまま `dangerouslySetInnerHTML` に渡すことを禁止 | 高 | コードレビューで確認 |
| Content Security Policy (CSP) ヘッダーを設定する | 中 | Nginx / Express で設定 |

### 2.3 その他インジェクション

- コマンドインジェクション: `child_process.exec` など未使用のため現状リスクなし
- パスインジェクション: ファイルパスをユーザー入力から構築する場合は `path.resolve` + ホワイトリスト検証

### 2.4 サーバーサイドバリデーション

| 要件 | 優先度 | 対応方法 |
|---|---|---|
| フロントエンドのバリデーションに依存せず、API側でも必ず検証する | 高 | Zod または express-validator を導入 |
| リクエストボディのスキーマバリデーション（型・長さ・値域） | 高 | 未実装 |
| 数値フィールドに対する上限値チェック（price, quantity 等） | 中 | 未実装 |

---

## 3. 機密情報の管理

### 3.1 シークレット管理

| 要件 | 優先度 | 現状 |
|---|---|---|
| 環境変数をコードにハードコードしない | 高 | `.env` ファイル使用・gitignore 済み |
| `.env.prod` は本番サーバーのみに存在し、リポジトリには含めない | 高 | gitignore 済み |
| データベースパスワードは推測困難なランダム文字列を使用 | 高 | setup.md に記載 |
| OAuthクライアントシークレットはサーバーサイドのみで保持（フロントに露出しない） | 高 | 設計時に注意が必要 |

### 3.2 ログ管理

- パスワード・トークン・個人情報をログに出力しない
- `console.log(req.body)` のような全件ログ出力を本番環境では無効化する
- エラーレスポンスにスタックトレースを含めない（本番環境では汎用メッセージのみ返す）

```ts
// NG（本番）
res.status(500).json({ error: err.stack });

// OK
res.status(500).json({ error: 'Internal Server Error' });
```

---

## 4. 通信のセキュリティ

### 4.1 HTTPS

| 要件 | 優先度 | 現状 |
|---|---|---|
| 本番環境は全通信を HTTPS に強制 | 高 | Nginx で HTTP→HTTPS リダイレクト設定済み |
| HSTS ヘッダーを設定する | 中 | nginx-host.conf に追加推奨 |
| 証明書の自動更新（Let's Encrypt + Certbot）を設定 | 高 | docs/HTTPS_SETUP.md に記載 |

```nginx
# nginx-host.conf に追加
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 4.2 CORS

| 要件 | 優先度 | 現状 |
|---|---|---|
| `CORS_ORIGIN` 環境変数で許可オリジンを明示的に指定 | 高 | 実装済み（`*` はNG） |
| 本番環境でワイルドカード `*` を使用しない | 高 | `.env.prod` で設定が必要 |
| credentials: true を使う場合は特定オリジンのみ許可 | 高 | 実装済み |

### 4.3 HTTPセキュリティヘッダー

Express に `helmet` を導入して以下を自動設定する:

```ts
import helmet from 'helmet';
app.use(helmet());
```

| ヘッダー | 効果 |
|---|---|
| `X-Frame-Options: DENY` | クリックジャッキング防止 |
| `X-Content-Type-Options: nosniff` | MIMEスニッフィング防止 |
| `X-XSS-Protection: 1; mode=block` | 旧ブラウザのXSSフィルター有効化 |
| `Referrer-Policy: strict-origin-when-cross-origin` | リファラー情報の漏洩防止 |
| `Content-Security-Policy` | XSS・インジェクション緩和 |

---

## 5. レート制限・DoS対策

| 要件 | 優先度 | 対応方法 |
|---|---|---|
| APIエンドポイントへのリクエスト数制限 | 中 | `express-rate-limit` を導入 |
| 画像アップロードのファイルサイズ上限 | 中 | `multer` の `limits.fileSize` で設定（現状はbase64文字列で送信中・要検討） |
| ペイロードサイズ制限（`express.json` の `limit` オプション） | 中 | デフォルト100kbは画像dataURLには不足 → 適切な上限設定が必要 |

```ts
import rateLimit from 'express-rate-limit';

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 300,                 // 15分に300リクエストまで
  standardHeaders: true,
  legacyHeaders: false,
}));
```

---

## 6. データ保護

### 6.1 個人情報

本アプリケーションが保持する個人情報:
- 将来的に追加するOAuth認証後のユーザーID・メールアドレス

対応方針:
- 認証実装時に最小限の情報のみ取得・保存（メールアドレスのみ、パスワードは保存しない）
- ユーザーアカウント削除時に関連データを全削除する機能を実装する

### 6.2 データベース

| 要件 | 優先度 | 現状 |
|---|---|---|
| DBポートを外部に公開しない | 高 | docker-compose.prod.yml でホスト公開なし ✓ |
| DBバックアップを定期実行する | 中 | VPS の cron で `pg_dump` を設定推奨 |
| バックアップファイルを暗号化して保存する | 低 | 将来対応 |

---

## 7. 依存関係の管理

| 要件 | 優先度 | 対応方法 |
|---|---|---|
| `npm audit` を定期実行し、高リスク脆弱性を修正する | 高 | CI/CD パイプラインに追加推奨 |
| 依存パッケージを定期的にアップデートする | 中 | Dependabot の有効化を推奨 |
| 不要なパッケージを削除する | 低 | 随時整理 |

---

## 8. 認証実装時の追加要件（Better Auth 導入時）

| 要件 | 詳細 |
|---|---|
| PKCE フロー | OAuthの認可コードフローに PKCE を使用（インターセプト攻撃対策） |
| State パラメーター | CSRF対策としてOAuth認可リクエストに `state` パラメーターを付与 |
| セッション固定攻撃対策 | ログイン成功後にセッションIDを再生成する |
| ログアウト処理 | サーバー側でセッションを無効化する（クライアント側のCookie削除だけでは不十分） |
| アカウントの紐付け | 同一メールアドレスで Google / LINE の両方でログインできる場合のアカウント統合ポリシーを決定 |

---

## 優先度別 実施ロードマップ

### 今すぐ対応（認証実装前でも実施可能）

1. `helmet` の導入（Express）
2. レート制限の追加（`express-rate-limit`）
3. ペイロードサイズ制限の設定
4. 本番環境での `CORS_ORIGIN` を正確なドメインに設定
5. HSTS ヘッダーの追加（Nginx）
6. エラーレスポンスからスタックトレースを除去

### 認証実装時に対応

1. OAuth 2.0 + PKCE フロー
2. HttpOnly Cookie によるセッション管理
3. 全APIエンドポイントの認証ミドルウェア
4. ユーザー所有権チェック（他ユーザーのデータ保護）
5. Zod によるリクエストバリデーション

### 運用開始後に対応

1. `npm audit` の CI 組み込み
2. Dependabot の有効化
3. DBバックアップの自動化
4. セキュリティログの監視
