import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ensureCsrfCookie } from '../../lib/api';
import type { CurrentUser } from '../auth/useAuth';

export type RegisterInput = { name: string; email: string; mobile: string; password: string; password_confirmation: string; privacy_consent: boolean };

/** Creates a patient account and signs the person in (cookie session). */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await ensureCsrfCookie();

      return apiRequest<{ user: CurrentUser }>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
    },
    onSuccess: ({ user }) => queryClient.setQueryData(['me'], user),
  });
}

/** Staff roles open the admin console; everyone else uses the public account pages. */
export function isStaff(user: CurrentUser | undefined): boolean {
  return user?.is_team_member ?? false;
}
