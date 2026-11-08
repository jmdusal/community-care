import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRaw, apiRequest } from '../../lib/api';
import { disconnectEcho } from '../../lib/realtime';
import type { CurrentUser } from '../auth/useAuth';

export type TwoFactorMethod = 'app' | 'email';

export type TwoFactorStatus = { enabled: boolean; method: TwoFactorMethod | null; required: boolean; recovery_codes_left: number; remembered_devices?: number; remember_days?: number };

export type SetupStart = { method: TwoFactorMethod; secret?: string; otpauth_uri?: string; sent_to?: string };

export function useTwoFactorStatus() {
  return useQuery({ queryKey: ['two-factor'], queryFn: () => apiRequest<TwoFactorStatus>('/me/two-factor') });
}

function useRefresh() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['two-factor'] });
    void queryClient.invalidateQueries({ queryKey: ['me'] });
  };
}

export function useStartSetup() {
  return useMutation({ mutationFn: ({ password, method }: { password: string; method: TwoFactorMethod }) => apiRequest<SetupStart>('/me/two-factor/setup', { method: 'POST', body: JSON.stringify({ password, method }) }) });
}

export function useConfirmSetup() {
  // The caller refreshes status after the recovery codes have been shown.
  return useMutation({
    meta: { success: 'Two-factor sign-in is on', error: 'Could not turn on two-factor sign-in' }, mutationFn: (code: string) => apiRequest<{ enabled: true; recovery_codes: string[] }>('/me/two-factor/confirm', { method: 'POST', body: JSON.stringify({ code }) }) });
}

export function useNewRecoveryCodes() {
  const refresh = useRefresh();

  return useMutation({
    meta: { success: 'New recovery codes made. Save them now.', error: 'Could not make new codes' },
    mutationFn: (password: string) => apiRequest<{ recovery_codes: string[] }>('/me/two-factor/recovery-codes', { method: 'POST', body: JSON.stringify({ password }) }),
    onSuccess: refresh,
  });
}

export function useDisableTwoFactor() {
  const refresh = useRefresh();

  return useMutation({
    meta: { success: 'Two-factor sign-in turned off', error: 'Could not turn it off' }, mutationFn: (password: string) => apiRequest<{ enabled: false }>('/me/two-factor', { method: 'DELETE', body: JSON.stringify({ password }) }), onSuccess: refresh });
}

export function useRefreshTwoFactor() {
  return useRefresh();
}

/** The signed-in person's name and mobile (email is fixed: it is the sign-in). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Profile saved', error: 'Could not save your profile' },
    mutationFn: (input: { name: string; mobile: string | null }) => apiRequest<CurrentUser>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (user) => queryClient.setQueryData(['me'], user),
  });
}

/** Needs the current password; other devices are signed out. */
export function useChangePassword() {
  return useMutation({
    meta: { success: 'Password changed. Other devices were signed out.', error: 'Could not change your password' },
    mutationFn: (input: { current_password: string; password: string; password_confirmation: string }) => apiRaw<null>('/me/password', { method: 'PUT', body: JSON.stringify(input) }),
  });
}

/** Patients only: cancels upcoming appointments and deletes the account. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Your account was deleted', error: 'Could not delete your account' },
    mutationFn: (password: string) => apiRaw<null>('/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      disconnectEcho();
      queryClient.clear();
    },
  });
}

/** Every browser and phone that skips the code asks for it again. */
export function useForgetDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Remembered devices forgotten. Every device will ask for a code next time.', error: 'Could not forget devices' },
    mutationFn: () => apiRaw<null>('/me/trusted-devices', { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['two-factor'] }),
  });
}
