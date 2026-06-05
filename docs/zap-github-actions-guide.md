# OWASP ZAP × GitHub Actions × Claude Code 脆弱性診断・修正ガイド（初学者向け）

このドキュメントは、セキュリティの知識がほとんどない人でも、同人++（doujin++）で実際に構築した「脆弱性の自動診断 → 自動修正提案 → 本番反映」の仕組みを **そのまま再現できる** ことを目的とした手順書です。

専門的な背景や「なぜそうするのか」を詳しく知りたい場合は、姉妹ドキュメント [`zap-github-actions-technical.md`](./zap-github-actions-technical.md) を参照してください。本ガイドは「迷わず手を動かせること」を優先しています。

---

## 0. これは何をする仕組み？

ひとことで言うと、**Webサイトの弱点（脆弱性）を機械が定期的に診断し、見つかった問題をAIが直してくれる流れ** を作ります。

全体像はこうです。

```
┌─────────────┐   ①自動診断    ┌──────────────┐
│ GitHub Actions │ ───────────▶ │  OWASP ZAP   │  本番サイトをスキャン
│ （定期/push） │              └──────┬───────┘
└─────────────┘                     │ ②結果をIssue化
                                     ▼
                            ┌──────────────┐
                            │ GitHub Issue │  「ここが弱点だよ」レポート
                            └──────┬───────┘
                                   │ ③ @claude とコメント
                                   ▼
                            ┌──────────────┐
                            │  Claude Code │  修正コードを書いてPR作成
                            └──────┬───────┘
                                   │ ④レビュー＆マージ
                                   ▼
                            ┌──────────────┐
                            │   VPS 反映   │  本番サーバーに適用
                            └──────────────┘
```

登場人物は3つです。

- **OWASP ZAP（おわすぷ・ざっぷ）**: 世界で最も使われている無料のWeb脆弱性診断ツール。サイトを巡回して「セキュリティヘッダーが足りない」などの問題を見つけてくれます。
- **GitHub Actions**: GitHub上で自動的にプログラムを動かす仕組み。ここで ZAP を定期的に走らせます。
- **Claude Code（GitHub連携）**: Issue に `@claude` とコメントすると、修正コードを書いて Pull Request（PR）を作ってくれるAI。

---

## 1. 前提と用語

### 用意するもの

- GitHub リポジトリ（管理者権限が必要）
- 診断したい **自分が運用している** 本番サイトのURL（今回は `https://doujin-pp.com`）
- Claude Pro または Max のサブスクリプション（AIの修正機能を「追加課金なし」で使うため）
- 本番サーバー（今回は ConoHa VPS）へのSSHアクセス

> ⚠️ **重要な注意**: ZAP のスキャンは「攻撃」とみなされることがあります。**必ず自分が所有・運用しているサイトだけ** を対象にしてください。他人のサイトをスキャンするのは法律違反になり得ます。

### 知っておくと良い最小限の用語

| 用語 | かんたんな意味 |
|---|---|
| 脆弱性 | サイトの弱点・セキュリティの穴 |
| ワークフロー | GitHub Actions の自動処理の定義ファイル（`.yml`） |
| Secret | パスワードやトークンを安全に保管する GitHub の金庫 |
| Issue | GitHub の課題管理チケット |
| PR（Pull Request） | コード変更の提案。レビューしてからマージ（本採用）する |
| セキュリティヘッダー | ブラウザに「こう振る舞ってね」と指示する安全装置 |

---

## 2. パート1：ZAP で自動診断を仕込む

### 2-1. ワークフローファイルを作る

リポジトリに `.github/workflows/zap-baseline.yml` を作成します。

```yaml
name: ZAP Baseline Scan

on:
  push:
    branches: [main]            # main に変更が入ったとき
  schedule:
    - cron: "0 0 * * 1"         # 毎週月曜 00:00 UTC（＝月曜 09:00 JST）
  workflow_dispatch:             # 手動でも実行できるように

permissions:
  contents: read
  issues: write                  # スキャン結果を Issue に書き込むため

jobs:
  zap_baseline:
    name: OWASP ZAP Baseline Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.15.0
        with:
          target: "https://doujin-pp.com"   # ← あなたのサイトURLに変更
          token: ${{ secrets.GITHUB_TOKEN }}
          docker_name: "ghcr.io/zaproxy/zaproxy:stable"
          cmd_options: >-
            -a
            -j
            -z "-config alert.maxInstances=0"
          rules_file_name: ".zap/rules.tsv"
          fail_action: false                 # 警告でCIを失敗扱いにしない
          allow_issue_writing: true
          artifact_name: zap-baseline-report
```

### 2-2. 誤検知の抑制ファイルを作る

`.zap/rules.tsv` を作成します（最初は空のテンプレートでOK）。

```tsv
# OWASP ZAP Baseline Scan ルール設定ファイル（タブ区切り）
# 形式: <ルールID>	<WARN|IGNORE|FAIL>	(任意メモ)
#   IGNORE = そのルールを無視（誤検知の抑制に使う）
# 例:
# 10096	IGNORE	(Timestamp Disclosure - 誤検知が多いため抑制)
```

> 💡 オプションの意味: `-a` はテスト中の追加ルールも有効化、`-j` は JavaScript で動くサイト（React など）もきちんと巡回するための Ajax Spider、`fail_action: false` は「警告が出てもエラーで止めない」設定です。

### 2-3. ブランチを切ってコミットする

このプロジェクトでは **main への直接コミットは禁止** されています（`CLAUDE.md` 参照）。必ずブランチを切ります。

```bash
git checkout -b chore/zap-baseline-scan
git add .github/workflows/zap-baseline.yml .zap/rules.tsv
git commit -m "chore: OWASP ZAP baseline scan を追加"
git push -u origin chore/zap-baseline-scan
```

GitHub 上で PR を作成 → マージします。

### 2-4. リポジトリの権限設定（重要）

ZAP が Issue を書き込めるよう、リポジトリ設定を変更します。

**Settings → Actions → General → Workflow permissions → 「Read and write permissions」を選択 → Save**

これをしないと `Resource not accessible by integration` というエラーになります。

### 2-5. 動かしてみる

**Actions タブ → ZAP Baseline Scan → Run workflow** で手動実行します。完了すると、リポジトリの **Issues** に診断レポートが作られます。

---

## 3. パート2：Claude Code（OAuth）で自動修正を仕込む

### 3-1. なぜ OAuth なのか（お金の話）

AIの修正機能を動かす認証方法は2つあります。

| 方法 | 課金 |
|---|---|
| API キー（`ANTHROPIC_API_KEY`） | **従量課金**。使うほどトークン単位で課金される |
| OAuth トークン（`CLAUDE_CODE_OAUTH_TOKEN`） | **追加課金なし**。Claude Pro/Max の月額に含まれる（利用上限あり） |

すでに Pro/Max を契約しているなら、OAuth の方が追加費用ゼロでお得です。本ガイドは OAuth で進めます。

### 3-2. ワークフローファイルを作る

`.github/workflows/claude.yml` を作成します。

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          claude_args: "--max-turns 15"
```

`if:` の行は「`@claude` が含まれるときだけ動かす」という条件です。無駄な起動と課金を防ぎます。

### 3-3. Claude GitHub App をインストールする

一番簡単なのは、ターミナルで Claude Code を開いて以下を実行する方法です（リポジトリ管理者権限が必要）。

```bash
claude
# 起動したら
/install-github-app
```

ガイドに従って進めると、アプリのインストールが完了します。手動でやる場合は https://github.com/apps/claude からインストールし、対象リポジトリに Contents / Issues / Pull requests の **Read & write** 権限を付与します。

### 3-4. OAuth トークンを生成して Secret に登録する

ターミナルで、**Pro/Max のアカウントでログインした状態** でトークンを生成します。

```bash
# まず Pro/Max でログインしているか確認
claude
/login        # サブスクのアカウントで認証
/exit

# トークンを生成（sk-ant-oat01-... が表示される）
claude setup-token
```

生成された `sk-ant-oat01-...` を **丸ごと** コピーします。コピーミスを防ぐため、クリップボードへ直接送るのが確実です。

```bash
# macOS
claude setup-token | tail -1 | tr -d '\n' | pbcopy
# Linux (X11)
claude setup-token | tail -1 | tr -d '\n' | xclip -selection clipboard
# Linux (Wayland)
claude setup-token | tail -1 | tr -d '\n' | wl-copy
```

次に GitHub に登録します。**置き場所を間違えないことが最重要** です。

**Settings → Secrets and variables → Actions → 「Secrets」タブ → Repository secrets → New repository secret**

- Name: `CLAUDE_CODE_OAUTH_TOKEN` （大文字・アンダースコアまで完全一致）
- Value: コピーしたトークン

> ⚠️ よくある間違い:
> - 「Variables」タブに入れてしまう（→ `secrets.` で読めず認証失敗）
> - リポジトリナビの「Agents」に入れてしまう（→ これは無関係の別機能）
> - 名前のスペルミス・末尾の改行や空白の混入

### 3-5. ワークフローをコミットする

```bash
git checkout -b chore/claude-github-action
git add .github/workflows/claude.yml
git commit -m "chore: Claude Code GitHub Actions を追加（OAuth認証）"
git push -u origin chore/claude-github-action
```

PR を作成 → マージします。

---

## 4. パート3：実際にアラートを修正する

### 4-1. Issue に依頼する

ZAP が作った Issue を開き、**新しいコメント** として（既存コメントの編集では再実行されません）、具体的に依頼します。

```
@claude 以下の方針でセキュリティヘッダーを追加するPRを作成してください。

1. frontend/nginx.conf に COOP（same-origin-allow-popups）と CORP（same-origin）を追加。
   server スコープと各 location ブロックすべてに明示すること。
2. /assets/ の location に Permissions-Policy を追加。
3. nginx-host.conf の 443 ブロックに HSTS を追加。
4. .zap/rules.tsv に情報系アラート（Timestamp Disclosure 等）を IGNORE で追記。

CLAUDE.md のブランチ運用ルールに従ってPRを作成してください。
COEP は副作用が大きいので今回は除外してください。
```

数分すると、Claude が修正ブランチを作って PR 作成リンク付きのコメントを返します。

### 4-2. 依頼のコツ

- **具体的に書く**: 「どのファイルに・何を・どんな値で」を指定するほど精度が上がります。
- **副作用の大きい変更は除外を明示する**: 例えば COEP は外部画像や決済を壊しやすいので「除外して」と書きます（理由は技術解説ドキュメント参照）。
- **CLAUDE.md を尊重させる**: プロジェクトのルール（ブランチ運用など）に従うよう一言添えます。

### 4-3. レビューしてマージ

PR の差分（Files changed）を確認し、問題なければマージします。AIの提案も**必ず人がレビュー**してから採用します。

---

## 5. パート4：本番（VPS）へ反映する

セキュリティヘッダーには2つの反映先があります。

### 5-1. コンテナ側（frontend/nginx.conf の変更）

このプロジェクトでは `frontend/nginx.conf` は **ビルド時に Docker イメージへ焼き込まれる** ため、コンテナを再起動するだけでは反映されません。**必ずイメージを作り直す** 必要があります。

```bash
# VPS にSSH接続後
cd ~/doujin-pp
bash deploy.sh        # git pull → build --no-cache → 再起動を一括実行
```

> ⚠️ `docker compose ... up -d --force-recreate frontend` だけでは古い設定のまま反映されません。`bash deploy.sh`（または `--build` 付き）を使ってください。

### 5-2. ホスト側 Nginx（HSTS / nginx-host.conf の変更）

HSTS は TLS（HTTPS）を終端しているホスト側の Nginx に設定します。リポジトリの `nginx-host.conf` は **プレースホルダ入りのテンプレート** なので、丸ごと上書きせず、本番ファイルに1行だけ追記します。

```bash
sudo nano /etc/nginx/sites-available/doujin-pp
```

443 の `server { }` ブロック直下（`location` の外側）に追記します。

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

保存したら検証して再読込します。

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`test is successful` が出れば成功です。

### 5-3. 反映を確認する

```bash
curl -sI https://doujin-pp.com | grep -iE 'strict-transport|cross-origin-(opener|resource)|permissions-policy'
curl -sI https://doujin-pp.com/assets/index-XXXX.js | grep -iE 'permissions-policy|cross-origin-resource'
```

期待するヘッダーが表示されればOKです。最後に **実機で書影表示と決済フローを確認** し、何も壊れていないことを見ます。そのうえで ZAP を再実行すれば、対応したアラートが消えていることを検証できます。

---

## 6. つまずきポイントと対処（実際に遭遇したもの）

実際の構築で起きたトラブルと解決法をまとめます。同じ症状が出たらここを見てください。

### 6-1. Artifact 作成に失敗する

**症状**: `Create Artifact Container failed: The artifact name ... is not valid`（api-version 6.0-preview）

**原因**: 古いバージョンの `action-baseline`（v0.12.0 など）が、すでに停止した古い `upload-artifact` を内部で使っているため。

**対処**: アクションを `zaproxy/action-baseline@v0.15.0` に、`actions/checkout` を `@v5` に更新する。これで Node.js 20 廃止の警告も同時に解消します。

### 6-2. Claude が `401 Invalid bearer token` で落ちる

**症状**: 起動から約2秒で認証エラー。

**切り分け方**: ローカルでトークンが有効か直接テストします。

```bash
CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..." claude -p "say hi"
```

- 応答が返る → トークンは有効。**GitHub の Secret に貼った値が壊れている**（末尾切れ・改行混入）か、main のワークフローがまだ API キー版のまま。→ 値を貼り直す／ワークフローの認証行を確認。
- ここでも 401 → **トークン生成の前提が崩れている**。`env | grep ANTHROPIC` で API キーが環境変数に残っていないか確認し、外してから `/login`（サブスク）→ `setup-token` をやり直す。

> セキュリティ注意: トークンをチャットやログに貼ってしまったら、漏洩扱いで `claude setup-token` から再生成し、Secret を差し替えてください。

### 6-3. Secret の置き場所が分からない

`CLAUDE_CODE_OAUTH_TOKEN` は必ず **Settings → Secrets and variables → Actions → 「Secrets」タブ → Repository secrets** に置きます。「Variables」タブやリポジトリナビの「Agents」は別物で、そこに入れても読まれません。

### 6-4. `git commit` が `index.lock` / `HEAD.lock` で失敗する

**症状**: `Unable to create '.git/index.lock': File exists` など。

**対処**: 他に git プロセスが動いていないことを確認してから、残ったロックファイルを削除します。

```bash
ps aux | grep '[g]it'
rm -f .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock
find .git -maxdepth 2 -name '*.lock' -print -delete
```

### 6-5. `nginx -t` が `unknown directive "　　#"` で失敗する

**症状**: 設定テストで `unknown directive "　..."` のようなエラー。

**原因**: 行頭に **全角スペース（　）** が混入している。日本語入力（IME）のまま字下げすると起こりがち。nginx は全角スペースを空白と認識しません。

**対処**: 該当行（エラーに行番号が出る）の行頭を **半角スペース** で打ち直す。不安なら該当行をまるごと消して半角で書き直す。

### 6-6. VPS の sudo パスワードを忘れた（ConoHa）

データを消さずに復旧できます。

1. ConoHa コントロールパネル → 対象VPS → 「コンソール」を開く
2. パネルから VPS を再起動
3. 起動直後に Esc/Shift を連打して GRUB メニューを出す
4. 起動エントリで `e` を押し、`linux` で始まる行の `ro` を `rw` に変え、行末に `init=/bin/bash` を追加
5. `Ctrl + X` で起動 → パスワードなしで root シェルに入る
6. 以下を実行（最初の remount を忘れると書き込めません）

```bash
mount -o remount,rw /
passwd doujin-pp     # 新パスワードを2回入力
```

7. パネルから再起動して通常起動に戻す

---

## 7. 全体チェックリスト

再現できたか、最後に確認しましょう。

- [ ] `.github/workflows/zap-baseline.yml` と `.zap/rules.tsv` を作成・マージした
- [ ] Workflow permissions を「Read and write」にした
- [ ] ZAP を手動実行し、Issue にレポートが出た
- [ ] Claude GitHub App をインストールした
- [ ] `CLAUDE_CODE_OAUTH_TOKEN` を Actions の Secrets に登録した
- [ ] `.github/workflows/claude.yml` を作成・マージした
- [ ] Issue に `@claude` で依頼し、PR が作られた
- [ ] PR をレビューしてマージした
- [ ] VPS でコンテナ側（`bash deploy.sh`）とホスト側（HSTS 追記 + reload）を反映した
- [ ] `curl -sI` でヘッダーを確認し、実機で動作確認した
- [ ] ZAP を再実行してアラートが消えたことを確認した

すべてチェックできれば、脆弱性診断から修正・反映までの一周が再現できています。

---

## 関連ドキュメント

- [技術詳細解説（専門的な背景・各設定の意味）](./zap-github-actions-technical.md)
- [`security-requirements.md`](./security-requirements.md) — 本プロジェクトのセキュリティ要件
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — デプロイ手順
- [`HTTPS_SETUP.md`](./HTTPS_SETUP.md) — HTTPS / 証明書まわり
