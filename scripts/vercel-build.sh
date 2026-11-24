#!/usr/bin/env bash
# Vercel のビルドコマンド（vercel.json の buildCommand から呼ばれる）。
# frontend の静的ビルドと、api/index.js が読み込む backend のビルドを行い、
# 本番デプロイのときだけ DB マイグレーションを適用する。
set -euo pipefail

echo "▶ frontend をビルド"
npm run build --prefix frontend

echo "▶ backend をビルド（Prisma Client 生成 + tsc）"
(cd backend && npx prisma generate && npm run build)

# プレビューデプロイで本番 DB のスキーマを変えないよう、既定では production のときだけ流す。
# プレビュー用に別 DB（Neon のブランチなど）を割り当てている場合は RUN_MIGRATIONS=1 で有効にできる。
if [[ "${VERCEL_ENV:-}" == "production" || "${RUN_MIGRATIONS:-}" == "1" ]]; then
  echo "▶ prisma migrate deploy"
  # マイグレーションはプーラーを通さない直結 URL で流す（Neon 連携では DATABASE_URL_UNPOOLED が入る）。
  (cd backend && DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" npx prisma migrate deploy)
else
  echo "▶ VERCEL_ENV=${VERCEL_ENV:-unset} のためマイグレーションはスキップ"
fi
