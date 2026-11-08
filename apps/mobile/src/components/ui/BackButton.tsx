import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

/**
 * A round "‹" back button in the header of every screen opened on top of the tabs.
 * Opened from a link with nothing behind it, it goes to Home instead.
 */
export function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.brandDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
