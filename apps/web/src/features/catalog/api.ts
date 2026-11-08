import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRaw, apiRequest } from '../../lib/api';

export type CatalogKind = 'services' | 'facility-types';

export type CatalogEntry = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  /** Facilities (any status) that list it. */
  facilities: number;
  archived: boolean;
  archived_at: string | null;
  updated_at: string | null;
};

type CatalogResponse = { data: CatalogEntry[]; meta: { counts: { active: number; archived: number }; categories: string[] } };

export function useCatalog(kind: CatalogKind, status: 'active' | 'archived', q: string) {
  const params = new URLSearchParams({ status });
  if (q.trim()) {
    params.set('q', q.trim());
  }

  return useQuery({ queryKey: ['catalog', kind, status, q.trim()], queryFn: () => apiRaw<CatalogResponse>(`/admin/catalog/${kind}?${params}`) });
}

/** After any change: the admin lists, and the pickers / public filters that read the catalog. */
function useInvalidate(kind: CatalogKind) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['catalog', kind] });
    void queryClient.invalidateQueries({ queryKey: [kind === 'services' ? 'services' : 'facility-types'] });
  };
}

export type CatalogInput = { name: string; category?: string; description?: string | null };

export function useSaveCatalogEntry(kind: CatalogKind) {
  const invalidate = useInvalidate(kind);

  return useMutation({
    meta: { success: (_d, v) => ((v as { slug?: string }).slug ? 'Changes saved' : 'Added to the list'), error: 'Could not save' },
    mutationFn: ({ slug, input }: { slug?: string; input: CatalogInput }) =>
      apiRequest<CatalogEntry>(slug ? `/admin/catalog/${kind}/${slug}` : `/admin/catalog/${kind}`, { method: slug ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useCatalogAction(kind: CatalogKind) {
  const invalidate = useInvalidate(kind);

  return useMutation({
    meta: { success: (_d, v) => ({ archive: 'Archived', restore: 'Restored', delete: 'Deleted' } as Record<string, string>)[(v as { action: string }).action], error: 'That did not work' },
    mutationFn: ({ slug, action }: { slug: string; action: 'archive' | 'restore' | 'delete' }) =>
      action === 'delete'
        ? apiRaw<null>(`/admin/catalog/${kind}/${slug}`, { method: 'DELETE' })
        : apiRequest<CatalogEntry>(`/admin/catalog/${kind}/${slug}/${action}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

/** "maternal_care" → "Maternal care". */
export function categoryLabel(category: string | null): string {
  if (!category) {
    return 'Other';
  }
  const words = category.replace(/[_-]+/g, ' ').trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}
