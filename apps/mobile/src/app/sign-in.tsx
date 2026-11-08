import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { useLogin, useResendCode, useTwoFactor } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

/** Sign in with email and password; then a code if the account uses two-factor sign-in. */
export default function SignInScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const login = useLogin();
  const twoFactor = useTwoFactor();
  const resend = useResendCode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const challenge = login.data?.challenge;
  const error = (challenge ? twoFactor.error : login.error) instanceof ApiError ? ((challenge ? twoFactor.error : login.error) as ApiError) : null;
  const done = () => (next ? router.replace(next as never) : router.back());

  const submitPassword = () => login.mutate({ email: email.trim(), password }, { onSuccess: (data) => data.token && done() });
  const submitCode = () => challenge && twoFactor.mutate({ challenge, remember_device: rememberDevice, ...(recovery ? { recovery_code: code.trim() } : { code: code.replace(/\s+/g, '') }) }, { onSuccess: done });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {error && !error.body.fields && <Notice tone="danger">{error.body.message}</Notice>}

        {challenge ? (
          <>
            <ScreenIntro icon="shield-checkmark-outline" title="Two-step sign-in" />
            <AppText variant="muted">
              {recovery ? 'Enter one of your recovery codes.' : login.data?.method === 'email' ? `We emailed a 6-digit code to ${login.data.sent_to ?? 'your email'}.` : 'Enter the 6-digit code from your authenticator app.'}
            </AppText>
            <TextField label={recovery ? 'Recovery code' : 'Code'} value={code} onChangeText={setCode} keyboardType={recovery ? 'default' : 'number-pad'} textContentType="oneTimeCode" autoComplete="one-time-code" autoCapitalize="characters" error={error?.field('code') ?? error?.field('recovery_code')} />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberDevice }} onPress={() => setRememberDevice(!rememberDevice)} style={styles.remember}>
              <View style={[styles.box, rememberDevice && styles.boxOn]}>{rememberDevice && <Ionicons name="checkmark" size={15} color="#ffffff" />}</View>
              <View style={styles.flex}>
                <AppText>Remember this phone for 30 days</AppText>
                <AppText variant="small">You won’t need a code on this phone again until then.</AppText>
              </View>
            </Pressable>
            <Button label="Verify and sign in" loading={twoFactor.isPending} onPress={submitCode} disabled={code.trim().length < 6} />
            {login.data?.method === 'email' && !recovery && (
              <Pressable accessibilityRole="button" onPress={() => resend.mutate(challenge)} style={styles.link}><AppText variant="link">{resend.isSuccess ? 'New code sent' : 'Send a new code'}</AppText></Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={() => { setRecovery(!recovery); setCode(''); }} style={styles.link}><AppText variant="link">{recovery ? 'Use the code instead' : 'Use a recovery code'}</AppText></Pressable>
          </>
        ) : (
          <>
            <ScreenIntro icon="person-circle-outline" title="Welcome back">Sign in to request appointments and see their status.</ScreenIntro>
            <TextField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" error={error?.field('email')} />
            <TextField label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" error={error?.field('password')} />
            <Button label="Sign in" loading={login.isPending} onPress={submitPassword} disabled={!email || !password} />
            <Link href="/forgot-password" asChild replace>
              <Pressable accessibilityRole="link" style={styles.link}><AppText variant="link">Forgot your password?</AppText></Pressable>
            </Link>
            <Link href="/register" asChild replace>
              <Pressable accessibilityRole="link" style={styles.link}><AppText variant="link">New here? Create an account</AppText></Pressable>
            </Link>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.lg, gap: space.md },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  remember: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
});
