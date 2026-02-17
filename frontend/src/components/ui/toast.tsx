'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  onClose?: () => void;
}

const variantStyles = {
  default: 'bg-card border-border',
  success: 'bg-green-500/10 border-green-500/50 text-green-900 dark:text-green-100',
  error: 'bg-red-500/10 border-red-500/50 text-red-900 dark:text-red-100',
  warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-900 dark:text-yellow-100',
};

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md rounded-lg border p-4 shadow-lg transition-all',
        variantStyles[variant]
      )}
    >
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90 mt-1">{description}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 inline-flex h-6 w-6 items-center justify-center rounded-md hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
      {children}
    </div>
  );
}
