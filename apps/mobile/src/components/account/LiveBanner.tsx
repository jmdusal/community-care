import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, space } from '@/lib/theme';

/** A notification that just arrived while the app is open. Tap to open it. */
export function LiveBanner({ title, body, onOpen, onDismiss }: { title: string; body: string; onOpen: () => void; onDismiss: () => void }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} onPress={onOpen} style={styles.banner}>
        <View style={styles.text}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText variant="small">{body}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12}><AppText variant="link">Close</AppText></Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, bottom: space.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
});
