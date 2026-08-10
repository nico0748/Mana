import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';

interface DialogProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ label, onClose, children, className }: DialogProps) {
  const dialogRef = useDialogAccessibility<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onMouseDown={onClose} aria-hidden="true" />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className={cn('relative z-10 w-full bg-zinc-900 rounded-xl border border-zinc-800', className)}
      >
        {children}
      </motion.div>
    </div>
  );
}
