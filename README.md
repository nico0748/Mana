# mana

個人書籍管理Webアプリケーション「Mana Library」のリポジトリ。

## プロジェクト概要

書籍（商業本・同人誌）を管理するシングルユーザー向けWebアプリ。バーコードスキャンによるISBN取得と、外部書籍APIからの自動メタデータ取得機能を備える。

## ディレクトリ構成

```
mana/
└── mana-library/   # メインアプリケーション（React + TypeScript + Firebase）
```

## 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | React 19, TypeScript 5, Vite 7 |
| スタイリング | Tailwind CSS 4, Framer Motion |
| バックエンド | Firebase (Auth, Firestore, Storage) |
| 書籍API | OpenBD, Google Books API |
| バーコード | react-zxing (ZXing) |

## セットアップ

```bash
cd mana-library
npm install
npm run dev
```

詳細は [mana-library/README.md](mana-library/README.md) を参照。
