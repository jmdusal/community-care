import type { Setting, SettingValue } from '../api';
import { SettingControl } from './SettingControl';

/** One setting: its description, key, default, any validation error and its control. */
export function SettingRow({ setting, value, error, onChange, disabled }: {
  setting: Setting;
  value: SettingValue;
  error?: string;
  onChange: (value: SettingValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-8 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{setting.description}</div>
        <div className="mt-0.5 text-xs text-zinc-500">
          <code>{setting.key}</code> · default {String(setting.default)}
        </div>
        {error && <div className="mt-1 text-xs text-rose-700">{error}</div>}
      </div>
      <div className="flex shrink-0 sm:justify-end">
        <SettingControl setting={setting} value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}
