import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config';

// 同人++ アプリアイコンの生成設定。
// public/doujin-pp.png（499x499）を元に、PWA 用の各サイズアイコンと
// iOS 向け apple-touch-icon、Favicon を一括生成する。
//
// 生成コマンド:
//   npx pwa-assets-generator --preset minimal-2023 public/doujin-pp.png
export default defineConfig({
  preset,
  images: ['public/doujin-pp.png'],
});
