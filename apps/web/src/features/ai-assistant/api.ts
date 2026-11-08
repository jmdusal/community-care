import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList, apiRaw, apiRequest } from '../../lib/api';
import type { AnswerOutcome } from '../../lib/assistant';

export type DocumentStatus = 'draft' | 'published' | 'archived';

export type KnowledgeDocument = {
  id: string;
  title: string;
  body: string;
  topic: string | null;
  source_name: string;
  source_url: string | null;
  status: DocumentStatus;
  verified_at: string | null;
  is_stale: boolean;
  published_at: string | null;
  updated_at: string;
  updated_by?: string | null;
};

export type DocumentInput = Pick<KnowledgeDocument, 'title' | 'body' | 'topic' | 'source_name' | 'source_url'> & { verified_at: string | null };

export type AssistantOverview = {
  enabled: boolean;
  provider: string;
  configured_provider: string;
  model: string | null;
  provider_note: string | null;
  days: number;
  questions: number;
  outcomes: Record<AnswerOutcome, number>;
  fallbacks: number;
  p95_latency_ms: number | null;
  documents: Record<DocumentStatus | 'stale', number>;
};

export type GuardrailResult = { question: string; expected: AnswerOutcome; actual: AnswerOutcome; passed: boolean };

export function useAssistantOverview() {
  return useQuery({ queryKey: ['assistant-overview'], queryFn: () => apiRequest<AssistantOverview>('/admin/assistant/overview') });
}

export function useKnowledgeDocuments(filters: { status?: DocumentStatus; q?: string; page: number }) {
  const query = new URLSearchParams({ page: String(filters.page), per_page: String(PAGE_SIZE) });
  if (filters.status) {
    query.set('status', filters.status);
  }
  if (filters.q) {
    query.set('q', filters.q);
  }

  return useQuery({ queryKey: ['knowledge-documents', filters], queryFn: () => apiList<KnowledgeDocument>(`/admin/knowledge-documents?${query}`), placeholderData: keepPreviousData });
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
    void queryClient.invalidateQueries({ queryKey: ['assistant-overview'] });
  };
}

export function useSaveDocument() {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    meta: { success: (_d, v) => ((v as { id?: string }).id ? 'Document saved' : 'Document added'), error: 'Could not save the document' },
    mutationFn: ({ id, input }: { id?: string; input: DocumentInput }) =>
      apiRequest<KnowledgeDocument>(id ? `/admin/knowledge-documents/${id}` : '/admin/knowledge-documents', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useChangeDocumentStatus() {
  const invalidate = useInvalidateDocuments();

  return useMutation({
    meta: { success: (_d, v) => ((v as { action: string }).action === 'publish' ? 'Document published' : 'Document archived'), error: 'Could not change the document' },
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'archive' }) => apiRequest<KnowledgeDocument>(`/admin/knowledge-documents/${id}/${action}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useGuardrails() {
  return useMutation({
    mutationFn: () => apiRaw<{ data: GuardrailResult[]; meta: { passed: number; total: number } }>('/admin/assistant/guardrails', { method: 'POST' }),
  });
}
