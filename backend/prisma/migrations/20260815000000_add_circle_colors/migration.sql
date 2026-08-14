-- サークルの色分け（ジャンル分け / 代理購入と自分用の区別など）。
-- 値は共有パレットのキー（red, blue, …）。既存行は NULL＝未設定。
ALTER TABLE "Circle" ADD COLUMN "color" TEXT;

-- 色に付ける名前。{ "red": "代理購入", "blue": "自分用" } の形。
-- 即売会ごとに意味が変わるためイベント側に持たせる。
ALTER TABLE "DoujinEvent" ADD COLUMN "colorLabels" JSONB;
