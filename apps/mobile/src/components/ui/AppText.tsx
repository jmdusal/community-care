import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, font } from '@/lib/theme';

type Variant = 'body' | 'muted' | 'small' | 'title' | 'heading' | 'link';

/** Text with the app's type scale. Respects the system font size (accessibility). */
export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontSize: font.body },
  body: {},
  muted: { color: colors.textMuted },
  small: { color: colors.textMuted, fontSize: font.small },
  title: { fontSize: font.title, fontWeight: '600' },
  heading: { fontSize: font.heading, fontWeight: '700' },
  link: { color: colors.brandDark, fontWeight: '500' },
});
