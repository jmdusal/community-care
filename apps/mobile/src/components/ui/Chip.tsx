import { Pressable, StyleSheet } from 'react-native';
import { colors, space } from '@/lib/theme';
import { AppText } from './AppText';

/** A pill-shaped toggle used for filters and day pickers. */
export function Chip({ label, active, onPress, accessibilityLabel }: { label: string; active: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.active]}>
      <AppText style={active ? styles.activeText : styles.text}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: space.md, backgroundColor: colors.surface },
  active: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  text: { fontSize: 13 },
  activeText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
});
