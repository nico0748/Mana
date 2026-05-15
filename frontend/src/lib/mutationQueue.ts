import { get, set } from 'idb-keyval';
import { circlesApi, circleItemsApi, ApiError } from './api';
import type { Circle, CircleItem, CircleItemOnlineStatus } from '../types';

// オフライン時に発生したステータス変更を IndexedDB に溜めておき、
// オンライン復帰時にまとめてサーバへ送信するためのキュー。
//
// スコープ:
//   - circle.status: Circle['status'] の変更（pending/bought/soldout）
//   - item.status: CircleItem['status'] の変更
//   - item.onlineStatus: CircleItem['onlineStatus'] の変更
// それ以外（追加・削除・名前変更など）は Phase 3 のスコープ外。
//
// 競合解消:
//   サーバ側は単純な PUT で上書きする実装のため、Last-Write-Wins。
//   キューが flush されるまでの間に他端末からの変更があっても、最後にキューが
//   サーバへ届いた値が勝つ。同一ユーザー 1 端末を前提とした受容可能な妥協。

const QUEUE_KEY = 'doujin-pp-mutation-queue-v1';
const MAX_RETRIES = 5;

export type CircleStatus = Circle['status'];
export type ItemStatus = CircleItem['status'];

interface CircleStatusMutation {
  kind: 'circle.status';
  targetId: string;
  payload: { status: CircleStatus };
}
interface ItemStatusMutation {
  kind: 'item.status';
  targetId: string;
  payload: { status: ItemStatus };
}
interface ItemOnlineStatusMutation {
  kind: 'item.onlineStatus';
  targetId: string;
  payload: { onlineStatus: CircleItemOnlineStatus };
}

export type QueuedMutationBody =
  | CircleStatusMutation
  | ItemStatusMutation
  | ItemOnlineStatusMutation;

export interface QueuedMutation {
  id: string;
  uid: string;
  createdAt: number;
  retries: number;
  body: QueuedMutationBody;
}

// ── 永続化 I/O ────────────────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedMutation[]> {
  return (await get<QueuedMutation[]>(QUEUE_KEY)) ?? [];
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  if (queue.length === 0) {
    await set(QUEUE_KEY, []);
    return;
  }
  await set(QUEUE_KEY, queue);
}

// ── パブリック API ────────────────────────────────────────────────────────────

export async function enqueueMutation(
  uid: string,
  body: QueuedMutationBody,
): Promise<QueuedMutation> {
  const queued: QueuedMutation = {
    id: crypto.randomUUID(),
    uid,
    createdAt: Date.now(),
    retries: 0,
    body,
  };
  const queue = await readQueue();
  // 同一 target に対する直近のキュー要素がある場合は payload を上書き（重複排除）。
  // 例: 同じ Circle で pending → bought → soldout と素早く切り替えたら最後の値だけ残す。
  const lastIndex = queue
    .map((m, i) => ({ m, i }))
    .reverse()
    .find(({ m }) =>
      m.uid === uid &&
      m.body.kind === body.kind &&
      m.body.targetId === body.targetId,
    )?.i;
  if (lastIndex !== undefined) {
    queue[lastIndex] = {
      ...queue[lastIndex],
      createdAt: queued.createdAt,
      body: queued.body,
    };
    await writeQueue(queue);
    return queue[lastIndex];
  }
  queue.push(queued);
  await writeQueue(queue);
  return queued;
}

export async function getQueueCount(uid: string): Promise<number> {
  const queue = await readQueue();
  return queue.filter(m => m.uid === uid).length;
}

export async function getQueue(uid: string): Promise<QueuedMutation[]> {
  const queue = await readQueue();
  return queue.filter(m => m.uid === uid);
}

export async function clearQueueForUid(uid: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter(m => m.uid !== uid));
}

export async function clearAllQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}

// ── 個別エントリの実行 ────────────────────────────────────────────────────────

async function executeMutation(m: QueuedMutation): Promise<void> {
  switch (m.body.kind) {
    case 'circle.status':
      await circlesApi.update(m.body.targetId, m.body.payload);
      return;
    case 'item.status':
    case 'item.onlineStatus':
      await circleItemsApi.update(m.body.targetId, m.body.payload);
      return;
  }
}

// ── 一括 flush ────────────────────────────────────────────────────────────────

export interface FlushResult {
  success: number;
  failed: number;
  dropped: number;
}

// キューを順次実行する。エラーは種類に応じて扱う:
//   - 4xx (ApiError.status 400-499): 対象が消えた等の永続的な失敗 → drop
//   - 5xx / ネットワークエラー: retries++。MAX_RETRIES に達したら drop。
export async function flushQueue(uid: string): Promise<FlushResult> {
  const all = await readQueue();
  const mine = all.filter(m => m.uid === uid).sort((a, b) => a.createdAt - b.createdAt);
  if (mine.length === 0) {
    return { success: 0, failed: 0, dropped: 0 };
  }

  const others = all.filter(m => m.uid !== uid);
  const stillPending: QueuedMutation[] = [];

  let success = 0;
  let failed = 0;
  let dropped = 0;

  for (const m of mine) {
    try {
      await executeMutation(m);
      success++;
    } catch (err) {
      const apiErr = err as ApiError | Error;
      const status = (apiErr as ApiError).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        // 4xx は対象が削除済みなど永続的エラー。再送しても直らない。
        dropped++;
      } else {
        // 5xx / ネットワーク異常はリトライ余地あり。
        const next: QueuedMutation = { ...m, retries: m.retries + 1 };
        if (next.retries >= MAX_RETRIES) {
          dropped++;
        } else {
          stillPending.push(next);
          failed++;
        }
      }
    }
  }

  await writeQueue([...others, ...stillPending]);
  return { success, failed, dropped };
}
