import type { SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { inputBase } from './Field';

export type Option = { value: string; label: string };

/** Native select (accessible by default) with an optional empty "any" choice. */
export function Select({ options, placeholder, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <select className={cx(inputBase, 'pr-8', /(^|\s)w-/.test(className ?? '') ? className : cx('w-full', className))} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
