# 技術詳細解説：OWASP ZAP × GitHub Actions × Claude Code による DevSecOps

このドキュメントは、同人++ で構築した脆弱性診断パイプラインについて、**専門的に何を行っているのか** を解説するものです。手順をなぞるだけの再現ガイド（[`zap-github-actions-guide.md`](./zap-github-actions-guide.md)）とは異なり、各技術の原理・設計判断・トレードオフ・限界を扱います。

対象読者は、仕組みの背景を理解した上で運用・改善したいエンジニアです。

---

## 1. 全体設計：なぜCI/CDに診断を組み込むのか

### 1.1 DevSecOps と「シフトレフト」

従来、セキュリティ診断はリリース直前やリリース後に専門家が手動で行うものでした。しかしこれは「問題が見つかったときには既に作り込まれている」状態を生み、修正コストが高くなります。

**シフトレフト（shift-left）** は、セキュリティ検査を開発ライフサイクルの早い段階（左側）へ移す考え方です。本パイプラインは、

- `main` への push 時（変更が入った瞬間）
- 週次スケジュール（依存ライブラリやインフラ起因の新規脆弱性の継続検知）
- 手動トリガー（任意の検証）

の3つの契機で診断を自動実行し、**問題の検知を継続的・自動的** にしています。これにより「気づいたら脆弱だった」を「変更のたびに機械が見張る」へ転換します。

### 1.2 SAST / DAST / SCA の位置づけ

アプリケーションセキュリティテストには主に3系統があります。

| 種別 | 対象 | 例 | 特徴 |
|---|---|---|---|
| SAST（静的解析） | ソースコード | CodeQL, Semgrep | 実行せずコードを解析。網羅的だが誤検知も多い |
| DAST（動的解析） | 稼働中のアプリ | **OWASP ZAP**, Burp | 実際にHTTPを投げて挙動を観測。本物の応答を見る |
| SCA（依存解析） | ライブラリ | Dependabot, Trivy | 既知の脆弱性を持つ依存を検出 |

本パイプラインの ZAP は **DAST** に分類されます。稼働している本番サイトに実際のHTTPリクエストを送り、返ってきたレスポンスを観測して問題を判定します。「コード上どう書かれているか」ではなく「実際にユーザーへ届くレスポンスがどうか」を見るのが DAST の本質です。

---

## 2. OWASP ZAP の動作原理

### 2.1 スキャンの3形態

ZAP（Zed Attack Proxy）には主に3つのスキャンモードがあります。

| モード | 内容 | 攻撃性 | 用途 |
|---|---|---|---|
| **Baseline Scan** | 受動的スキャン中心。サイトを巡回し、レスポンスを観測するだけ | 低（実質ほぼ無害） | CI で常用。本番にも比較的安全 |
| Full Scan | 能動的スキャン。実際に攻撃ペイロードを送信 | 高 | 検証環境向け |
| API Scan | OpenAPI/GraphQL定義をもとにAPIを診断 | 中〜高 | API専用 |

本パイプラインでは **Baseline Scan** を採用しています。理由は、対象が **本番サイト** であり、能動的スキャン（SQLインジェクションのペイロード送信など）は実害やデータ破壊のリスクがあるためです。Baseline は基本的に「巡回して観測する」だけなので、本番に対しても比較的安全に回せます。

### 2.2 パッシブスキャンとは何を見ているか

Baseline Scan の中核は **パッシブスキャン（受動的スキャン）** です。これは攻撃を仕掛けるのではなく、通常のリクエストに対する **レスポンスを観測** して問題を判定します。具体的には次のようなものを検査します。

- レスポンスヘッダーの過不足（セキュリティヘッダーが設定されているか）
- Cookie の属性（Secure, HttpOnly, SameSite）
- 情報漏えい（サーバーバージョン、コメント中の機密、タイムスタンプ）
- 混在コンテンツ（HTTPS ページ内の HTTP リソース）
- 外部ドメインからのスクリプト読み込み

「実際に攻撃して脆弱性を実証する」のではなく「レスポンスを見て危険な兆候を指摘する」のがパッシブスキャンです。そのため誤検知（実害のない情報提供レベルの指摘）も一定数含まれます（後述の `.zap/rules.tsv` でチューニングします）。

### 2.3 Spider と Ajax Spider

ZAP は対象サイトのページを発見するために「クローラ（Spider）」を使います。

- **通常の Spider**: HTMLをパースしてリンクを辿る。サーバーレンダリングのサイトには十分。
- **Ajax Spider（`-j` オプション）**: ヘッドレスブラウザを使い、JavaScript を実行してから DOM を巡回する。

同人++ は **React + Vite の SPA（Single Page Application）** です。SPA はサーバーが返す初期HTMLがほぼ空で、画面はクライアント側の JavaScript が描画します。そのため通常の Spider だけではほとんどのページを発見できません。`-j`（Ajax Spider）を有効化することで、JS 実行後の実際の画面を巡回でき、診断のカバレッジが上がります。これは SPA を DAST にかけるときの定石です。

### 2.4 採用したコマンドオプションの意味

```
cmd_options: >-
  -a
  -j
  -z "-config alert.maxInstances=0"
```

| オプション | 意味 |
|---|---|
| `-a` | alpha（開発中）を含む追加のパッシブスキャンルールを有効化。検出範囲を広げる |
| `-j` | Ajax Spider を有効化（SPA対応、前述） |
| `-z "-config alert.maxInstances=0"` | ZAP本体への設定渡し。`maxInstances=0` で同一アラートの報告インスタンス数の上限を撤廃し、すべての該当箇所を出力 |

`docker_name: "ghcr.io/zaproxy/zaproxy:stable"` は、ZAP を Docker コンテナとして実行することを示します。GitHub Actions のランナー上で Docker イメージを pull し、その中でスキャンを完結させています。旧 `owasp/zap2docker-stable` はメンテナンス終了済みで、現行は `ghcr.io/zaproxy/zaproxy` です。

---

## 3. 検出されたアラートの技術的意味

今回の初回スキャンで検出された主なアラートを、技術的背景とともに解説します。セキュリティヘッダーは「多層防御（defense in depth）」の一翼で、**アプリ側のバグをブラウザ側で食い止める安全装置** という位置づけです。

### 3.1 Strict-Transport-Security（HSTS）[10035]

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

ブラウザに「今後このドメインは必ず HTTPS で接続せよ」と指示するヘッダー。一度受け取ると、`max-age`（秒）の間、ユーザーが `http://` を打ってもブラウザが自動的に HTTPS へ昇格します。これにより **初回以降の SSL ストリッピング攻撃**（中間者が HTTPS を HTTP に落とす攻撃）を防ぎます。

- `max-age=31536000`: 1年間有効
- `includeSubDomains`: サブドメインにも適用

**設置場所が重要**: HSTS は HTTPS のレスポンスにのみ付与すべきもので、TLS を終端しているサーバーに設定します。本構成では Cloudflare の背後でホスト側 Nginx が TLS を終端するため、`nginx-host.conf` の 443 ブロックに置きました。HTTP（80番）側に付けてもブラウザは無視します（仕様上、平文での HSTS は信頼されない）。

### 3.2 Content-Security-Policy（CSP）[10055]

XSS（クロスサイトスクリプティング）に対する最強クラスの多層防御。「どのオリジンからスクリプト/スタイル/画像/接続を許可するか」をブラウザに宣言します。同人++ では既に詳細な CSP を設定済みで、今回 ZAP が指摘したのは次の2点です。

- **CSP: script-src unsafe-inline**
- **CSP: style-src unsafe-inline**

`'unsafe-inline'` は「インラインの `<script>` や `style=""` を許可する」設定で、CSP の防御力を弱めます。理想は撤廃ですが、

- Vite/React の動的スタイル、Tailwind、framer-motion の制約
- Google Tag Manager のインラインスクリプト

があるため、即時の撤廃は困難です。将来的には **nonce ベース** または **sha256 ハッシュベース** の CSP へ移行する余地があります（インラインスクリプトを外部ファイル化し、ハッシュを許可リストに加える）。今回は「対応困難・許容」と判断しました。リスクを正しく評価して**意図的に残す**のも、セキュリティ運用の重要な判断です。

### 3.3 Cross-Origin 系ヘッダー（COOP / COEP / CORP）[90004]

これらは **クロスオリジン分離（cross-origin isolation）** に関わるヘッダー群で、Spectre 系のサイドチャネル攻撃やクロスオリジンの情報漏えいへの対策です。3つの役割の違いを理解することが肝心です。

| ヘッダー | 守る対象 | 採用値 | 効果 |
|---|---|---|---|
| **COOP**（Cross-Origin-Opener-Policy） | 自分が開いた/開かれたウィンドウとの関係 | `same-origin-allow-popups` | 別オリジンの window 参照を断ち切り、`window.opener` 経由の攻撃を防ぐ。ただしポップアップは許容 |
| **CORP**（Cross-Origin-Resource-Policy） | 自分のリソースを誰に埋め込ませるか | `same-origin` | 他サイトが自分の画像/スクリプトを `<img>`/`<script>` で読み込むのを制限 |
| **COEP**（Cross-Origin-Embedder-Policy） | 自分が埋め込む外部リソースの条件 | **今回は未設定** | `require-corp` にすると、CORP/CORS を返さない外部リソースを全ブロック |

#### なぜ COEP を意図的に除外したか

COEP（`require-corp`）を有効にすると、**自サイトが読み込むすべてのクロスオリジンリソースが、明示的に CORP または CORS ヘッダーを返さない限りブロック** されます。同人++ は

- 書影画像（openbd, Google Books, 楽天）
- Stripe の checkout / billing フレーム
- Google Tag Manager / Google Analytics

など多数の外部オリジンに依存しています。これらが適切なヘッダーを返さなければ、**書影が表示されない・決済が壊れる** といった実害が発生します。COOP/CORP/HSTS は副作用が小さい一方、COEP は破壊力が大きいため、本パイプラインでは意図的に除外しました。

「セキュリティ強化と可用性のトレードオフを評価し、副作用の大きい変更を切り離す」——これは実運用での標準的な意思決定です。COEP を入れる場合は、依存する全外部リソースの CORP/CORS 対応を確認し、反映直後に書影表示・決済フローを実機検証する前提が必要です。

#### COOP に `same-origin` ではなく `same-origin-allow-popups` を選んだ理由

純粋な `same-origin` は、自分が `window.open` で開いたポップアップとの参照関係まで切断します。同人++ は Stripe の決済や OAuth ログインでポップアップ/リダイレクトを使うため、`same-origin-allow-popups` を選び、**自分が開いたポップアップとの連携は維持しつつ、外部から開かれた場合の参照は遮断** するバランスにしました。

### 3.4 Permissions-Policy [10063]

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

ブラウザの強力な機能（カメラ・マイク・位置情報など）の利用可否をオリジン単位で制御します。`()` は「どのオリジンにも許可しない」の意味で、万一 XSS が起きても、これらのデバイス機能を悪用されにくくします。今回の指摘は `/assets/*.js` で欠落していたケースで、原因は次節の Nginx の挙動です。

### 3.5 X-Content-Type-Options [10021]

```
X-Content-Type-Options: nosniff
```

ブラウザによる **MIME スニッフィング**（Content-Type を無視して中身から型を推測する挙動）を禁止します。これにより、画像のふりをした実行可能スクリプトなどの混同攻撃を防ぎます。

### 3.6 Sub Resource Integrity（SRI）欠如 [90003]

外部 CDN から読み込むスクリプトに `integrity="sha384-..."` 属性を付け、**配信ファイルが改ざんされていないこと** をハッシュで検証する仕組み。CDN 自体が侵害された場合の防御です。同人++ は外部 CDN からの直接スクリプト読み込みが実質ないため、リスクは低く WARN/IGNORE 許容としました。

### 3.7 情報提供レベルのアラート（誤検知に近いもの）

| アラート | 性質 |
|---|---|
| Timestamp Disclosure - Unix [10096] | JS内の数値が偶然タイムスタンプに見えるだけのことが多い |
| Base64 Disclosure [10094] | エンコード文字列の検出。脅威ではないことが大半 |
| Modern Web Application [10109] | 「SPAですね」という情報提供。脆弱性ではない |
| Sec-Fetch-* Header Missing [90005] | リクエスト側ヘッダーの話で、サーバー対処の対象外が多い |

これらは脅威度が低く、`.zap/rules.tsv` で `IGNORE` に設定して恒常的なノイズを除去します。**誤検知を放置せずチューニングする**ことで、レポートの S/N 比を保ち、本当に重要なアラートを埋もれさせないのが運用のコツです。

---

## 4. Nginx の add_header 継承という落とし穴

今回、`Permissions-Policy` が `/assets/*.js` でのみ欠落していたのは、**Nginx の `add_header` の継承仕様** が原因です。これは実務で頻出する重要な挙動です。

> Nginx の `add_header` は、**子ブロック（location など）に1つでも `add_header` が存在すると、親ブロックの `add_header` をすべて継承しなくなる**（上書きではなく「打ち消し」）。

`frontend/nginx.conf` では、`server` スコープに全セキュリティヘッダーを定義していましたが、`/assets/` の location ブロックがキャッシュ制御のために独自の `add_header`（`Cache-Control` など）を持っていました。その結果、`/assets/` 配下のレスポンスでは **server スコープのヘッダーが一切継承されず**、`Permissions-Policy` などが欠落していたのです。

対処は、ヘッダーを効かせたい **すべての location に明示的に書く** こと。今回 Claude に依頼した際も「server スコープと各 location すべてに明示すること」と指定したのはこのためです。

なお、`proxy_set_header`（リバースプロキシでバックエンドへ送るヘッダー）は `add_header`（クライアントへ返すレスポンスヘッダー）とは別物で、この継承打ち消しを引き起こしません。`nginx-host.conf` の `location /` は `proxy_set_header` しか持たないため、HSTS を server スコープに1つ書くだけで全レスポンスに継承されました。

---

## 5. GitHub Actions のセキュリティモデル

### 5.1 GITHUB_TOKEN と最小権限

ワークフローには各ジョブごとに `permissions:` を明示しています。

```yaml
permissions:
  contents: read
  issues: write
```

GitHub Actions は実行時に一時的な `GITHUB_TOKEN` を自動発行します。`permissions:` はこのトークンに与える権限を **最小権限の原則（least privilege）** に従って絞るものです。ZAP のジョブは「リポジトリを読む」「Issue を書く」だけで十分なので、それ以外（PR への書き込みなど）は付与しません。万一ワークフローが侵害されても被害範囲を限定できます。

ZAP の Issue 書き込みのために、リポジトリ設定で Workflow permissions を「Read and write」に変更したのも、この `GITHUB_TOKEN` の既定権限を引き上げる操作です。

### 5.2 Claude Code Action の認証フロー（OIDC → App Token）

Claude のワークフローには `id-token: write` 権限があります。これは **OIDC（OpenID Connect）** を使うためです。実行ログを追うと、次の流れが見えます。

```
Requesting OIDC token...            ← ランナーが GitHub の OIDC トークンを取得
Exchanging OIDC token for app token ← それを GitHub App のトークンに交換
Using GITHUB_TOKEN from OIDC
Checking permissions for actor: nico0748
Permission level retrieved: admin   ← コメント投稿者の権限を検証
```

ポイントは2段階の認証です。

1. **GitHub への認証**: ランナーの OIDC トークンを GitHub App（Claude アプリ）のインストールトークンに交換。静的な PAT（個人アクセストークン）を保存せずに済み、トークンは短命で安全。
2. **Anthropic への認証**: `CLAUDE_CODE_OAUTH_TOKEN` を使って Claude API（サブスク枠）にアクセス。

さらに、コメント投稿者（actor）の権限を検証し、**write 権限を持つ人物の `@claude` のみ** に反応します。これにより、外部の第三者が Issue にコメントして AI を勝手に操作する **プロンプトインジェクション／権限昇格** を防いでいます。

### 5.3 OAuth トークン認証 vs API キー認証

`anthropics/claude-code-action` の `action.yml` には複数の認証入力が定義されています。

| 入力 | 認証先 | 課金モデル |
|---|---|---|
| `anthropic_api_key` | Claude API（Console） | 従量課金（トークン単位） |
| `claude_code_oauth_token` | Claude サブスク（Pro/Max） | 月額固定枠内 |
| `anthropic_federation_rule_id` 他 | Workload Identity Federation | 組織向け |
| `use_bedrock` / `use_vertex` / `use_foundry` | クラウドプロバイダ経由 | 各クラウド課金 |

本構成では `claude_code_oauth_token` を採用。`claude setup-token` が生成する OAuth トークン（`sk-ant-oat01-...`）は、Pro/Max サブスクリプションに紐づき、追加の従量課金が発生しません。アクション内部ではこれを `CLAUDE_CODE_OAUTH_TOKEN` 環境変数として Claude Code SDK に渡し、Bearer 認証で API を呼びます。`401 Invalid bearer token` は、この Bearer トークンがサーバー側で無効と判定された状態を指します（値の破損・期限切れ・サブスク未紐づけなど）。

### 5.4 Secret 管理の原則

- トークン類は **必ず GitHub Secrets** に保管し、ワークフローには `${{ secrets.NAME }}` で参照する（平文でコミットしない）。
- Secrets は **Actions スコープの Repository secrets** に置く。Variables（非機密の変数）や別機能（Agents 等）とは保管場所が異なる。
- 漏えい時（ログやチャットへの露出を含む）は **即座にローテーション**（再生成して差し替え）。OAuth トークンは `claude setup-token` で再発行できる。

---

## 6. 修正対応のワークフロー設計

### 6.1 人間・機械・AI の役割分担

本パイプラインは、各工程を適材適所で分担しています。

| 工程 | 担い手 | 理由 |
|---|---|---|
| 検知 | OWASP ZAP（機械） | 網羅的・反復的な検査は機械が得意 |
| トリアージ・方針決定 | 人間 | リスク評価・副作用判断（例: COEP 除外）は人間の責任 |
| 修正コード生成 | Claude（AI） | 定型的なヘッダー追加などの実装を高速化 |
| レビュー・承認 | 人間 | AI の出力は必ず人がレビューしてマージ |
| 本番反映 | 人間（VPS操作） | インフラ操作は不可逆な影響があるため人が実行 |

重要なのは、**AI に「検知」も「最終承認」もさせない** 設計です。AI は実装を加速する道具であり、リスク判断と承認は人間が握ります。

### 6.2 CLAUDE.md による制約の継承

Claude Code Action は、リポジトリ root の `CLAUDE.md` を読み込み、そこに書かれたルール（同人++ では「main 直コミット禁止、feature/fix/chore ブランチ + PR」）に従います。AI による変更も人間と同じガバナンス（ブランチ運用・PR レビュー）に乗せられるため、自動化しても統制が崩れません。

### 6.3 依頼プロンプトの設計

AI への依頼は、再現性と安全性のために具体性を持たせます。実際の依頼では、

- 対象ファイルと変更内容を明示（`frontend/nginx.conf` に COOP/CORP を、各 location に明示）
- 採用値を指定（COOP は `same-origin-allow-popups`）
- 除外事項を明示（COEP は副作用が大きいので除外）
- 既存ルールの尊重を指示（CLAUDE.md に従う）

としました。「何を・どこに・どんな値で・何を避けて」を与えることで、AI の出力のブレと事故を抑えます。

---

## 7. 本構成の限界と今後の発展

### 7.1 Baseline Scan の限界

- **認証後の画面を診断できない**: Baseline は基本的に未ログイン状態を巡回します。ログイン後にしか到達できない機能（本棚編集、決済後画面など）は診断対象外です。認証付き診断には、ZAP のコンテキスト設定・認証スクリプト、または Full Scan + 認証構成が必要です。
- **能動的攻撃を行わない**: SQLi/XSS などを実際に注入して実証するわけではないため、ロジック上の脆弱性は検出しにくい。検証環境での Full Scan が補完になります。
- **誤検知の存在**: パッシブ検査ゆえ情報提供レベルの指摘が混じります。`rules.tsv` の継続的チューニングが前提です。

### 7.2 発展の方向性

- **認証付きスキャン**: ログイン状態のコンテキストを与え、保護領域まで診断範囲を広げる。
- **検証環境での Full Scan**: 本番では危険な能動的スキャンを、CI 内で起動した使い捨て環境（docker compose で本番同等構成を立ち上げ `http://localhost` をスキャン）に対して実施する。
- **多層化**: SAST（CodeQL 等）・SCA（Dependabot/Trivy）を併用し、DAST だけでは届かない層をカバーする。
- **CSP の nonce/ハッシュ化**: `'unsafe-inline'` を撤廃し、CSP の防御力を最大化する。
- **結果の集約**: ZAP の JSON/SARIF 出力を GitHub Code Scanning（Security タブ）に取り込み、アラートを一元管理する。

---

## 8. まとめ

本パイプラインの技術的な要点は次の通りです。

- DAST ツールである OWASP ZAP を、**Baseline（パッシブ）スキャン** として CI/CD に組み込み、push・週次・手動の3契機で **継続的に** 本番を診断している。
- SPA であるため **Ajax Spider（`-j`）** が診断カバレッジの鍵。
- 検出される多くはセキュリティヘッダーの過不足で、**HSTS / COOP / CORP / Permissions-Policy** を多層防御として追加。**COEP は可用性への副作用が大きいため意図的に除外**するという、セキュリティと可用性のトレードオフ判断を行った。
- Nginx の **`add_header` 継承打ち消し** を理解し、全 location にヘッダーを明示することで `/assets/` の欠落を解消。
- 修正は GitHub App + **OIDC による短命トークン**と、コメント投稿者の権限検証で安全性を担保。認証は **OAuth トークン（サブスク枠）** を用い、従量課金を回避。
- AI には実装を任せつつ、**検知（機械）・判断と承認（人間）・実装（AI）** を分離し、`CLAUDE.md` のガバナンスを自動化後も維持している。

---

## 関連ドキュメント

- [初学者向け再現ガイド（手順書）](./zap-github-actions-guide.md)
- [`security-requirements.md`](./security-requirements.md) — 本プロジェクトのセキュリティ要件
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — デプロイ手順
- [`HTTPS_SETUP.md`](./HTTPS_SETUP.md) — HTTPS / 証明書まわり

## 参考リンク

- OWASP ZAP 公式: https://www.zaproxy.org/
- ZAP Baseline Scan: https://www.zaproxy.org/docs/docker/baseline-scan/
- zaproxy/action-baseline: https://github.com/zaproxy/action-baseline
- Claude Code GitHub Actions: https://docs.claude.com/en/docs/claude-code/github-actions
- anthropics/claude-code-action: https://github.com/anthropics/claude-code-action
- MDN セキュリティヘッダー: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
