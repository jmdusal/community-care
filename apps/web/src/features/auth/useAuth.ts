import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ensureCsrfCookie } from '../../lib/api';
import { disconnectEcho } from '../../lib/realtime';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  status: string;
  mfa_enabled: boolean;
  /** Two-factor sign-in: on for this person, and whether their role requires it. */
  two_factor?: { enabled: boolean; required: boolean };
  roles: string[];
  /** Permission keys from all roles (Team & roles). The API checks them again on every request. */
  permissions?: string[];
  /** Has a role that covers every facility (otherwise only assigned facilities). */
  sees_all_facilities?: boolean;
  /** Has a console role (not only "patient"). */
  is_team_member?: boolean;
  /** Assigned facilities (facility staff). */
  facilities?: Array<{ id: string; name: string }>;
};

/** Either signed in, or the password was right and a two-factor code is needed next. */
export type SignInResult = { user?: CurrentUser; two_factor_required?: boolean; method?: 'app' | 'email'; sent_to?: string };

/** Second sign-in step: a 6-digit code from the authenticator app, or a recovery code. */
export function useTwoFactorChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { code?: string; recovery_code?: string; remember_device?: boolean }) => apiRequest<{ user: CurrentUser }>('/auth/two-factor', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(['me'], user);
      // Then load the full profile (facilities, permissions) in the background.
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/** Email a new sign-in code (email method; one every 30 seconds). */
export function useResendTwoFactorCode() {
  return useMutation({ mutationFn: () => apiRequest<{ sent: boolean }>('/auth/two-factor/resend', { method: 'POST', body: '{}' }) });
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => apiRequest<CurrentUser>('/me'), staleTime: 60_000 });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string; remember?: boolean }) => {
      await ensureCsrfCookie();

      return apiRequest<SignInResult>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    },
    onSuccess: (result) => {
      if (result.user) {
        queryClient.setQueryData(['me'], result.user);
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<null>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      disconnectEcho();
      queryClient.clear();
    },
  });
}

/** Has any of these permissions (through any role). */
export function can(user: CurrentUser | undefined | null, ...permissions: string[]): boolean {
  return user?.permissions?.some((permission) => permissions.includes(permission)) ?? false;
}

export function hasRole(user: CurrentUser | undefined, ...roles: string[]): boolean {
  return user !== undefined && user.roles.some((role) => roles.includes(role));
}
