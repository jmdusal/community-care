import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';

const tones = {
  info: { backgroundColor: colors.brandSoft, color: colors.brandDark, icon: 'information-circle' },
  success: { backgroundColor: colors.successSoft, color: colors.success, icon: 'checkmark-circle' },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning, icon: 'alert-circle' },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger, icon: 'close-circle' },
} as const;

/** A tinted message with an icon (offline, empty results, success, warnings). */
export function Notice({ tone = 'info', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone];

  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : 'text'} style={[styles.box, { backgroundColor: t.backgroundColor }]}>
      <Ionicons name={t.icon} size={18} color={t.color} style={styles.icon} />
      <AppText style={[styles.text, { color: t.color }]}>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: space.sm, borderRadius: radius.control, padding: space.md },
  icon: { marginTop: 1 },
  text: { flex: 1, lineHeight: 20 },
});
