import type { DoujinEvent } from '../types';
import type { MapEventSortKey, MapHallSortKey, SortDir } from '../contexts/AppSettingsContext';

/** 東1 < 東2 < 東10 のように、名前の中の数字を数値として比較する */
const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });

/**
 * ローカルタイムでの今日を "YYYY-MM-DD" で返す。
 * DoujinEvent.date と同じ書式なので、そのまま文字列比較で前後を判定できる。
 * （toISOString() は UTC 変換が入り、日本時間の早朝に日付がずれるため使わない）
 */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 開催日を過ぎているか。当日はまだ「未実施」として扱う。
 * 日付未設定は予定日が決まっていないだけとみなし、開催済みには倒さない。
 */
export function isPastEvent(event: Pick<DoujinEvent, 'date'>, today: string): boolean {
  return !!event.date && event.date < today;
}

/** 1件でも order が入っていれば手動並べ替え済みとみなす */
export function isManuallyOrdered(events: Pick<DoujinEvent, 'order'>[]): boolean {
  return events.some(e => e.order != null);
}

/**
 * 即売会タブの並び順。
 * 手動並べ替えが有効ならそれを最優先し、そうでなければ
 * 「開催済みは常に未実施の後ろ」を満たしたうえで指定の基準・方向で並べる。
 */
export function sortEvents(
  events: DoujinEvent[],
  key: MapEventSortKey,
  dir: SortDir,
  today: string,
): DoujinEvent[] {
  const list = [...events];

  if (isManuallyOrdered(list)) {
    return list.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo || a.createdAt - b.createdAt;
    });
  }

  const sign = dir === 'asc' ? 1 : -1;

  return list.sort((a, b) => {
    // 開催済みグループは方向に関わらず常に後ろ
    const pastDiff = Number(isPastEvent(a, today)) - Number(isPastEvent(b, today));
    if (pastDiff !== 0) return pastDiff;

    switch (key) {
      case 'date': {
        // 日付未設定は同グループ内で末尾（こちらも方向に関わらず後ろ）
        if (!a.date && !b.date) return (a.createdAt - b.createdAt) * sign;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return (a.date.localeCompare(b.date) || a.createdAt - b.createdAt) * sign;
      }
      case 'name':
        return (collator.compare(a.name, b.name) || a.createdAt - b.createdAt) * sign;
      case 'created':
        return (a.createdAt - b.createdAt) * sign;
    }
  });
}

/**
 * ホールタブの並び順。
 * manualOrder があればその順を最優先し、そこに無いホール（新規登録分）は
 * 元の登録順のまま末尾に付ける。
 */
export function sortHalls(
  halls: string[],
  key: MapHallSortKey,
  dir: SortDir,
  manualOrder?: string[],
): string[] {
  if (manualOrder?.length) {
    const rank = new Map(manualOrder.map((hall, i) => [hall, i]));
    return [...halls].sort((a, b) => {
      const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || halls.indexOf(a) - halls.indexOf(b);
    });
  }

  const sign = dir === 'asc' ? 1 : -1;
  if (key === 'created') {
    return dir === 'asc' ? [...halls] : [...halls].reverse();
  }
  return [...halls].sort((a, b) => collator.compare(a, b) * sign);
}

/** 指定要素を delta だけ動かした新しい配列を返す。動かせない場合は null */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] | null {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
