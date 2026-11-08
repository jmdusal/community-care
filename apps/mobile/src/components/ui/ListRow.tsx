import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';

/** A settings-style row: icon tile, label (and detail), optional badge, chevron. */
export function ListRow({ icon, label, detail, badge, onPress, tone = 'brand' }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  badge?: string | number;
  onPress: () => void;
  tone?: 'brand' | 'danger';
}) {
  const danger = tone === 'danger';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.iconBox, danger && styles.iconDanger]}><Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brandDark} /></View>
      <View style={styles.flex}>
        <AppText style={[styles.label, danger && { color: colors.danger }]}>{label}</AppText>
        {detail && <AppText variant="small">{detail}</AppText>}
      </View>
      {badge !== undefined && <AppText style={styles.badge}>{badge}</AppText>}
      <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
    </Pressable>
  );
}

/** Groups ListRows in one rounded card with hairline separators. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 58, paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface },
  pressed: { backgroundColor: '#f4f4f5' },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: colors.dangerSoft },
  flex: { flex: 1, gap: 1 },
  label: { fontSize: 16, fontWeight: '500' },
  badge: { color: '#ffffff', backgroundColor: colors.danger, fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
});
