import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sharedApi } from '../lib/api';

export default function SharedEventPage() {
  const { code } = useParams<{ code: string }>();

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['shared-event', code],
    queryFn: () => sharedApi.getEvent(code!),
    enabled: !!code,
  });

  const { data: circles = [] } = useQuery({
    queryKey: ['shared-circles', code],
    queryFn: () => sharedApi.getCircles(code!),
    enabled: !!code,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['shared-items', code],
    queryFn: () => sharedApi.getCircleItems(code!),
    enabled: !!code,
  });

  if (eventLoading) {
    return <div className="flex items-center justify-center h-screen text-zinc-400">読み込み中...</div>;
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <p className="text-red-400">共有リンクが無効です</p>
      </div>
    );
  }

  // サークルごとにアイテムをグループ化
  const itemsByCircle = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.circleId] ??= []).push(item);
    return acc;
  }, {});

  const pendingTotal = circles
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => {
      const circleItems = itemsByCircle[c.id] ?? [];
      return sum + circleItems.reduce((s, i) => s + i.price * i.quantity, 0);
    }, 0);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">{event.name}</h1>
        {event.date && <p className="text-sm text-zinc-400 mt-1">{event.date}</p>}
        {event.budget != null && (
          <p className="text-sm text-zinc-400">
            予算: ¥{event.budget.toLocaleString()} / 未購入: ¥{pendingTotal.toLocaleString()}
          </p>
        )}
        <p className="text-xs text-emerald-400 mt-1">共有リスト（閲覧専用）</p>
      </div>

      {/* サークル一覧 */}
      {circles.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">サークルがまだありません</p>
      ) : (
        <div className="space-y-3">
          {circles.map(circle => {
            const circleItems = itemsByCircle[circle.id] ?? [];
            const subtotal = circleItems.reduce((s, i) => s + i.price * i.quantity, 0);

            return (
              <div key={circle.id} className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                {/* サークル情報 */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-zinc-400 font-mono">
                      {circle.hall}-{circle.block}{circle.number}
                    </span>
                    <h3 className="text-zinc-100 font-medium">{circle.name}</h3>
                    <p className="text-sm text-zinc-400">{circle.author}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    circle.status === 'bought' ? 'bg-emerald-900 text-emerald-300' :
                    circle.status === 'soldout' ? 'bg-red-900 text-red-300' :
                    circle.status === 'skipped' ? 'bg-zinc-700 text-zinc-400' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {circle.status === 'pending' ? '未購入' :
                     circle.status === 'bought' ? '購入済' :
                     circle.status === 'soldout' ? '完売' : 'スキップ'}
                  </span>
                </div>

                {/* アイテム一覧 */}
                {circleItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {circleItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-zinc-300">
                          <span className={`text-xs mr-1 ${item.type === 'shinkan' ? 'text-blue-400' : 'text-zinc-500'}`}>
                            {item.type === 'shinkan' ? '新刊' : '既刊'}
                          </span>
                          {item.title}
                        </span>
                        <span className="text-zinc-400">
                          ¥{item.price.toLocaleString()} ×{item.quantity}
                        </span>
                      </div>
                    ))}
                    <div className="text-right text-sm text-zinc-300 pt-1 border-t border-zinc-800">
                      小計: ¥{subtotal.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
