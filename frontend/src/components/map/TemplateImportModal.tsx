import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { X, FileJson, Download, Check, Loader, MapPin } from 'lucide-react';
import { eventTemplatesApi } from '../../lib/api';
import type { EventTemplate } from '../../types';

interface Props {
  onClose: () => void;
  onImport: (template: EventTemplate) => Promise<void>;
}

const TemplateImportModal: React.FC<Props> = ({ onClose, onImport }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eventTemplates', 'public'],
    queryFn: eventTemplatesApi.listPublic,
    staleTime: 60_000,
  });

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleImport = async (id: string) => {
    setLoadingId(id);
    setErrMsg(null);
    try {
      const detail = await eventTemplatesApi.getPublic(id);
      await onImport(detail);
      setDoneId(id);
      setTimeout(() => onClose(), 900);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileJson size={16} className="text-violet-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">テンプレートから読み込む</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {errMsg && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errMsg}
            </div>
          )}

          <p className="text-xs text-zinc-500 mb-3">
            ユーザーが申請し運営が承認したテンプレートです。
            読み込むと即売会・ホール一覧・マップ画像が自動作成されます。
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-6">
              <Loader size={14} className="animate-spin" />
              読み込み中…
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              テンプレート一覧の取得に失敗しました。
            </div>
          )}

          {data && data.length === 0 && (
            <div className="px-5 py-8 text-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
              まだ利用可能なテンプレートがありません。
            </div>
          )}

          {data && data.length > 0 && (
            <div className="space-y-2">
              {data.map(t => {
                const isLoading = loadingId === t.id;
                const isDone = doneId === t.id;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 truncate">{t.name}</p>
                      {t.date && (
                        <p className="text-xs text-zinc-500 mt-0.5">{t.date}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-zinc-600 mt-0.5">
                        <MapPin size={11} />
                        {t.hallCount} ホール
                      </div>
                    </div>
                    <button
                      onClick={() => handleImport(t.id)}
                      disabled={loadingId !== null}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {isLoading ? (
                        <Loader size={12} className="animate-spin" />
                      ) : isDone ? (
                        <Check size={12} />
                      ) : (
                        <Download size={12} />
                      )}
                      {isDone ? '完了' : '読み込む'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TemplateImportModal;
