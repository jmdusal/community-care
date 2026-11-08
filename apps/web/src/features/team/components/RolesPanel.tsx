import { Fragment, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Pill } from '../../../components/ui/Pill';
import { type RoleDef, useRoles } from '../api';
import { RoleEditor } from './RoleEditor';

/**
 * Roles & permissions: every role as a column, every permission as a row. People who can
 * "Create and edit roles" add roles and change what each one can do; the API enforces the
 * same permissions on every request.
 */
export function RolesPanel() {
  const roles = useRoles();
  const [editing, setEditing] = useState<RoleDef | 'new' | null>(null);
  const list = roles.data?.data ?? [];
  const permissions = roles.data?.meta.permissions ?? [];
  const canManage = roles.data?.meta.can_manage ?? false;
  const groups = [...new Set(permissions.map((permission) => permission.group))];

  if (roles.isPending) {
    return <p className="p-5 text-sm text-zinc-500">Loading roles…</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          A role is a set of permissions that applies to <strong>all facilities</strong> or only to the member's <strong>assigned facilities</strong>.
          {canManage ? ' Click a role to change it.' : ' Only a system admin can change roles.'}
        </p>
        {canManage && <Button variant="primary" className="shrink-0" onClick={() => setEditing('new')}><Icon name="plus" /> New role</Button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-950/40">
              <th className="sticky left-0 bg-zinc-50 px-5 py-3 text-left font-medium dark:bg-zinc-950">Permission</th>
              {list.map((role) => (
                <th key={role.name} className="min-w-[120px] px-3 py-3 text-center align-bottom font-medium">
                  <button
                    type="button"
                    disabled={!canManage || role.locked}
                    onClick={() => setEditing(role)}
                    className="group inline-flex flex-col items-center gap-1 rounded-control px-2 py-1 enabled:hover:bg-white disabled:cursor-default dark:enabled:hover:bg-zinc-800"
                    title={role.locked ? 'The system admin always has every permission.' : canManage ? `Edit ${role.label}` : undefined}
                  >
                    <span className="font-semibold whitespace-nowrap text-zinc-900 dark:text-zinc-100">{role.label}</span>
                    <Pill tone={role.scope === 'all' ? 'sky' : 'teal'}>{role.scope === 'all' ? 'All facilities' : 'Assigned'}</Pill>
                    <span className="text-[11px] font-normal text-zinc-500">{role.members} {role.members === 1 ? 'member' : 'members'}</span>
                    {canManage && !role.locked && <span className="text-[11px] font-normal text-brand-700 group-hover:underline dark:text-brand-100">Edit</span>}
                    {role.locked && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-zinc-500"><Icon name="lock" className="h-3 w-3" /> Fixed</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="border-t border-zinc-100 dark:border-zinc-800">
            {groups.map((group) => (
              <Fragment key={group}>
                <tr>
                  <th colSpan={list.length + 1} className="bg-white px-5 pt-4 pb-1.5 text-left text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-900">{group}</th>
                </tr>
                {permissions.filter((permission) => permission.group === group).map((permission) => (
                  <tr key={permission.key} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="sticky left-0 min-w-[240px] bg-white px-5 py-2 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {permission.label}
                      {permission.needs_all_facilities && <span className="block text-[11px] text-zinc-500">All-facility roles only</span>}
                    </td>
                    {list.map((role) => (
                      <td key={role.name} className="px-3 py-2 text-center">
                        {role.permissions.includes(permission.key) ? (
                          <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-500" aria-label={`${role.label}: yes`}><Icon name="check" className="h-3 w-3" /></span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600" aria-label={`${role.label}: no`}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="border-t border-zinc-200 dark:border-zinc-700">
              <td className="sticky left-0 bg-white px-5 py-2.5 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">Two-factor sign-in required</td>
              {list.map((role) => <td key={role.name} className="px-3 py-2.5 text-center text-xs text-zinc-600 dark:text-zinc-400">{role.requires_two_factor ? 'Yes' : '—'}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
        <Alert>
          Patients (people who book appointments) have no console access and are not listed. Edits made by roles without "Edits go live without review" always need a second person to approve them.
        </Alert>
      </div>

      <RoleEditor role={editing} permissions={permissions} onClose={() => setEditing(null)} />
    </div>
  );
}
