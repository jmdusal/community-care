import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { useChangePassword, useDeleteAccount, useUpdateProfile } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { space } from '@/lib/theme';

/** Name and mobile, password, and deleting the account. */
export default function ProfileScreen() {
  const me = useMe();
  const user = me.data;
  const update = useUpdateProfile();
  const change = useChangePassword();
  const remove = useDeleteAccount();
  const [name, setName] = useState(user?.name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const updateError = update.error instanceof ApiError ? update.error : null;
  const changeError = change.error instanceof ApiError ? change.error : null;
  const removeError = remove.error instanceof ApiError ? remove.error : null;

  if (!user) {
    return <ScrollView contentContainerStyle={styles.page}><Notice>Sign in to manage your account.</Notice></ScrollView>;
  }

  const confirmDelete = () => Alert.alert(
    'Delete your account?',
    'Your upcoming appointments are cancelled. This cannot be undone.',
    [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(deletePassword, { onSuccess: () => router.replace('/') }) },
    ],
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Card title="Profile">
          {update.isSuccess && <Notice>Profile saved.</Notice>}
          <TextField label="Email" value={user.email} editable={false} hint="Your sign-in. It cannot be changed here." />
          <TextField label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" error={updateError?.field('name')} />
          <TextField label="Mobile" hint="Clinics call this number about your appointments." placeholder="0917 123 4567" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" autoComplete="tel" error={updateError?.field('mobile')} />
          <Button label={update.isPending ? 'Saving…' : 'Save profile'} onPress={() => update.mutate({ name: name.trim(), mobile: mobile.trim() || null })} disabled={update.isPending || name.trim().length < 2} />
        </Card>

        <Card title="Password">
          {change.isSuccess && <Notice>Password changed. Other devices were signed out.</Notice>}
          <TextField label="Current password" secureTextEntry value={passwords.current_password} onChangeText={(current_password) => setPasswords({ ...passwords, current_password })} autoComplete="current-password" textContentType="password" error={changeError?.field('current_password')} />
          <TextField label="New password" hint="At least 6 characters, with letters and numbers." secureTextEntry value={passwords.password} onChangeText={(password) => setPasswords({ ...passwords, password })} autoComplete="new-password" textContentType="newPassword" error={changeError?.field('password')} />
          <TextField label="Repeat new password" secureTextEntry value={passwords.password_confirmation} onChangeText={(password_confirmation) => setPasswords({ ...passwords, password_confirmation })} autoComplete="new-password" textContentType="newPassword" />
          <Button
            label={change.isPending ? 'Changing…' : 'Change password'}
            onPress={() => change.mutate(passwords, { onSuccess: () => setPasswords({ current_password: '', password: '', password_confirmation: '' }) })}
            disabled={change.isPending || !passwords.current_password || passwords.password.length < 6}
          />
        </Card>

        <Card title="Delete account">
          <AppText variant="muted">Upcoming appointments are cancelled. Past visits stay with the clinic under your name only.</AppText>
          {removeError && !removeError.field('password') && <Notice tone="danger">{removeError.body.message}</Notice>}
          <TextField label="Your password" secureTextEntry value={deletePassword} onChangeText={setDeletePassword} autoComplete="current-password" textContentType="password" error={removeError?.field('password')} />
          <Button label={remove.isPending ? 'Deleting…' : 'Delete my account'} variant="secondary" onPress={confirmDelete} disabled={remove.isPending || !deletePassword} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.lg, gap: space.md },
});
