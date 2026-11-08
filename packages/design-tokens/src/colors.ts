/**
 * Brand and status colors. Keep in sync with theme.css (the Tailwind v4 theme the web app imports).
 */
export const colors = {
  navy: { 700: '#1a3350', 900: '#13293f' },
  brand: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  status: {
    verified: '#10b981',
    pendingReview: '#f59e0b',
    draft: '#a1a1aa',
    stale: '#f43f5e',
    rejected: '#52525b',
  },
} as const;
