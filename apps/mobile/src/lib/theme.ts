import { colors as tokens } from '@communitycare/design-tokens';

/** Mobile theme built from the shared design tokens (packages/design-tokens). */
export const colors = {
  brand: tokens.brand[600],
  brandDark: tokens.brand[700],
  brandSoft: tokens.brand[50],
  navy: tokens.navy[900],
  text: '#18181b',
  textMuted: '#71717a',
  border: '#e4e4e7',
  surface: '#ffffff',
  background: '#fafafa',
  danger: '#be123c',
  dangerSoft: '#fff1f2',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  success: '#047857',
  successSoft: '#ecfdf5',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { card: 16, control: 12, pill: 999 };

export const font = { small: 12, body: 15, title: 17, heading: 26 };

/** A soft drop shadow for raised surfaces (cards on the brand hero, the tab bar). */
export const shadow = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
