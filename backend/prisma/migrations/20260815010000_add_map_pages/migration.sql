-- 複数ページ PDF の会場マップを、ページごとに 1 レコードとして持てるようにする。
-- 既存のマップはすべて 1 ページ目として扱う。
ALTER TABLE "VenueMap" ADD COLUMN "page" INTEGER NOT NULL DEFAULT 1;

-- ピンがどのページに置かれたか。NULL は 1 ページ目とみなす。
-- ページ概念の導入前に置かれたピンを 1 ページ目に残すため、既定値を持たせず NULL 許容にする。
ALTER TABLE "Circle" ADD COLUMN "mapPage" INTEGER;

-- ホールとページでの引き当てが増えるので索引を張る。
-- 一意制約にはしない。既存データに同じ組み合わせの重複が万一あると
-- マイグレーションが失敗し、バックエンドが起動しなくなるため。
-- 「1 組み合わせにつき 1 枚」はアプリ側の保存処理で担保している。
CREATE INDEX "VenueMap_userId_hall_page_idx" ON "VenueMap"("userId", "hall", "page");
