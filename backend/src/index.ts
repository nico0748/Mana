// ローカル開発・Docker 用のエントリポイント。
// Vercel では api/index.ts が app.ts を直接読み込むため、このファイルは使われない。
import app from './app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
