/** "Nov 8, 2:30 PM" in the viewer's locale for the Philippines. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "Nov 8, 2026". */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
