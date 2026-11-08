import { type RoleDef, type RoleName } from '../api';

/**
 * Role selection; at least one role is required by the API. Offers the roles the signed-in
 * person may give; a role the member already has but you cannot give stays visible, locked.
 */
export function RoleCheckboxes({ value, onChange, roles, disabled }: { value: RoleName[]; onChange: (value: RoleName[]) => void; roles: RoleDef[]; disabled?: boolean }) {
  const shown = roles.filter((role) => role.grantable || value.includes(role.name));

  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">Roles</legend>
      {shown.map((role) => (
        <label key={role.name} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5 accent-brand-600"
            disabled={!role.grantable}
            checked={value.includes(role.name)}
            onChange={(event) => onChange(event.target.checked ? [...value, role.name] : value.filter((item) => item !== role.name))}
          />
          <span>
            {role.label}
            <span className="block text-[11px] text-zinc-500">
              {role.description ?? `${role.permissions.length} permissions`} · {role.scope === 'all' ? 'all facilities' : 'assigned facilities only'}
              {!role.grantable && ' · only someone with more access can change this'}
            </span>
          </span>
        </label>
      ))}
      {shown.length === 0 && <p className="text-xs text-zinc-500">Loading roles…</p>}
    </fieldset>
  );
}

/** Roles that work only at assigned facilities need facility assignments. */
export function needsFacilities(selected: RoleName[], roles: RoleDef[]): boolean {
  return roles.some((role) => selected.includes(role.name) && role.scope === 'assigned');
}
