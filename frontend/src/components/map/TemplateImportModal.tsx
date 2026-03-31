import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileJson, Download, Check, Loader, Upload } from 'lucide-react';
import { OFFICIAL_TEMPLATES, parseTemplateFile } from '../../data/templates';
import type { EventTemplate } from '../../types/template';

interface Props {
  onClose: () => void;
  onImport: (template: EventTemplate) => Promise<void>;
}

type Tab = 'official' | 'file';

const TemplateImportModal: React.FC<Props> = ({ onClose, onImport }) => {
  const [tab, setTab] = useState<Tab>('official');
  const [loading, setLoading] = useState<string | null>(null); // templateId or 'file'
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (template: EventTemplate, key: string) => {
    setLoading(key);
    setError(null);
    try {
      await onImport(template);
      setDone(key);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    setLoading('file');
    try {
      const text = await file.text();
      const template = parseTemplateFile(text);
      await handleImport(template, 'file');
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      setLoading(null);
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

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(['official', 'file'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'official' ? '公式テンプレート' : 'JSONファイルから読み込む'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {tab === 'official' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 mb-3">
                読み込むと即売会とホール一覧が自動作成されます。マップ画像は後からアップロードしてください。
              </p>
              {OFFICIAL_TEMPLATES.map(t => {
                const isLoading = loading === t.templateId;
                const isDone = done === t.templateId;
                return (
                  <div
                    key={t.templateId}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>
                      )}
                      <p className="text-xs text-zinc-600 mt-0.5">{t.halls.length} ホール</p>
                    </div>
                    <button
                      onClick={() => handleImport(t, t.templateId)}
                      disabled={!!loading}
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

          {tab === 'file' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                同人++ の公式サイト（/about）からダウンロードしたテンプレートJSONファイルを選択してください。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading === 'file'}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {loading === 'file' ? (
                  <Loader size={24} className="animate-spin" />
                ) : done === 'file' ? (
                  <Check size={24} className="text-emerald-400" />
                ) : (
                  <Upload size={24} />
                )}
                <span className="text-sm font-medium">
                  {loading === 'file' ? '読み込み中...' : done === 'file' ? '読み込み完了' : 'JSONファイルを選択'}
                </span>
                <span className="text-xs text-zinc-600">.json</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TemplateImportModal;
