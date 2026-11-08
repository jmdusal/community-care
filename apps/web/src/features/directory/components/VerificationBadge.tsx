import { Pill } from '../../../components/ui/Pill';
import type { Verification } from '../api';
import { formatDay } from '../format';

/**
 * The platform's own review state with its date. The notice text is always
 * available, because this badge must never read as a license or accreditation.
 */
export function VerificationBadge({ verification, showNotice = false }: { verification: Verification; showNotice?: boolean }) {
  const date = verification.verified_at ? formatDay(verification.verified_at) : null;

  const badge =
    verification.status === 'verified' ? (
      <Pill tone="emerald" dot>Verified{date ? ` ${date}` : ''}</Pill>
    ) : verification.status === 'stale' ? (
      <Pill tone="amber" dot>Needs re-verification{date ? ` (last ${date})` : ''}</Pill>
    ) : (
      <Pill tone="zinc" dot>Not yet verified</Pill>
    );

  return (
    <span className="inline-flex flex-col items-start gap-1" title={verification.notice}>
      {badge}
      {showNotice && <span className="text-[11px] text-zinc-500">{verification.notice}</span>}
    </span>
  );
}
