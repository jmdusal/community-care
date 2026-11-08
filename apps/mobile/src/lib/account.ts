import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, setToken } from './api';
import type { CurrentUser } from './auth';
import { unregisterPush } from './push';

/** Name and mobile (email is the sign-in and stays fixed). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; mobile: string | null }) => (await apiFetch<{ data: CurrentUser }>('/me', { method: 'PATCH', body: input })).data,
    onSuccess: (user) => queryClient.setQueryData(['me'], user),
  });
}

/** Needs the current password; other devices are signed out (this one stays signed in). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; password: string; password_confirmation: string }) => apiFetch('/me/password', { method: 'PUT', body: input }),
  });
}

/** Cancels upcoming appointments and deletes the account, then signs this device out. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      await unregisterPush().catch(() => undefined);
      await apiFetch('/me', { method: 'DELETE', body: { password } });
      await setToken(null);
    },
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['my-appointments'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Always "sent" (the API never says whether an email has an account). */
export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: { email } }) });
}
