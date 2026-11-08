import { useSyncExternalStore } from 'react';

export type Toast = { id: number; tone: 'success' | 'error'; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function push(tone: Toast['tone'], message: string): void {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, tone, message }];
  emit();
  window.setTimeout(() => dismissToast(id), tone === 'error' ? 7000 : 4000);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/** Short messages in the corner after an action: "Service added", "Could not save: …". */
export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
};

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => toasts,
    () => toasts,
  );
}
