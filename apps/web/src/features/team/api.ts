import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList, apiRaw, apiRequest, type Paginated } from '../../lib/api';

/** A role's name: a built-in one (system_admin, verifier, facility_admin, facility_staff) or a custom role. */
export type RoleName = string;

export type Member = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  status: 'active' | 'invited' | 'suspended';
  mfa_enabled: boolean;
  last_active_at: string | null;
  created_at: string;
  roles: RoleName[];
  role_labels?: string[];
  facilities: Array<{ id: string; name: string }>;
  is_you: boolean;
  /** The signed-in person may edit this member (server-decided). */
  can_edit: boolean;
};

export type MembersResponse = Paginated<Member> & { meta: { access_review: { inactive_45_days: number; without_mfa: number } } };

export const ROLE_LABELS: Record<string, string> = { system_admin: 'System admin', verifier: 'Verifier', facility_admin: 'Facility admin', facility_staff: 'Facility staff' };

/** What each role means, shown next to the role choices. */
export const ROLE_HINTS: Record<string, string> = {
  system_admin: 'Everything, everywhere. Their facility edits go live at once.',
  verifier: 'Reviews and verifies facilities everywhere; imports data.',
  facility_admin: 'Full control of their assigned facilities, including their staff.',
  facility_staff: 'Updates their assigned facilities; edits need approval.',
};

/** Staff members; with a top-bar scope, only those assigned to that facility or region. */
export function useMembers(scope: Record<string, string> = {}, page = 1) {
  const query = new URLSearchParams({ per_page: String(PAGE_SIZE), page: String(page), ...scope });

  return useQuery({ queryKey: ['members', scope, page], queryFn: () => apiList<Member>(`/admin/users?${query}`) as Promise<MembersResponse>, placeholderData: keepPreviousData });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => void queryClient.invalidateQueries({ queryKey: ['members'] });
}

export function useInvite() {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (_d, v) => `Invitation sent to ${(v as { email: string }).email}`, error: 'Could not send the invitation' },
    mutationFn: (input: { name: string; email: string; roles: RoleName[]; facility_ids: string[] }) => apiRequest<Member>('/admin/users', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateMember(id: string) {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: 'Member updated', error: 'Could not update the member' },
    mutationFn: (input: { name?: string; email?: string; mobile?: string | null; roles?: RoleName[]; status?: 'active' | 'suspended'; facility_ids?: string[] }) => apiRequest<Member>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

/** A member lost their phone: turn off their two-factor sign-in and sign them out everywhere. */
export function useResetTwoFactor(id: string) {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: 'Two-factor sign-in reset. They set it up again at their next sign-in.', error: 'Could not reset two-factor sign-in' }, mutationFn: () => apiRequest<Member>(`/admin/users/${id}/two-factor/reset`, { method: 'POST' }), onSuccess: invalidate });
}

export type PermissionDef = { key: string; label: string; group: string; needs_all_facilities: boolean };

export type RoleDef = {
  name: RoleName;
  label: string;
  description: string | null;
  /** all = every facility; assigned = only the member's assigned facilities. */
  scope: 'all' | 'assigned';
  permissions: string[];
  requires_two_factor: boolean;
  built_in: boolean;
  /** System admin: always everything, cannot be edited. */
  locked: boolean;
  members: number;
  /** The signed-in person may give this role to a member. */
  grantable: boolean;
};

type RolesResponse = { data: RoleDef[]; meta: { permissions: PermissionDef[]; can_manage: boolean } };

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => apiRaw<RolesResponse>('/admin/roles'), staleTime: 30_000 });
}

export type RoleInput = { label: string; description: string | null; scope: 'all' | 'assigned'; permissions: string[]; requires_two_factor: boolean };

export function useSaveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (_d, v) => ((v as { name?: string }).name ? 'Role saved. Members with it have the new permissions now.' : 'Role created'), error: 'Could not save the role' },
    mutationFn: ({ name, input }: { name?: string; input: RoleInput }) =>
      apiRequest<RoleDef>(name ? `/admin/roles/${name}` : '/admin/roles', { method: name ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      // The signed-in person's own permissions may have changed.
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Role deleted', error: 'Could not delete the role' },
    mutationFn: (name: string) => apiRaw<null>(`/admin/roles/${name}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}
