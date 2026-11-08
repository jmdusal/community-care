import type { Tone } from '../../components/ui/Pill';
import type { BatchStatus, ImportStep } from './api';

export const statusPill: Record<BatchStatus, { label: string; tone: Tone }> = {
  queued: { label: 'Queued', tone: 'zinc' },
  running: { label: 'Running', tone: 'sky' },
  needs_review: { label: 'Needs review', tone: 'amber' },
  ready_to_publish: { label: 'Ready to publish', tone: 'violet' },
  published: { label: 'Published', tone: 'emerald' },
  failed: { label: 'Failed', tone: 'rose' },
};

export const pipeline: Array<{ step: ImportStep; label: string }> = [
  { step: 'acquire', label: 'Acquire' },
  { step: 'stage', label: 'Stage' },
  { step: 'normalize', label: 'Normalize' },
  { step: 'match', label: 'Match' },
  { step: 'flag', label: 'Flag' },
  { step: 'review', label: 'Review' },
  { step: 'publish', label: 'Publish' },
];

export const matchPill: Record<string, Tone> = { new: 'sky', updated: 'violet', unchanged: 'zinc', invalid: 'rose' };

export { formatDate } from '../../lib/format';
