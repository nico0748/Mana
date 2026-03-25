# オフライン対応アーキテクチャ設計提案

## 背景・課題

現状のアーキテクチャ:

```
フロントエンド (React) → バックエンド (Express) → PostgreSQL
```

**問題**: 即売会会場はモバイル回線が混雑・不安定なため、APIリクエストが失敗しやすい。
「買った！」「完売」の記録がオフラインでは行えず、アプリが真っ白になるリスクがある。

---

## 推奨アーキテクチャ: PWA + IndexedDB ローカルキャッシュ

```
┌─────────────────────────────────────┐
│  ブラウザ                            │
│  ┌──────────────┐  ┌─────────────┐  │
│  │  React App   │  │Service Worker│  │
│  │              │←→│(キャッシュ層) │  │
│  └──────┬───────┘  └──────┬──────┘  │
│         │                 │         │
│  ┌──────▼───────────────────────┐   │
│  │       IndexedDB (Dexie.js)   │   │
│  │  circles / circleItems / etc │   │
│  └──────────────────────────────┘   │
└────────────────┬────────────────────┘
                 │ オンライン時のみ同期
           ┌─────▼─────┐
           │  Express  │
           │     +     │
           │ PostgreSQL│
           └───────────┘
```

---

## 実装方針: 2フェーズ

### Phase 1 — 読み取りオフライン（工数: 半日）

**目的**: 会場でアプリを開いたとき、API障害でも買い物リスト・MAPが参照できる

**実装方法**: Service Worker でAPIレスポンスをキャッシュ（Network First → Cache Fallback）

```ts
// vite.config.ts に追加
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  runtimeCaching: [
    {
      urlPattern: /\/api\/(circles|circle-items|venue-maps|events)/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
    },
  ],
})
```

- 追加パッケージ: `vite-plugin-pwa`（Workbox内包）
- **既存アプリコードの変更なし**
- 効果: オフライン時に直近のデータが表示される（読み取り専用）

---

### Phase 2 — 書き込みオフライン（工数: 2〜3日）

**目的**: オフライン中に「買った！」「完売」を記録し、オンライン復帰時に自動同期する

**データフロー**:

```
オフライン中:
  circlesApi.update() → IndexedDB の pendingQueue に追記
                      + React Query キャッシュをオプティミスティック更新
                        (UIは即座に反映)

オンライン復帰時 (navigator.onLine / Service Worker Background Sync):
  pendingQueue を順次 API へ送信
  → 成功したキューエントリを削除
  → React Query を invalidate して再フェッチ
```

**新規ファイル: `frontend/src/lib/offlineQueue.ts`**

```ts
import Dexie from 'dexie';

interface PendingMutation {
  id?: number;
  endpoint: string;
  method: 'PUT' | 'POST' | 'DELETE';
  payload: unknown;
  enqueuedAt: number;
}

class OfflineDB extends Dexie {
  pending!: Dexie.Table<PendingMutation, number>;
  constructor() {
    super('doujin-pp-offline');
    this.version(1).stores({ pending: '++id, enqueuedAt' });
  }
}

export const offlineDb = new OfflineDB();

export async function enqueueOrSend(
  endpoint: string,
  method: 'PUT' | 'POST' | 'DELETE',
  payload: unknown
) {
  if (navigator.onLine) {
    return fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  await offlineDb.pending.add({ endpoint, method, payload, enqueuedAt: Date.now() });
}

export async function flushQueue() {
  const items = await offlineDb.pending.orderBy('enqueuedAt').toArray();
  for (const item of items) {
    try {
      await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      await offlineDb.pending.delete(item.id!);
    } catch {
      break; // ネットワーク障害継続中は中断
    }
  }
}
```

- 追加パッケージ: `dexie`
- 変更箇所: `lib/api.ts` のミューテーション系関数を `enqueueOrSend` でラップ

---

## 技術選定の根拠

| 選択肢 | 工数 | 適合度 | 理由 |
|---|---|---|---|
| **vite-plugin-pwa (Workbox)** | 小 | ◎ | Vite公式、設定ベースで自動化 |
| Service Worker 手書き | 大 | ○ | 柔軟だが保守コスト高 |
| TanStack Query の `persister` | 小 | ○ | キャッシュのみ、書き込みキュー別途必要 |
| CRDTライブラリ (Y.js 等) | 超大 | △ | 複数端末競合解決には強いが過剰 |

---

## 競合解決方針

即売会当日に複数端末から同じサークルを更新する可能性がある（PC管理 → スマホ当日操作）。

**採用方針: Last-Write-Wins（`updatedAt` タイムスタンプ比較）**

```
同期時:
  ローカルの updatedAt > サーバーの updatedAt → サーバーを上書き
  ローカルの updatedAt < サーバーの updatedAt → ローカルを破棄（サーバー優先）
```

CRDT は不要。`bought` / `soldout` は「一度更新したら戻さない」運用なので競合はほぼ発生しない。

---

## 推奨実施順序

```
Phase 1: 読み取りキャッシュ（認証実装前に実施推奨）
  ↓ 動作確認後
Phase 2: 書き込みキュー（認証実装後に実施）
  ↓ 将来的に
Phase 3: デバイス間リアルタイム同期（WebSocket or SSE）
```

Phase 1 だけでも「会場でページが真っ白になる」問題を防げるため、**認証実装前に導入しておくことを推奨**する。
