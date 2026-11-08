import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { PageHead } from '../../components/ui/PageHead';
import { Panel } from '../../components/ui/Panel';
import { ApiError } from '../../lib/api';
import { can, useMe } from '../auth/useAuth';
import { SETTING_GROUPS, type SettingValue, useSaveSettings, useSettings } from './api';
import { SaveBar } from './components/SaveBar';
import { SettingRow } from './components/SettingRow';

/** Settings screen: one panel per group, edits collected locally and saved together. */
export function SettingsPage() {
  const me = useMe();
  const settings = useSettings();
  const save = useSaveSettings();
  const [draft, setDraft] = useState<Record<string, SettingValue>>({});
  const canEdit = can(me.data, 'settings.manage');
  const error = save.error instanceof ApiError ? save.error : null;

  if (settings.error instanceof ApiError && settings.error.status === 403) {
    return <Alert tone="warning">Only system administrators can view platform settings.</Alert>;
  }

  const list = settings.data ?? [];
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => list.find((setting) => setting.key === key)?.value !== value));

  /** Validation errors come back per list position, e.g. "settings.0.value". */
  const fieldError = (key: string) => {
    const index = Object.keys(changes).indexOf(key);

    return index === -1 ? undefined : error?.field(`settings.${index}.value`);
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHead title="Settings" description="Data-driven platform rules. Every change takes effect immediately and is written to the audit log." />

      {save.isSuccess && Object.keys(changes).length === 0 && <Alert>Saved: {save.data.meta.changed.length ? save.data.meta.changed.join(', ') : 'no values changed'}.</Alert>}

      {SETTING_GROUPS.map((group) => {
        const rows = list.filter((setting) => setting.key.startsWith(`${group.prefix}.`));

        return rows.length === 0 ? null : (
          <Panel key={group.prefix} title={group.title} description={group.description}>
            <div className="border-t border-zinc-100 dark:border-zinc-800">
              {rows.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  value={draft[setting.key] ?? setting.value}
                  error={fieldError(setting.key)}
                  disabled={!canEdit}
                  onChange={(value) => setDraft((current) => ({ ...current, [setting.key]: value }))}
                />
              ))}
            </div>
          </Panel>
        );
      })}

      <SaveBar
        count={Object.keys(changes).length}
        saving={save.isPending}
        onDiscard={() => setDraft({})}
        onSave={() => save.mutate(changes, { onSuccess: () => setDraft({}) })}
      />
    </div>
  );
}
