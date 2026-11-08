/** Facility dot colours: the console's status colours (good / warning / critical / neutral). */
export const MARKER_COLORS: Record<string, string> = {
  verified: '#0ca30c',
  pending_review: '#fab219',
  stale: '#d03b3b',
};

export const NEUTRAL = '#a1a1aa';

export const MARKER_LEGEND = [
  { label: 'Verified', color: MARKER_COLORS.verified },
  { label: 'In review', color: MARKER_COLORS.pending_review },
  { label: 'Stale', color: MARKER_COLORS.stale },
  { label: 'Draft / other', color: NEUTRAL },
];
