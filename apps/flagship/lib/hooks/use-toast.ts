/**
 * Simple toast utility using react-hot-toast
 * Based on pollifypro1 implementation
 */

import toast from 'react-hot-toast';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  return {
    toast: (options: ToastOptions & { variant?: 'default' | 'destructive' | 'success' }) => {
      const message = options.title || options.description || '';
      const duration = options.duration || 3000;

      if (options.variant === 'destructive') {
        return toast.error(message, { duration });
      } else if (options.variant === 'success') {
        return toast.success(message, { duration });
      } else {
        return toast(message, { duration });
      }
    },
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast(message),
  };
}

// Simple function export for non-hook usage
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (type === 'error') {
    toast.error(message);
  } else if (type === 'success') {
    toast.success(message);
  } else {
    toast(message);
  }
}