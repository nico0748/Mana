import { circlesApi, circleItemsApi, ApiError } from './api';
import { queryClient } from './queryClient';
import { enqueueMutation } from './mutationQueue';
import { auth } from './firebase';
import type {
  Circle,
  CircleItem,
  CircleItemOnlineStatus,
} from '../types';

// ステータス変更を「楽観的に UI に反映 → online なら即送信 / offline ならキュー」する
// 共通ヘルパー群。既存のページ側コードは await applyXxxStatusChange(...) に置き換えるだけで
// オフライン対応されるようにしている。

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// React Query キャッシュ内の Circle ステータスを楽観的に書き換える。
// 通信成功/失敗にかかわらずユーザーには即座に変更が見える。
function patchCircleCache(id: string, patch: Partial<Circle>) {
  queryClient.setQueryData<Circle[] | undefined>(['circles'], old => {
    if (!old) return old;
    return old.map(c => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
  });
}

function patchItemCache(id: string, patch: Partial<CircleItem>) {
  queryClient.setQueryData<CircleItem[] | undefined>(['circleItems'], old => {
    if (!old) return old;
    return old.map(item => (item.id === id ? { ...item, ...patch } : item));
  });
}

// ApiError.status が無いエラー（fetch 自体の失敗 = ネットワーク異常）かどうか。
function isNetworkFailure(err: unknown): boolean {
  if (err instanceof ApiError) return false;
  return true;
}

// ── Circle.status ─────────────────────────────────────────────────────────────

export async function applyCircleStatusChange(
  id: string,
  status: Circle['status'],
): Promise<void> {
  patchCircleCache(id, { status });

  if (!isOnline()) {
    const uid = currentUid();
    if (uid) {
      await enqueueMutation(uid, { kind: 'circle.status', targetId: id, payload: { status } });
    }
    return;
  }

  try {
    await circlesApi.update(id, { status });
    queryClient.invalidateQueries({ queryKey: ['circles'] });
  } catch (err) {
    if (isNetworkFailure(err)) {
      const uid = currentUid();
      if (uid) {
        await enqueueMutation(uid, { kind: 'circle.status', targetId: id, payload: { status } });
      }
      return;
    }
    // API エラー（4xx/5xx）は楽観的更新を取り消すために refetch する。
    queryClient.invalidateQueries({ queryKey: ['circles'] });
    throw err;
  }
}

// ── CircleItem.status ────────────────────────────────────────────────────────

export async function applyItemStatusChange(
  itemId: string,
  status: CircleItem['status'],
): Promise<void> {
  patchItemCache(itemId, { status });

  if (!isOnline()) {
    const uid = currentUid();
    if (uid) {
      await enqueueMutation(uid, { kind: 'item.status', targetId: itemId, payload: { status } });
    }
    return;
  }

  try {
    await circleItemsApi.update(itemId, { status });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  } catch (err) {
    if (isNetworkFailure(err)) {
      const uid = currentUid();
      if (uid) {
        await enqueueMutation(uid, { kind: 'item.status', targetId: itemId, payload: { status } });
      }
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
    throw err;
  }
}

// ── CircleItem.onlineStatus ──────────────────────────────────────────────────

export async function applyItemOnlineStatusChange(
  itemId: string,
  onlineStatus: CircleItemOnlineStatus,
): Promise<void> {
  patchItemCache(itemId, { onlineStatus });

  if (!isOnline()) {
    const uid = currentUid();
    if (uid) {
      await enqueueMutation(uid, {
        kind: 'item.onlineStatus',
        targetId: itemId,
        payload: { onlineStatus },
      });
    }
    return;
  }

  try {
    await circleItemsApi.update(itemId, { onlineStatus });
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
  } catch (err) {
    if (isNetworkFailure(err)) {
      const uid = currentUid();
      if (uid) {
        await enqueueMutation(uid, {
          kind: 'item.onlineStatus',
          targetId: itemId,
          payload: { onlineStatus },
        });
      }
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['circleItems'] });
    throw err;
  }
}
