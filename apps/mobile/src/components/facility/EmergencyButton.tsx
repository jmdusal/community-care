import { Linking, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { colors } from '@/lib/theme';

/**
 * A small "911" button in the screen header (instead of a banner on every screen).
 * The app is never an emergency triage tool: tapping dials 911.
 */
export function EmergencyButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergency: call 911"
      hitSlop={8}
      onPress={() => void Linking.openURL('tel:911')}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <AppText style={styles.text}>911</AppText>
    </Pressable>
  );
}

/** The same, as a full line for the bottom of a facility screen. */
export function EmergencyNote() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Emergency: call 911" onPress={() => void Linking.openURL('tel:911')} style={styles.note}>
      <AppText style={styles.noteText}>
        <AppText style={[styles.noteText, styles.bold]}>Emergency? Call 911</AppText> or go to the nearest emergency room. This listing may not show whether the facility can take emergency patients right now.
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { marginHorizontal: 12, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#fecdd3' },
  pressed: { opacity: 0.7 },
  text: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  note: { backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 14 },
  noteText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  bold: { fontWeight: '700' },
});
