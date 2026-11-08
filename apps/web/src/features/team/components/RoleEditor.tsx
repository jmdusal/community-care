import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Segmented } from '../../../components/ui/Segmented';
import { SlideOver } from '../../../components/ui/SlideOver';
import { Toggle } from '../../../components/ui/Toggle';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type PermissionDef, type RoleDef, useDeleteRole, useSaveRole } from '../api';

/** Create a role or change one: name, where it applies, its permissions and the two-factor rule. */
export function RoleEditor({ role, permissions, onClose }: { role: RoleDef | 'new' | null; permissions: PermissionDef[]; onClose: () => void }) {
  const save = useSaveRole();
  const remove = useDeleteRole();
  const existing = role !== 'new' ? role : null;
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'all' | 'assigned'>('assigned');
  const [granted, setGranted] = useState<string[]>([]);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    if (role !== null) {
      setLabel(existing?.label ?? '');
      setDescription(existing?.description ?? '');
      setScope(existing?.scope ?? 'assigned');
      setGranted(existing?.permissions ?? ['facilities.view']);
      setTwoFactor(existing?.requires_two_factor ?? false);
      save.reset();
      remove.reset();
    }
  }, [role]);

  const groups = [...new Set(permissions.map((permission) => permission.group))];
  const available = (permission: PermissionDef) => scope === 'all' || !permission.needs_all_facilities;
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.field(field) : undefined);
  const otherError = save.error instanceof ApiError && !fieldError('label') && !fieldError('permissions') ? save.error.body.message : null;

  const toggle = (key: string, on: boolean) => setGranted((current) => (on ? [...current, key] : current.filter((item) => item !== key)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const allowed = granted.filter((key) => { const p = permissions.find((item) => item.key === key); return p !== undefined && available(p); });
    save.mutate({ name: existing?.name, input: { label: label.trim(), description: description.trim() || null, scope, permissions: allowed, requires_two_factor: twoFactor } }, { onSuccess: onClose });
  };

  return (
    <SlideOver
      open={role !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.label}` : 'New role'}
      description={existing ? `${existing.members} ${existing.members === 1 ? 'member has' : 'members have'} this role. Changes apply to them at once.` : 'Give it to members from the Members tab.'}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {existing && !existing.built_in ? (
            <Button variant="danger" disabled={remove.isPending || existing.members > 0} title={existing.members > 0 ? 'Give its members another role first' : undefined} onClick={() => remove.mutate(existing.name, { onSuccess: onClose })}>Delete role</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" form="role-editor" variant="primary" disabled={save.isPending || label.trim().length < 2}>{save.isPending ? 'Saving…' : existing ? 'Save role' : 'Create role'}</Button>
          </div>
        </div>
      )}
    >
      <form id="role-editor" onSubmit={submit} className="space-y-5">
        {otherError && <Alert tone="danger">{otherError}</Alert>}
        {remove.error instanceof ApiError && <Alert tone="danger">{remove.error.body.message}</Alert>}

        <Field label="Role name" error={fieldError('label')}>
          <input className={inputClass} value={label} onChange={(event) => setLabel(event.target.value)} required minLength={2} maxLength={60} placeholder="e.g. Data encoder" autoFocus />
        </Field>
        <Field label="Description" hint="Shown when choosing roles for a member.">
          <input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} placeholder="What people with this role do" />
        </Field>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Works at</span>
          <Segmented label="Works at" value={scope} onChange={setScope} options={[{ value: 'assigned', label: 'Assigned facilities only' }, { value: 'all', label: 'All facilities' }]} />
          <p className="text-[11px] text-zinc-500">
            {scope === 'assigned' ? 'Members see and act only on the facilities they are assigned to. Some system-wide permissions are not available.' : 'Members see and act on every facility.'}
          </p>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Permissions ({granted.filter((key) => { const p = permissions.find((item) => item.key === key); return p !== undefined && available(p); }).length})</legend>
          {fieldError('permissions') && <p className="text-xs text-rose-700">{fieldError('permissions')}</p>}
          {groups.map((group) => (
            <div key={group} className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{group}</p>
              {permissions.filter((permission) => permission.group === group).map((permission) => {
                const enabled = available(permission);

                return (
                  <label key={permission.key} className={cx('flex items-start gap-2 text-sm', enabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600')}>
                    <input type="checkbox" className="mt-0.5 accent-brand-600" disabled={!enabled} checked={enabled && granted.includes(permission.key)} onChange={(event) => toggle(permission.key, event.target.checked)} />
                    <span>
                      {permission.label}
                      {!enabled && <span className="block text-[11px]">Needs "All facilities"</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </fieldset>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Require two-factor sign-in</p>
            <p className="text-[11px] text-zinc-500">Recommended for roles that approve edits or manage people.</p>
          </div>
          <Toggle checked={twoFactor} onChange={setTwoFactor} label="Require two-factor sign-in" />
        </div>
      </form>
    </SlideOver>
  );
}
