import { inputBase } from '../../../components/ui/Field';
import { Toggle } from '../../../components/ui/Toggle';
import { cx } from '../../../lib/cx';
import type { Setting, SettingValue } from '../api';

/** The input that matches a setting's type: a switch for booleans, a number field otherwise. */
export function SettingControl({ setting, value, onChange, disabled }: { setting: Setting; value: SettingValue; onChange: (value: SettingValue) => void; disabled?: boolean }) {
  if (setting.type === 'bool') {
    return <Toggle label={setting.description} checked={Boolean(value)} onChange={onChange} disabled={disabled} />;
  }

  return (
    <input
      type="number"
      aria-label={setting.description}
      step={setting.type === 'float' ? '0.1' : '1'}
      disabled={disabled}
      value={String(value)}
      onChange={(event) => onChange(setting.type === 'float' ? Number.parseFloat(event.target.value) : Number.parseInt(event.target.value, 10))}
      className={cx(inputBase, 'w-28 text-right tabular-nums')}
    />
  );
}
