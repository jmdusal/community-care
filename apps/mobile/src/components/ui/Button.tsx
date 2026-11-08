import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Large (50pt) rounded button with an optional icon and loading state. */
export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style, accessibilityHint }: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  accessibilityHint?: string;
}) {
  const tone = TONES[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, tone.box, pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={tone.text.color} /> : icon && <Ionicons name={icon} size={18} color={tone.text.color} />}
        <AppText style={[styles.label, tone.text]}>{label}</AppText>
      </View>
    </Pressable>
  );
}

const TONES = {
  primary: { box: { backgroundColor: colors.brandDark }, text: { color: '#ffffff' } },
  secondary: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, text: { color: colors.text } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.brandDark } },
  danger: { box: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#fecdd3' }, text: { color: colors.danger } },
} as const;

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.control, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
