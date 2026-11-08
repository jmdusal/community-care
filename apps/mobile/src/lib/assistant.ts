import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, apiGet } from './api';

export type Citation = { key: string; type: 'facility' | 'document'; id: string; title: string; url: string | null; verified_at: string | null; is_stale: boolean };

export type AssistantAnswer = { outcome: 'answered' | 'no_information' | 'emergency' | 'out_of_scope'; answer: string; citations: Citation[]; notice: string };

export function useAssistantStatus() {
  return useQuery({ queryKey: ['assistant-status'], queryFn: async () => (await apiGet<{ data: { enabled: boolean } }>('/assistant')).data, staleTime: 5 * 60_000 });
}

export function useAsk() {
  return useMutation({
    mutationFn: async (input: { message: string; lat?: number; lng?: number }) => (await apiFetch<{ data: AssistantAnswer }>('/assistant/messages', { method: 'POST', body: input })).data,
  });
}

/** Removes the "[F1]" / "[D2]" source markers for display; sources are listed separately. */
export function plainAnswer(text: string): string {
  return text.replace(/\s?\[[FD]\d{1,2}(?:\s*,\s*[FD]\d{1,2})*\]/g, '').trim();
}
