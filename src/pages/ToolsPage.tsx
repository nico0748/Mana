import React, { useRef } from 'react';
import { Share2, Download, Upload } from 'lucide-react';
import { useSync, isShareSupported } from '../hooks/useSync';
import { Button } from '../components/ui/Button';

const ToolsPage: React.FC = () => {
  const { exportBooks, importBooks } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBooks(file);
      alert('データをインポートしました。');
    } catch (err) {
      console.error(err);
      alert('インポートに失敗しました。');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Data sync section */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">データ同期</h2>
          <p className="text-xs text-zinc-500 mt-0.5">本棚データをエクスポート・インポートできます</p>
        </div>
        <div className="p-4 space-y-3">
          <Button
            onClick={exportBooks}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            {isShareSupported ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isShareSupported ? 'データをシェア' : 'データをダウンロード'}
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12"
          >
            <Upload className="w-4 h-4" />
            データをインポート
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />

          <p className="text-xs text-zinc-600 text-center">
            インポートは既存データに上書きマージされます
          </p>
        </div>
      </section>

      {/* App info */}
      <section className="text-center text-zinc-600 text-xs space-y-1 pt-4">
        <p className="font-semibold text-zinc-500">Mana Library</p>
        <p>蔵書管理アプリ</p>
        <p className="text-zinc-700">データはすべてこのデバイスに保存されます</p>
      </section>
    </div>
  );
};

export default ToolsPage;
