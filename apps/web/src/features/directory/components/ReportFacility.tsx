import { type FormEvent, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { REPORT_REASONS, useReportFacility } from '../../../lib/today';

/** "Report wrong information": anyone can tell the facility team something on this page is wrong. */
export function ReportFacility({ facilityId, facilityName }: { facilityId: string; facilityName: string }) {
  const [open, setOpen] = useState(false);
  const report = useReportFacility(facilityId);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const error = report.error instanceof ApiError ? report.error : null;

  const close = () => {
    setOpen(false);
    if (report.isSuccess) {
      report.reset();
      setReason('');
      setDetails('');
      setContact('');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    report.mutate({ reason, details: details.trim() || undefined, contact: contact.trim() || undefined });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        <Icon name="alert" className="h-3.5 w-3.5" /> Report wrong information
      </button>

      <Modal
        open={open}
        onClose={close}
        title={report.isSuccess ? 'Thank you' : 'What is wrong?'}
        description={report.isSuccess ? undefined : `Tell the ${facilityName} team. No account needed.`}
        footer={report.isSuccess ? <Button variant="primary" onClick={close}>Done</Button> : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button type="submit" form="report-facility" variant="brand" disabled={report.isPending || !reason}>{report.isPending ? 'Sending…' : 'Send report'}</Button>
          </>
        )}
      >
        {report.isSuccess ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">The facility team will check it and fix the page if needed.</p>
        ) : (
          <form id="report-facility" onSubmit={submit} className="space-y-4">
            {error && !error.body.fields && <Alert tone="danger">{error.status === 429 ? 'Too many reports from this connection. Please try again later.' : error.body.message}</Alert>}
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map((item) => (
                <label key={item.value} className={cx('flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2.5 text-sm', reason === item.value ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-700/20 dark:text-brand-100' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300')}>
                  <input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} className="accent-brand-600" />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <Field label={reason === 'other' ? 'What is wrong?' : 'Details (optional)'} error={error?.field('details')}>
              <textarea rows={3} className={cx(inputClass, 'h-auto py-2')} value={details} maxLength={500} onChange={(event) => setDetails(event.target.value)} placeholder="e.g. The number rings out. The right one is 0917…" required={reason === 'other'} />
            </Field>
            <Field label="Your email or mobile (optional)" hint="Only if you are happy for the team to ask you about it.">
              <input className={inputClass} value={contact} maxLength={120} onChange={(event) => setContact(event.target.value)} />
            </Field>
          </form>
        )}
      </Modal>
    </>
  );
}
