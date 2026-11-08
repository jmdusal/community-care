import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';

/** The soft brand-coloured block at the top of a screen: icon, title, short text. */
export function ScreenIntro({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children?: ReactNode }) {
  return (
    <View style={styles.box}>
      <View style={styles.iconBox}><Ionicons name={icon} size={24} color={colors.brandDark} /></View>
      <AppText variant="heading" accessibilityRole="header">{title}</AppText>
      {children && <AppText variant="muted" style={styles.text}>{children}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.brandSoft, borderRadius: radius.card + 4, padding: space.lg, gap: space.sm },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  text: { lineHeight: 21 },
});
