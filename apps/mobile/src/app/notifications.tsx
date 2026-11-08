import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useMe } from '@/lib/auth';
import { appRouteFor, useMarkAllRead, useNotifications } from '@/lib/notifications';
import { colors, space } from '@/lib/theme';

/** Recent notifications (appointment updates), newest first. */
export default function NotificationsScreen() {
  const me = useMe();
  const list = useNotifications(Boolean(me.data));
  const markAll = useMarkAllRead();
  const items = list.data?.data ?? [];

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListHeaderComponent={(list.data?.meta.unread ?? 0) > 0 ? <Button variant="secondary" label="Mark all as read" onPress={() => markAll.mutate()} /> : undefined}
      ListEmptyComponent={<Notice>{me.data ? "You're all caught up." : 'Sign in to see your notifications.'}</Notice>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" onPress={() => router.push(appRouteFor(item.path) as never)} style={[styles.item, !item.read && styles.unread]}>
          <View style={[styles.dot, item.read && styles.dotRead]} />
          <View style={styles.text}>
            <AppText style={styles.title}>{item.title}</AppText>
            <AppText variant="small">{item.body}</AppText>
            <AppText variant="small">{new Date(item.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</AppText>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm },
  item: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  unread: { backgroundColor: colors.brandSoft },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: colors.brandDark },
  dotRead: { backgroundColor: 'transparent' },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
});
