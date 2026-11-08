import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppointmentCard } from '@/components/account/AppointmentCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { useLogout, useMe } from '@/lib/auth';
import { useCancelAppointment, useMyAppointments } from '@/lib/booking';
import { useNotifications } from '@/lib/notifications';
import { colors, radius, shadow, space } from '@/lib/theme';

const BENEFITS = ['Request appointments at participating facilities', 'See every request and its status in one place', 'Get notified when the clinic confirms'];

/** Signed out: why to sign in, plus guest links. Signed in: profile card, shortcuts, appointments. */
export default function AccountScreen() {
  const me = useMe();
  const user = me.data;
  const appointments = useMyAppointments(Boolean(user));
  const notifications = useNotifications(Boolean(user));
  const cancel = useCancelAppointment();
  const logout = useLogout();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Read the clock once per visit (rendering must not depend on a changing clock).
  const [now] = useState(Date.now);

  if (me.isPending) {
    return <ActivityIndicator style={styles.spinner} color={colors.brand} />;
  }

  if (!user) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="calendar" size={28} color={colors.brandDark} /></View>
          <AppText variant="heading" accessibilityRole="header">Your appointments in one place</AppText>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
              <AppText style={styles.flex}>{benefit}</AppText>
            </View>
          ))}
          <View style={styles.heroButtons}>
            <Button label="Sign in" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
            <Button label="Create a free account" variant="secondary" onPress={() => router.push('/register')} />
          </View>
        </View>

        <AppText style={styles.groupLabel}>No account needed</AppText>
        <ListGroup>
          <ListRow icon="search-outline" label="Check or cancel a booking" detail="Booked as a guest? Use your reference code" onPress={() => router.push('/manage-booking')} />
          <ListRow icon="bookmark-outline" label="Saved facilities" detail="Open them even without internet" onPress={() => router.push('/saved')} />
        </ListGroup>
      </ScrollView>
    );
  }

  const list = appointments.data?.data ?? [];
  const upcoming = list.filter((item) => new Date(item.starts_at).getTime() > now && ['requested', 'confirmed'].includes(item.status.value));
  const past = list.filter((item) => !upcoming.includes(item));
  const unread = notifications.data?.meta.unread ?? 0;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={[styles.profile, shadow]}>
        <View style={styles.avatar}><AppText style={styles.avatarText}>{initials || '?'}</AppText></View>
        <View style={styles.flex}>
          <AppText variant="title">{user.name}</AppText>
          <AppText variant="small">{user.email}</AppText>
        </View>
        <View style={styles.stat}>
          <AppText style={styles.statNumber}>{upcoming.length}</AppText>
          <AppText variant="small">upcoming</AppText>
        </View>
      </View>

      <ListGroup>
        <ListRow icon="notifications-outline" label="Notifications" badge={unread > 0 ? unread : undefined} onPress={() => router.push('/notifications')} />
        <ListRow icon="person-outline" label="Profile and password" onPress={() => router.push('/profile')} />
        <ListRow icon="bookmark-outline" label="Saved facilities" onPress={() => router.push('/saved')} />
      </ListGroup>

      {cancel.error instanceof ApiError && <Notice tone="danger">{cancel.error.body.message}</Notice>}

      <AppText style={styles.groupLabel} accessibilityRole="header">Upcoming appointments</AppText>
      {appointments.isPending ? <ActivityIndicator color={colors.brand} /> : upcoming.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-clear-outline" size={28} color="#a1a1aa" />
          <AppText variant="muted" style={styles.center}>No upcoming appointments. Facilities taking part show “Request an appointment” on their page.</AppText>
          <Button label="Find a facility" variant="secondary" icon="search-outline" onPress={() => router.navigate('/')} />
        </View>
      ) : upcoming.map((item) => (
        <AppointmentCard key={item.id} appointment={item} cancelling={cancellingId === item.id} onCancel={() => { setCancellingId(item.id); cancel.mutate(item.id, { onSettled: () => setCancellingId(null) }); }} />
      ))}

      {past.length > 0 && (
        <>
          <AppText style={styles.groupLabel} accessibilityRole="header">Past and cancelled</AppText>
          {past.map((item) => <AppointmentCard key={item.id} appointment={item} cancelling={false} onCancel={() => undefined} />)}
        </>
      )}

      <Button label="Sign out" variant="ghost" icon="log-out-outline" loading={logout.isPending} onPress={() => logout.mutate()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  spinner: { marginTop: space.xl },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { backgroundColor: colors.brandSoft, borderRadius: radius.card + 4, padding: space.lg, gap: space.md },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  benefit: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  heroButtons: { gap: space.sm, marginTop: space.xs },
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: space.sm },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '700', color: colors.brandDark },
  empty: { alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', backgroundColor: colors.surface },
});
