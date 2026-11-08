import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, space } from '@/lib/theme';
import { AppText } from './AppText';

/** A rounded surface with an optional section title and icon. */
export function Card({ title, icon, children, style }: { title?: string; icon?: keyof typeof Ionicons.glyphMap; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={styles.head}>
          {icon && <View style={styles.iconBox}><Ionicons name={icon} size={16} color={colors.brandDark} /></View>}
          <AppText variant="title" style={styles.title} accessibilityRole="header">{title}</AppText>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
