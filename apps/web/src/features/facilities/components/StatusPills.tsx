import { Pill, type Tone } from '../../../components/ui/Pill';
import type { AdminFacility, VerificationStatus } from '../api';

export const verificationLabel: Record<VerificationStatus, { label: string; tone: Tone }> = {
  verified: { label: 'Verified', tone: 'emerald' },
  pending_review: { label: 'In review', tone: 'amber' },
  stale: { label: 'Stale', tone: 'rose' },
  draft: { label: 'Draft', tone: 'zinc' },
  rejected: { label: 'Rejected', tone: 'zinc' },
};

/** Verification state plus a second pill when the record is not publicly visible. */
export function StatusPills({ facility }: { facility: Pick<AdminFacility, 'verification_status' | 'publication_status'> }) {
  const status = verificationLabel[facility.verification_status];

  return (
    <span className="inline-flex flex-wrap gap-1">
      <Pill tone={status.tone} dot>{status.label}</Pill>
      {facility.publication_status !== 'published' && <Pill tone="zinc">{facility.publication_status === 'withdrawn' ? 'Withdrawn' : 'Not public'}</Pill>}
    </span>
  );
}
