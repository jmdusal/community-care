import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { TextField } from '@/components/ui/TextField';
import { useForgotPassword } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { space } from '@/lib/theme';

/** Emails a reset link; the person sets a new password on the website, then signs in here. */
export default function ForgotPasswordScreen() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <ScreenIntro icon="key-outline" title="Forgot your password?">Enter your account email and we will send a link to set a new one.</ScreenIntro>
      {forgot.isSuccess ? (
        <Notice tone="success">If that email has an account, a reset link is on its way. Open it, choose a new password, then sign in here.</Notice>
      ) : (
        <>
          {forgot.error instanceof ApiError && <Notice tone="danger">{forgot.error.body.message}</Notice>}
          <TextField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
          <Button label="Send reset link" icon="paper-plane-outline" loading={forgot.isPending} onPress={() => forgot.mutate(email.trim())} disabled={!email.includes('@')} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ page: { padding: 16, gap: space.md } });
