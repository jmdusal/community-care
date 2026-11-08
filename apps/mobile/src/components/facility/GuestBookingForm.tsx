import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { type Appointment, formatSlot, type Slot, useGuestStart, useGuestVerify } from '@/lib/booking';
import { colors, radius, space } from '@/lib/theme';

/**
 * Request a time without an account: name, email and mobile, then the 6-digit code we
 * email. The reference code plus the email lets the guest check or cancel later.
 */
export function GuestBookingForm({ slot, onBack }: { slot: Slot; onBack: () => void }) {
  const start = useGuestStart();
  const verify = useGuestVerify();
  const [details, setDetails] = useState({ name: '', email: '', mobile: '', privacy_consent: false });
  const [code, setCode] = useState('');
  const [done, setDone] = useState<Appointment | null>(null);
  const sent = start.data;
  const startError = start.error instanceof ApiError ? start.error : null;
  const verifyError = verify.error instanceof ApiError ? verify.error : null;

  if (done) {
    return (
      <View style={styles.gap}>
        <Notice>Request sent for {formatSlot(done.starts_at)}. Your reference is {done.reference_code}.</Notice>
        <AppText variant="small">It is not confirmed yet. We emailed you the details and will email again when the clinic answers. Keep the reference code: with your email, it lets you check or cancel.</AppText>
        <Button label="Check or cancel" onPress={() => router.push({ pathname: '/manage-booking', params: { ref: done.reference_code } } as never)} />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/register')} />
      </View>
    );
  }

  if (sent) {
    return (
      <View style={styles.gap}>
        <AppText>We sent a 6-digit code to {sent.sent_to}. Enter it to send your request for {formatSlot(slot.starts_at)}.</AppText>
        <TextField label="Code" value={code} onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" error={verifyError ? (verifyError.field('code') ?? verifyError.body.message) : undefined} />
        <Button label={verify.isPending ? 'Sending…' : 'Send request'} onPress={() => verify.mutate({ verification_id: sent.verification_id, code }, { onSuccess: setDone })} disabled={verify.isPending || code.length !== 6} />
        <Button label="Use a different email" variant="secondary" onPress={() => { start.reset(); verify.reset(); setCode(''); }} />
        <AppText variant="small">The code works for {sent.expires_in_minutes} minutes. Check your spam folder if it does not arrive.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <AppText>Requesting {formatSlot(slot.starts_at)}{slot.service ? ` · ${slot.service.name}` : ''} without an account.</AppText>
      {startError && !startError.body.fields && <Notice tone="danger">{startError.body.message}</Notice>}
      <TextField label="Full name" value={details.name} onChangeText={(name) => setDetails({ ...details, name })} autoComplete="name" textContentType="name" error={startError?.field('name')} />
      <TextField label="Email" hint="We send a code here." value={details.email} onChangeText={(email) => setDetails({ ...details, email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={startError?.field('email')} />
      <TextField label="Mobile" hint="So the clinic can reach you." placeholder="0917 123 4567" value={details.mobile} onChangeText={(mobile) => setDetails({ ...details, mobile })} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={startError?.field('mobile')} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: details.privacy_consent }} onPress={() => setDetails({ ...details, privacy_consent: !details.privacy_consent })} style={styles.consent}>
        <View style={[styles.box, details.privacy_consent && styles.boxOn]}>{details.privacy_consent && <AppText style={styles.tick}>✓</AppText>}</View>
        <AppText variant="small" style={styles.flex}>I agree that CommunityCare shares my name, mobile and email with this facility to handle my request. No medical information is collected.</AppText>
      </Pressable>
      {startError?.field('privacy_consent') && <AppText style={styles.error}>{startError.field('privacy_consent')}</AppText>}
      <Button label={start.isPending ? 'Sending code…' : 'Email me a code'} onPress={() => start.mutate({ ...details, slot_id: slot.id })} disabled={start.isPending || !details.name || !details.email || !details.mobile || !details.privacy_consent} />
      <Button label="Back" variant="secondary" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  flex: { flex: 1 },
  consent: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: radius.control / 2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  tick: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12 },
});
