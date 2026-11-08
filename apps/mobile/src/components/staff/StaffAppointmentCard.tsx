import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { formatSlot, STATUS_COLORS } from '@/lib/booking';
import { ACTIONS, type StaffAction, type StaffAppointment } from '@/lib/staff';
import { colors, radius, space } from '@/lib/theme';

const SOURCE: Record<string, string> = { guest: 'Guest', staff: 'Booked by clinic' };

/** One appointment for staff: when, who (tap to call), where, status, and the allowed actions. */
export function StaffAppointmentCard({ appointment, busy, onAction }: { appointment: StaffAppointment; busy: boolean; onAction: (action: StaffAction, needsReason: boolean) => void }) {
  const tone = STATUS_COLORS[appointment.status.value];
  const actions = (appointment.next_actions ?? []).map((status) => ACTIONS[status]).filter(Boolean);
  const mobile = appointment.patient?.mobile;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="title">{formatSlot(appointment.starts_at)}</AppText>
          <AppText variant="small" style={styles.code}>{appointment.reference_code}</AppText>
        </View>
        <AppText style={[styles.status, { color: tone.fg, backgroundColor: tone.bg }]}>{appointment.status.label}</AppText>
      </View>

      <View style={styles.person}>
        <View style={styles.avatar}><Ionicons name="person" size={16} color={colors.brandDark} /></View>
        <View style={styles.flex}>
          <AppText style={styles.name}>{appointment.patient?.name ?? 'Patient'}</AppText>
          {appointment.source && SOURCE[appointment.source] && <AppText variant="small">{SOURCE[appointment.source]}{appointment.booked_by ? ` · ${appointment.booked_by}` : ''}</AppText>}
        </View>
        {mobile && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${mobile}`} onPress={() => void Linking.openURL(`tel:${mobile}`)} style={styles.call}>
            <Ionicons name="call" size={16} color="#ffffff" />
          </Pressable>
        )}
      </View>

      <View style={styles.meta}>
        <Ionicons name="business-outline" size={14} color={colors.textMuted} />
        <AppText variant="small" style={styles.flex}>{appointment.facility.name} · {appointment.service?.name ?? 'General consultation'}</AppText>
      </View>
      {appointment.status_reason && <AppText variant="small">Note: {appointment.status_reason}</AppText>}

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button key={action.action} label={action.label} variant={action.tone} disabled={busy} onPress={() => onAction(action.action, action.needsReason === true)} style={styles.action} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
  code: { fontFamily: 'Menlo', marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.background, borderRadius: radius.control, padding: space.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '600' },
  call: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  action: { flexGrow: 1, minHeight: 44 },
});
