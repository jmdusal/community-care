import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';

/** Asks why a request is declined or cancelled; the note is emailed to the patient. */
export function ReasonModal({ open, title, onClose, onSubmit, pending }: { open: boolean; title: string; onClose: () => void; onSubmit: (reason: string) => void; pending: boolean }) {
  const [reason, setReason] = useState('');

  useEffect(() => setReason(''), [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="The patient sees this note in the email. Don't include medical details."
      footer={<><Button onClick={onClose}>Back</Button><Button type="submit" form="reason-form" variant="danger" disabled={pending || reason.trim().length < 3}>{title}</Button></>}
    >
      <form id="reason-form" onSubmit={submit}>
        <Field label="Reason"><textarea required rows={3} maxLength={300} className={`${inputClass} h-auto py-2`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. The doctor is unavailable that day. Please choose another time." /></Field>
      </form>
    </Modal>
  );
}
