import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ResourceKey } from '../lib/api';
import { UpgradeModal } from '../components/billing/UpgradeModal';

interface OpenArgs {
  resource?: ResourceKey;
  limit?: number | null;
  current?: number;
}

interface ContextValue {
  open: (args?: OpenArgs) => void;
  close: () => void;
}

const Ctx = createContext<ContextValue>({
  open: () => {},
  close: () => {},
});

export const UpgradeModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [args, setArgs] = useState<OpenArgs | null>(null);

  const open = useCallback((a?: OpenArgs) => setArgs(a ?? {}), []);
  const close = useCallback(() => setArgs(null), []);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      <UpgradeModal
        open={!!args}
        onClose={close}
        resource={args?.resource}
        limit={args?.limit ?? null}
        current={args?.current}
      />
    </Ctx.Provider>
  );
};

export const useUpgradeModal = () => useContext(Ctx);

export function isPlanLimitError(err: unknown): err is { status: 402; payload: { resource?: ResourceKey; limit?: number; current?: number } } {
  return !!err && typeof err === 'object' && (err as any).status === 402;
}
