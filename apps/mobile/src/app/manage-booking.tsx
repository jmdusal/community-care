import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { AppointmentCard } from '@/components/account/AppointmentCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { useAppointmentLookup } from '@/lib/booking';
import { space } from '@/lib/theme';

/** Check or cancel an appointment without signing in: reference code + the email it was made with. */
export default function ManageBookingScreen() {
  const params = useLocalSearchParams<{ ref?: string }>();
  const [reference, setReference] = useState(params.ref ?? '');
  const [email, setEmail] = useState('');
  const lookup = useAppointmentLookup();
  const cancel = useAppointmentLookup();
  const appointment = cancel.data ?? lookup.data;
  const lookupError = lookup.error instanceof ApiError ? lookup.error : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {appointment ? (
          <>
            {cancel.data && <Notice>Cancelled. The time is open for someone else, and the clinic has been told.</Notice>}
            {cancel.error instanceof ApiError && <Notice tone="danger">{cancel.error.body.message}</Notice>}
            <AppointmentCard appointment={appointment} cancelling={cancel.isPending} onCancel={() => cancel.mutate({ reference_code: appointment.reference_code, email: email.trim(), cancel: true })} />
            <Button label="Look up another" variant="secondary" onPress={() => { lookup.reset(); cancel.reset(); }} />
          </>
        ) : (
          <>
            <AppText variant="muted">Use the reference code from your email or the clinic, and the email you booked with.</AppText>
            {lookupError && <Notice tone="danger">{lookupError.status === 404 ? 'No appointment matches that reference code and email. Check both and try again.' : lookupError.body.message}</Notice>}
            <TextField label="Reference code" placeholder="CC-7KQ2-9MXD" value={reference} onChangeText={setReference} autoCapitalize="characters" autoCorrect={false} />
            <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <Button label={lookup.isPending ? 'Looking…' : 'Find my appointment'} onPress={() => lookup.mutate({ reference_code: reference.trim(), email: email.trim() })} disabled={lookup.isPending || !reference.trim() || !email.trim()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.lg, gap: space.md },
});
