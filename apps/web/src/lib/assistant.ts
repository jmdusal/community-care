import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from './api';

/** Shared assistant types and hooks: used by the public assistant and the admin test console. */
export type AnswerOutcome = 'answered' | 'no_information' | 'emergency' | 'out_of_scope';

export type Citation = {
  key: string;
  type: 'facility' | 'document';
  id: string;
  title: string;
  url: string | null;
  verified_at: string | null;
  is_stale: boolean;
};

export type AssistantAnswer = {
  outcome: AnswerOutcome;
  answer: string;
  citations: Citation[];
  notice: string;
  provider?: string;
  used_fallback?: boolean;
};

export type AskInput = { message: string; region_code?: string; lat?: number; lng?: number };

export function useAssistantStatus() {
  return useQuery({ queryKey: ['assistant-status'], queryFn: () => apiRequest<{ enabled: boolean }>('/assistant'), staleTime: 5 * 60_000 });
}

/** Public: POST /assistant/messages. Admin preview: POST /admin/assistant/preview. */
export function useAsk(path: '/assistant/messages' | '/admin/assistant/preview') {
  return useMutation({
    mutationFn: (input: AskInput) => apiRequest<AssistantAnswer>(path, { method: 'POST', body: JSON.stringify(input) }),
  });
}

export const OUTCOME_LABELS: Record<AnswerOutcome, string> = {
  answered: 'Answered from records',
  no_information: 'No approved information',
  emergency: 'Emergency',
  out_of_scope: 'Not medical advice',
};

export type AnswerPart = { kind: 'text'; text: string } | { kind: 'cite'; key: string };

/**
 * Splits answer text into plain text and citation markers. "[F1, D2]" becomes two
 * markers; markers with no matching source are dropped (the server never returns them).
 */
export function splitCitations(text: string, keys: ReadonlySet<string>): AnswerPart[] {
  return text.split(/(\[[FD]\d{1,2}(?:\s*,\s*[FD]\d{1,2})*\])/).flatMap((part): AnswerPart[] => {
    const marker = part.match(/^\[(.+)\]$/);
    if (!marker) {
      return part ? [{ kind: 'text', text: part }] : [];
    }

    return marker[1].split(/\s*,\s*/).filter((key) => keys.has(key)).map((key) => ({ kind: 'cite', key }));
  });
}
