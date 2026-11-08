import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';

/** Labelled input: rounded, highlights while typing, optional leading icon, error or hint line. */
export function TextField({ label, error, hint, icon, ...props }: TextInputProps & { label: string; error?: string; hint?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={[styles.box, focused && styles.focused, error ? styles.boxError : null, props.editable === false && styles.readonly]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? colors.brandDark : colors.textMuted} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          {...props}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        />
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : hint ? <AppText variant="small">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  box: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: space.md, backgroundColor: colors.surface },
  focused: { borderColor: colors.brand },
  boxError: { borderColor: colors.danger },
  readonly: { backgroundColor: '#f4f4f5' },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: space.sm },
  error: { color: colors.danger, fontSize: 12 },
});
