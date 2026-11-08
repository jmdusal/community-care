import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { Appointment } from '@/lib/booking';
import { colors, radius, space } from '@/lib/theme';

/**
 * Desk check-in for a confirmed appointment: the QR code staff scan (it holds only the
 * reference code), then the queue number once the patient has arrived.
 */
export function CheckInPass({ appointment }: { appointment: Appointment }) {
  const [open, setOpen] = useState(() => new Date(appointment.starts_at).toDateString() === new Date().toDateString());

  if (appointment.queue_number) {
    return (
      <View style={styles.arrived} accessibilityRole="text">
        <Ionicons name="checkmark-circle" size={22} color="#047857" />
        <AppText style={styles.arrivedText}>
          You are checked in. Your queue number is <AppText style={styles.number}>{appointment.queue_number}</AppText>. Watch the screen or listen for your number.
        </AppText>
      </View>
    );
  }

  if (!appointment.check_in_qr) {
    return null;
  }

  return (
    <View style={styles.box}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.toggle}>
        <Ionicons name="qr-code-outline" size={18} color={colors.brand} />
        <AppText style={styles.toggleText}>Check-in QR code</AppText>
        <AppText variant="small">{open ? 'Hide' : 'Show'}</AppText>
      </Pressable>
      {open && (
        <View style={styles.qrWrap}>
          <Image source={{ uri: appointment.check_in_qr }} style={styles.qr} contentFit="contain" accessibilityLabel={`Check-in QR code for ${appointment.reference_code}`} />
          <AppText variant="small" style={styles.center}>Show this at the desk on the day. Staff scan it and give you a queue number. You can also tell them the reference code.</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, overflow: 'hidden' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 48 },
  toggleText: { flex: 1, fontWeight: '600' },
  qrWrap: { alignItems: 'center', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  // Always on white, so the desk camera reads it in dark mode too.
  qr: { width: 220, height: 220, backgroundColor: '#ffffff', borderRadius: 8 },
  center: { textAlign: 'center' },
  arrived: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: '#ecfdf5', borderRadius: radius.card, padding: space.md },
  arrivedText: { flex: 1, color: '#064e3b' },
  number: { fontFamily: 'Menlo', fontWeight: '800', fontSize: 16, color: '#064e3b' },
});
