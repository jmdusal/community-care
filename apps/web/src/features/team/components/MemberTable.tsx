import { Avatar } from '../../../components/ui/Avatar';
import { ActionsHeader, RowActions } from '../../../components/ui/RowActions';
import { Pill } from '../../../components/ui/Pill';
import { formatDay } from '../../../lib/format';
import { type Member, ROLE_LABELS } from '../api';

const INACTIVE_MS = 45 * 24 * 60 * 60 * 1000;

/** Team members with roles, assignments, 2FA and last activity. */
export function MemberTable({ members, canManage, onEdit }: { members: Member[]; canManage: boolean; onEdit: (member: Member) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">Member</th>
            <th className="px-3 py-2.5 font-medium">Roles</th>
            <th className="px-3 py-2.5 font-medium">Assigned facilities</th>
            <th className="px-3 py-2.5 font-medium">2FA</th>
            <th className="px-3 py-2.5 font-medium">Last active</th>
            {canManage && <ActionsHeader />}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {members.map((member) => {
            const inactive = member.status === 'active' && (!member.last_active_at || Date.now() - new Date(member.last_active_at).getTime() > INACTIVE_MS);

            return (
              <tr key={member.id}>
                <td className="min-w-[220px] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {member.name} {member.is_you && <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">(you)</span>}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">{member.roles.map((role, index) => <Pill key={role} tone={role === 'system_admin' ? 'sky' : role === 'verifier' ? 'violet' : role === 'facility_admin' ? 'teal' : 'zinc'}>{member.role_labels?.[index] ?? ROLE_LABELS[role] ?? role}</Pill>)}</div>
                </td>
                <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400">{member.facilities.map((facility) => facility.name).join(', ') || '—'}</td>
                <td className="px-3 py-3">{member.status === 'invited' ? <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span> : <Pill tone={member.mfa_enabled ? 'emerald' : 'rose'}>{member.mfa_enabled ? 'On' : 'Off'}</Pill>}</td>
                <td className="px-3 py-3 text-xs whitespace-nowrap">
                  {member.status === 'invited' ? <Pill tone="amber">Invited</Pill> : member.status === 'suspended' ? <Pill tone="rose">Suspended</Pill> : <span className={inactive ? 'font-medium text-rose-700' : 'text-zinc-500'}>{formatDay(member.last_active_at)}</span>}
                </td>
                {canManage && <td className="px-4 py-3 text-right">{member.can_edit && <RowActions label={`Actions for ${member.name}`} actions={[{ label: 'Edit member', icon: 'edit', onClick: () => onEdit(member) }]} />}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
