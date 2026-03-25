import React from 'react';

const ToolsPage: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
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
