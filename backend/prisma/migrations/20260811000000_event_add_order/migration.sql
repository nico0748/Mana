-- MAP ヘッダーでの手動並べ替え順。既存行は NULL のままで、開催日などの自動ソートにフォールバックする。
ALTER TABLE "DoujinEvent" ADD COLUMN "order" INTEGER;
