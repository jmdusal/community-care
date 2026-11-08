import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from '../components/ui/Toaster';
import { ApiError } from '../lib/api';
import { toast } from '../lib/toast';

/**
 * Actions that change data say what happened. A mutation opts in with
 * `meta: { success: 'Service added' }` (or a function of the result); it then also gets an
 * error toast when it fails, in addition to any message the form shows.
 */
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      success?: string | ((data: unknown, variables: unknown) => string | null);
      /** Shown before the server's reason, e.g. "Could not save the service". */
      error?: string;
    };
  }
}

function errorMessage(error: unknown, prefix: string): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      const first = Object.values(error.body.fields ?? {})[0]?.[0];

      return `${prefix}: ${first ?? 'please check the highlighted fields.'}`;
    }

    return `${prefix}: ${error.body.message}`;
  }

  return `${prefix}. Check your connection and try again.`;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: (data, variables, _context, mutation) => {
            const success = mutation.meta?.success;
            const message = typeof success === 'function' ? success(data, variables) : success;
            if (message) {
              toast.success(message);
            }
          },
          onError: (error, _variables, _context, mutation) => {
            if (mutation.meta?.success || mutation.meta?.error) {
              toast.error(errorMessage(error, mutation.meta.error ?? 'That did not work'));
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Do not retry errors the server answered on purpose (401, 403, 404, 422).
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
