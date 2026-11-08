import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { Verification } from '@/lib/directory';
import { formatDay } from '@/lib/format';
import { colors, space } from '@/lib/theme';

const tones = {
  good: { background: colors.successSoft, text: colors.success },
  warn: { background: colors.warningSoft, text: colors.warning },
  neutral: { background: '#f4f4f5', text: colors.textMuted },
};

/** The platform's own review state; the notice keeps it from reading as a license. */
export function VerificationBadge({ verification, showNotice }: { verification: Verification; showNotice?: boolean }) {
  const tone = verification.status === 'verified' ? tones.good : verification.status === 'stale' ? tones.warn : tones.neutral;
  const label =
    verification.status === 'verified'
      ? `Verified ${formatDay(verification.verified_at)}`
      : verification.status === 'stale'
        ? `Needs re-verification (last ${formatDay(verification.verified_at)})`
        : 'Not yet verified';

  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: tone.background }]}>
        <AppText style={[styles.pillText, { color: tone.text }]}>{label}</AppText>
      </View>
      {showNotice && <AppText variant="small">{verification.notice}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, alignItems: 'flex-start' },
  pill: { borderRadius: 6, paddingHorizontal: space.sm, paddingVertical: 2 },
  pillText: { fontSize: 12, fontWeight: '600' },
});
