import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { type RegisterInput, useRegister } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

/** Patient sign-up: name, email, mobile (so the clinic can reach you), password and consent. */
export default function RegisterScreen() {
  const register = useRegister();
  const [form, setForm] = useState<RegisterInput>({ name: '', email: '', mobile: '', password: '', password_confirmation: '', privacy_consent: false });
  const error = register.error instanceof ApiError ? register.error : null;
  const set = (key: keyof RegisterInput) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <ScreenIntro icon="person-add-outline" title="Create your free account">Request appointments at participating facilities and track them in one place.</ScreenIntro>
        {error && !error.body.fields && <Notice tone="danger">{error.body.message}</Notice>}
        <TextField label="Full name" icon="person-outline" value={form.name} onChangeText={set('name')} autoComplete="name" textContentType="name" error={error?.field('name')} />
        <TextField label="Email" icon="mail-outline" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error?.field('email')} />
        <TextField label="Mobile number" icon="call-outline" value={form.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" placeholder="0917 123 4567" hint="The clinic uses this to reach you about your appointment." error={error?.field('mobile')} />
        <TextField label="Password" icon="lock-closed-outline" value={form.password} onChangeText={set('password')} secureTextEntry textContentType="newPassword" hint="At least 10 characters." error={error?.field('password')} />
        <TextField label="Confirm password" icon="lock-closed-outline" value={form.password_confirmation} onChangeText={set('password_confirmation')} secureTextEntry textContentType="newPassword" />

        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.privacy_consent }} onPress={() => setForm((current) => ({ ...current, privacy_consent: !current.privacy_consent }))} style={styles.consent}>
          <View style={[styles.box, form.privacy_consent && styles.boxOn]}>{form.privacy_consent && <AppText style={styles.tick}>✓</AppText>}</View>
          <AppText variant="small" style={styles.flex}>
            I agree that CommunityCare shares my name, email and mobile number with the facility I request an appointment at, only to arrange that appointment. CommunityCare does not ask for or store medical information.
          </AppText>
        </Pressable>
        {error?.field('privacy_consent') && <AppText style={styles.error}>{error.field('privacy_consent')}</AppText>}

        <Button label="Create account" loading={register.isPending} onPress={() => register.mutate(form, { onSuccess: () => router.back() })} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.lg, gap: space.md },
  consent: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  tick: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12 },
});
