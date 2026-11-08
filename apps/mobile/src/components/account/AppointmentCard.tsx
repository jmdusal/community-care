import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckInPass } from '@/components/account/CheckInPass';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { type Appointment, formatSlot, STATUS_COLORS } from '@/lib/booking';
import { colors, radius, space } from '@/lib/theme';

/** One appointment: when, where, status, reference code, and cancel while allowed. */
export function AppointmentCard({ appointment, onCancel, cancelling }: { appointment: Appointment; onCancel: () => void; cancelling: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(Date.now);
  const upcoming = new Date(appointment.starts_at).getTime() > now;
  const tone = STATUS_COLORS[appointment.status.value];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <AppText variant="title" style={styles.flex}>{formatSlot(appointment.starts_at)}</AppText>
        <AppText style={[styles.status, { color: tone.fg, backgroundColor: tone.bg }]}>{appointment.status.label}</AppText>
      </View>
      <Link href={`/facilities/${appointment.facility.id}`} asChild>
        <Pressable accessibilityRole="link"><AppText variant="link">{appointment.facility.name}</AppText></Pressable>
      </Link>
      {appointment.facility.address && <AppText variant="small">{appointment.facility.address}</AppText>}
      {appointment.service && <AppText variant="small">Service: {appointment.service.name}</AppText>}
      <AppText variant="small">Reference <AppText style={styles.code}>{appointment.reference_code}</AppText></AppText>
      <CheckInPass appointment={appointment} />
      {appointment.status_reason && appointment.status.value !== 'cancelled' && <AppText variant="small">Note from the clinic: {appointment.status_reason}</AppText>}
      {appointment.can_cancel && upcoming && (confirming ? (
        <View style={styles.row}>
          <Button label={cancelling ? 'Cancelling…' : 'Yes, cancel'} onPress={onCancel} disabled={cancelling} style={styles.flex} />
          <Button label="Keep it" variant="secondary" onPress={() => setConfirming(false)} style={styles.flex} />
        </View>
      ) : (
        <Button label="Cancel appointment" variant="secondary" onPress={() => setConfirming(true)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
  status: { fontSize: 12, fontWeight: '600', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  code: { fontFamily: 'Menlo', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
