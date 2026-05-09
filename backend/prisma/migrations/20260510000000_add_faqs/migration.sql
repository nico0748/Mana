-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Faq_order_idx" ON "Faq"("order");

-- Seed: existing hardcoded FAQ entries (LandingPage.tsx より移植)。
-- 既に同じ question が存在する場合（再実行時など）は何もしない。
INSERT INTO "Faq" ("id", "question", "answer", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, q, a, ord, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('テンプレートデータとは？',
   '即売会名・日程・ホール一覧と会場マップ画像を含んだデータです。アプリ内でインポートすると即売会・ホール一覧・マップ画像までまとめて自動作成されます。コミュニティ申請 → 運営承認の流れで TEMPLATE に掲載されます。',
   1),
  ('マップ画像はどこから用意すればよいですか？',
   '各即売会の公式サイトで配布されている PDF や画像をお使いください。PDF・JPG・PNG いずれも対応しています。TEMPLATE の承認済みテンプレートを使えば画像も同梱されています。',
   2),
  ('データはどこに保存されますか？',
   'アカウントに紐づいてクラウドに保存されます。複数デバイスからアクセス可能です。',
   3),
  ('既存の Excel データは使えますか？',
   'はい。CSV・Excel・JSON 形式でのインポートに対応しています。テンプレートファイルをダウンロードして書式を確認できます。',
   4),
  ('無料プランの上限は？',
   '蔵書 200 冊、サークル 50、イベント 3 までを無料でご利用いただけます。Pro プラン（月額 ¥480 / 年額 ¥4,800 予定）で無制限になる予定ですが、現在準備中です。',
   5),
  ('Pro プランはいつ使えるようになりますか？',
   'Pro プランは現在準備中です。リリース時期が決まり次第、お知らせします。それまではすべての方に Free プランの上限内でご利用いただけます。',
   6)
) AS seed(q, a, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Faq" WHERE "question" = seed.q);
