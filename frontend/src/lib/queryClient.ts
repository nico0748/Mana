import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

// オフライン時のキャッシュ閲覧を可能にするための React Query 設定。
//
// 設計メモ:
// - gcTime はデフォルト 5 分だが、persist 対象のクエリが「アンマウント直後にメモリから
//   消える → IDB へ書き戻されない」となるのを避けるため 24h まで延ばす。
//   IDB 側にも maxAge があるので長くしてもストレージは肥大しない。
// - staleTime は通常時の挙動は維持したいので 30 秒のまま（オンライン時は積極的に再フェッチ）。
//   キャッシュは「初回起動の即表示」と「オフライン時のフォールバック」用途。
// - retry: 1 は維持。オフラインでは即座にエラーになる方が UI 反応が早い。
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24, // 24h
      retry: 1,
      // ネットワーク状態に関わらず、キャッシュがあれば表示しつつ裏で取りに行く。
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Mutation は Phase 3 でオフラインキュー化する。現状は online のみで実行。
      networkMode: 'online',
    },
  },
});

// idb-keyval をベースにした React Query の Persister 実装。
// localStorage では容量上限（5MB 程度）に当たる可能性があるため IDB を採用。
const IDB_KEY = 'doujin-pp-react-query-cache-v1';

export const queryPersister: Persister = createAsyncStoragePersister({
  storage: {
    getItem: async (_key: string) => {
      const value = await get<string>(IDB_KEY);
      return value ?? null;
    },
    setItem: async (_key: string, value: string) => {
      await set(IDB_KEY, value);
    },
    removeItem: async (_key: string) => {
      await del(IDB_KEY);
    },
  },
  // 24h より古いキャッシュは破棄
  throttleTime: 1000,
});

// 永続化の対象を絞り込む dehydrate 設定。
// - エラー状態のクエリは保存しない（次回起動時に古いエラーを引きずらない）
// - data が undefined のクエリは保存しない
export const persistOptions = {
  persister: queryPersister,
  maxAge: 1000 * 60 * 60 * 24, // 24h
  // ビルドごとにキャッシュをバストできるよう、Vite の MODE と build timestamp を含める。
  // (本番では package.json の version でも良いが、build 識別子の方が確実)
  buster: import.meta.env.MODE + ':' + (import.meta.env.VITE_BUILD_ID ?? 'dev'),
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string; data: unknown } }) => {
      return query.state.status === 'success' && query.state.data !== undefined;
    },
  },
} as const;

// 永続化キャッシュを手動で全消去するためのヘルパ（アカウント削除/ログアウト時用）。
export async function clearQueryPersistedCache(): Promise<void> {
  await del(IDB_KEY);
  queryClient.clear();
}

// PersistedClient 型を再 export（呼び出し側の便宜）
export type { PersistedClient };
