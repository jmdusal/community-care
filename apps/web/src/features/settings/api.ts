import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRaw, apiRequest } from '../../lib/api';

export type SettingValue = number | boolean | string;

export type Setting = {
  key: string;
  value: SettingValue;
  default: SettingValue;
  type: 'int' | 'float' | 'bool' | 'string';
  description: string;
};

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => apiRequest<Setting[]>('/admin/settings') });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Settings saved', error: 'Could not save settings' },
    mutationFn: (changes: Record<string, SettingValue>) =>
      apiRaw<{ data: Setting[]; meta: { changed: string[] } }>('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ settings: Object.entries(changes).map(([key, value]) => ({ key, value })) }),
      }),
    onSuccess: (response) => queryClient.setQueryData(['settings'], response.data),
  });
}

/** Settings grouped by the first part of their key, e.g. "verification", "api". */
export const SETTING_GROUPS: Array<{ prefix: string; title: string; description: string }> = [
  { prefix: 'verification', title: 'Verification', description: 'How records move from verified to stale' },
  { prefix: 'imports', title: 'Imports', description: 'Matching rules applied while staging files' },
  { prefix: 'api', title: 'API & limits', description: 'Rate limits and caps on /api/v1' },
  { prefix: 'features', title: 'Features', description: 'Switches for the AI assistant and the booking pilot' },
  { prefix: 'booking', title: 'Booking pilot', description: 'Limits for appointment requests' },
  { prefix: 'security', title: 'Security', description: 'Account protection' },
];
