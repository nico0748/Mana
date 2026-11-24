// Vercel Functions のエントリポイント。
// /api/* へのリクエストは vercel.json の rewrites でここに集まり、Express アプリがそのまま処理する
// （req.url は元のパスのまま渡るので、backend 側のルーティングは変更不要）。
// backend/dist は scripts/vercel-build.sh のビルドで生成される。
module.exports = require('../backend/dist/app').default;
