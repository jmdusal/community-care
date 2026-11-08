import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, getToken, getTrustedDevice, setToken, setTrustedDevice } from './api';
import { unregisterPush } from './push';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  roles: string[];
  two_factor?: { enabled: boolean; required: boolean };
  /** Permission keys from the person's roles (staff mode needs appointments.manage). */
  permissions?: string[];
  /** Has a role that covers every facility (admins); otherwise only assigned facilities. */
  sees_all_facilities?: boolean;
  is_team_member?: boolean;
  facilities?: { id: string; name: string }[];
};

/** Facility admins and staff who handle appointments see the Clinic tab. */
export function isClinicStaff(user: CurrentUser | null | undefined): boolean {
  return Boolean(user?.is_team_member && user.permissions?.includes('appointments.manage'));
}

/** Login result: signed in, or the password was right and a two-factor code is needed next. */
type LoginResponse = { data: { token?: string; user?: CurrentUser; two_factor_required?: boolean; method?: 'app' | 'email'; sent_to?: string; challenge?: string } };

const DEVICE = 'CommunityCare mobile';

/** The signed-in person, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!(await getToken())) {
        return null;
      }
      try {
        return (await apiFetch<{ data: CurrentUser }>('/me')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      // A phone remembered after a correct code signs in with the password only.
      const trusted = await getTrustedDevice(input.email);

      return (await apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { ...input, device_name: DEVICE, ...(trusted ? { trusted_device: trusted } : {}) } })).data;
    },
    onSuccess: async (data) => {
      if (data.token && data.user) {
        await setToken(data.token);
        queryClient.setQueryData(['me'], data.user);
      }
    },
  });
}

/** Second sign-in step: the emailed / app code, or a recovery code, for the login challenge. */
export function useTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { challenge: string; code?: string; recovery_code?: string; remember_device?: boolean }) =>
      (await apiFetch<{ data: { token: string; user: CurrentUser; trusted_device?: { token: string; days: number } } }>('/auth/two-factor', { method: 'POST', body: input })).data,
    onSuccess: async (data) => {
      await setToken(data.token);
      if (data.trusted_device) {
        await setTrustedDevice(data.user.email, data.trusted_device.token);
      }
      queryClient.setQueryData(['me'], data.user);
    },
  });
}

export function useResendCode() {
  return useMutation({ mutationFn: (challenge: string) => apiFetch('/auth/two-factor/resend', { method: 'POST', body: { challenge } }) });
}

export type RegisterInput = { name: string; email: string; mobile: string; password: string; password_confirmation: string; privacy_consent: boolean };

/** Creates a patient account, then signs in on this device (token). */
export function useRegister() {
  const login = useLogin();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await apiFetch('/auth/register', { method: 'POST', body: input });

      return login.mutateAsync({ email: input.email, password: input.password });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await unregisterPush().catch(() => undefined);
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
      await setToken(null);
    },
    onSettled: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['my-appointments'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
    },
  });
}
