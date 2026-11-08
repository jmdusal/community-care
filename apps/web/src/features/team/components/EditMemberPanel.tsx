import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Select } from '../../../components/ui/Select';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ApiError } from '../../../lib/api';
import { type Member, type RoleName, useResetTwoFactor, useRoles, useUpdateMember } from '../api';
import { FacilityMultiPicker } from '../../../components/shared/FacilityMultiPicker';
import { useScope } from '../../../lib/scope';
import { needsFacilities, RoleCheckboxes } from './RoleCheckboxes';

function EditForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const update = useUpdateMember(member.id);
  const resetTwoFactor = useResetTwoFactor(member.id);
  const roleDefs = useRoles().data?.data ?? [];
  const { scope } = useScope();
  const [roles, setRoles] = useState<RoleName[]>(member.roles);
  const [status, setStatus] = useState<'active' | 'suspended'>(member.status === 'suspended' ? 'suspended' : 'active');
  const [facilities, setFacilities] = useState(member.facilities);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [mobile, setMobile] = useState(member.mobile ?? '');
  const error = update.error instanceof ApiError ? update.error : null;
  const emailChanged = email.trim().toLowerCase() !== member.email;

  const save = () => update.mutate(
    {
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim() || null,
      roles,
      status: member.status === 'invited' ? undefined : status,
      facility_ids: facilities.map((facility) => facility.id),
    },
    { onSuccess: onDone },
  );

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Details</h3>
        <Field label="Full name" error={error?.field('name')}><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Email" hint={emailChanged ? 'Changing the sign-in email signs them out of their other devices.' : undefined} error={error?.field('email')}>
          <input type="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Mobile (optional)" error={error?.field('mobile')}><input type="tel" className={inputClass} placeholder="0917 123 4567" value={mobile} onChange={(event) => setMobile(event.target.value)} /></Field>
      </section>

      <section className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Access</h3>
        <RoleCheckboxes value={roles} onChange={setRoles} roles={roleDefs} />
      {member.status !== 'invited' && (
        <Field label="Status" hint="Suspending signs the member out of every device.">
          <Select value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'suspended')} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        </Field>
      )}
      {needsFacilities(roles, roleDefs) && <FacilityMultiPicker value={facilities} onChange={setFacilities} scope={scope} />}
      </section>
      {error && !error.field('name') && !error.field('email') && !error.field('mobile') && <p className="text-xs text-rose-700">{error.field('roles') ?? error.body.message}</p>}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button
          variant="primary"
          disabled={roles.length === 0 || name.trim() === '' || email.trim() === '' || update.isPending}
          onClick={save}
        >
          Save changes
        </Button>
      </div>
      {member.mfa_enabled && (
        <section className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Two-factor sign-in</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">On. If they lost their phone, reset it: they are signed out everywhere and set it up again at their next sign-in.</p>
          <Button variant="danger" className="h-8 text-xs" disabled={resetTwoFactor.isPending || resetTwoFactor.isSuccess} onClick={() => resetTwoFactor.mutate()}>
            {resetTwoFactor.isSuccess ? 'Two-factor reset' : 'Reset two-factor'}
          </Button>
        </section>
      )}
      <p className="text-[11px] text-zinc-500">Every change is written to the audit log.</p>
    </div>
  );
}

/** Side panel to edit a member's details, roles, status and facility assignments (admin only). */
export function EditMemberPanel({ member, onClose }: { member: Member | null; onClose: () => void }) {
  return (
    <SlideOver open={member !== null} onClose={onClose} title={member ? `Edit ${member.name}` : 'Edit member'} description={member?.email}>
      {member && <EditForm key={member.id} member={member} onDone={onClose} />}
    </SlideOver>
  );
}
