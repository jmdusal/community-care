import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { formatSlot, formatTime, groupByDay, newIdempotencyKey, type Slot, useRequestAppointment, useSlots } from '@/lib/booking';
import { colors, radius, space } from '@/lib/theme';
import { GuestBookingForm } from './GuestBookingForm';

/** Pick a day and time, then request it. Not booked until the clinic confirms. */
export function BookingPanel({ facilityId }: { facilityId: string }) {
  const me = useMe();
  const slots = useSlots(facilityId, true);
  const request = useRequestAppointment();
  const [dayIndex, setDayIndex] = useState(0);
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [asGuest, setAsGuest] = useState(false);
  // One key per chosen time: a retry after a dropped connection cannot book twice.
  const key = useMemo(() => (chosen ? newIdempotencyKey() : ''), [chosen]);
  const days = groupByDay(slots.data?.data ?? []);
  const day = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];

  if (request.data) {
    return (
      <View style={styles.gap}>
        <Notice>Request sent for {formatSlot(request.data.starts_at)}. Reference {request.data.reference_code}.</Notice>
        <AppText variant="small">This is not confirmed yet. The clinic will confirm or decline, and we will notify you.</AppText>
        <Button label="View my appointments" onPress={() => router.navigate('/account')} />
      </View>
    );
  }
  if (chosen && asGuest && !me.data) {
    return <GuestBookingForm slot={chosen} onBack={() => setAsGuest(false)} />;
  }
  if (slots.isPending) {
    return <AppText variant="muted">Loading available times…</AppText>;
  }
  if (days.length === 0) {
    return <AppText variant="muted">No open times in the next two weeks. Please call the facility.</AppText>;
  }

  return (
    <View style={styles.gap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((item, index) => <Chip key={item.day} label={item.label} active={index === dayIndex} onPress={() => { setDayIndex(index); setChosen(null); }} />)}
      </ScrollView>
      <View style={styles.grid}>
        {day.slots.map((slot) => {
          const active = chosen?.id === slot.id;

          return (
            <Pressable key={slot.id} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${formatTime(slot.starts_at)}, ${slot.seats_left} left`} onPress={() => setChosen(slot)} style={[styles.slot, active && styles.slotActive]}>
              <AppText style={[styles.time, active && styles.white]}>{formatTime(slot.starts_at)}</AppText>
              <AppText style={[styles.seats, active && styles.white]}>{slot.service?.name ?? 'General'} · {slot.seats_left} left</AppText>
            </Pressable>
          );
        })}
      </View>
      {request.error && <Notice tone="danger">{request.error instanceof ApiError ? request.error.body.message : 'Could not send the request. Try again.'}</Notice>}
      {chosen && (me.data ? (
        <Button label={request.isPending ? 'Sending…' : `Request ${formatSlot(chosen.starts_at)}`} onPress={() => request.mutate({ slotId: chosen.id, key })} disabled={request.isPending} />
      ) : (
        <View style={styles.gap}>
          <Button label="Continue as guest" onPress={() => setAsGuest(true)} />
          <Button label="Sign in" variant="secondary" onPress={() => router.push({ pathname: '/sign-in', params: { next: `/facilities/${facilityId}` } } as never)} />
        </View>
      ))}
      <AppText variant="small">Requests are free. Not for emergencies: call 911.</AppText>
      <Pressable accessibilityRole="link" onPress={() => router.push('/manage-booking' as never)} style={styles.link}>
        <AppText variant="link">Booked as a guest? Check or cancel it</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  days: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  slot: { width: '31%', minHeight: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.surface, padding: space.xs },
  slotActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  time: { fontWeight: '600' },
  seats: { fontSize: 11, color: colors.textMuted },
  white: { color: '#ffffff' },
  link: { minHeight: 44, justifyContent: 'center' },
});
