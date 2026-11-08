import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { type AppNotification, useLiveNotifications, useMarkRead, useNotifications } from '../../lib/notifications';
import { cx } from '../../lib/cx';
import { Icon } from '../ui/Icon';

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);

  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
};

/** The bell: unread count, recent notifications, and a toast when one arrives live. */
export function NotificationBell({ userPublicId }: { userPublicId: string }) {
  const navigate = useNavigate();
  const list = useNotifications(true);
  const markRead = useMarkRead();
  const live = useLiveNotifications(userPublicId);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = list.data?.meta.unread ?? 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Toasts disappear by themselves after a few seconds.
  useEffect(() => {
    if (!live.latest) {
      return;
    }
    const timer = setTimeout(live.dismiss, 7000);

    return () => clearTimeout(timer);
  }, [live.latest]);

  const openItem = (item: Pick<AppNotification, 'id' | 'path'>, alreadyRead = false) => {
    if (!alreadyRead) {
      markRead.mutate(item.id);
    }
    setOpen(false);
    live.dismiss();
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-control p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-700 px-1 text-[10px] font-semibold text-white tabular-nums">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-40 mt-1.5 w-80 overflow-hidden rounded-card border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
              Notifications
              <span title={live.connected ? 'Live updates on' : 'Live updates off (Reverb not running); refreshes when you open this'} className={cx('h-1.5 w-1.5 rounded-full', live.connected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600')} />
            </span>
            {unread > 0 && <button type="button" onClick={() => markRead.mutate('all')} className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-100">Mark all read</button>}
          </div>
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {(list.data?.data ?? []).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openItem(item, item.read)} className={cx('flex w-full gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60', !item.read && 'bg-brand-50/50 dark:bg-brand-700/10')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-brand-600')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</span>
                    <span className="block text-xs text-zinc-600 dark:text-zinc-400">{item.body}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">{timeAgo(item.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
            {list.data && list.data.data.length === 0 && <li className="px-4 py-8 text-center text-sm text-zinc-500">You're all caught up.</li>}
          </ul>
        </div>
      )}

      {/* Rendered on <body>: the header's backdrop blur would otherwise trap a fixed element inside it. */}
      {live.latest && createPortal(
        <div role="status" className="fixed right-4 bottom-4 z-50 w-80 rounded-card border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100"><Icon name="bell" className="h-3.5 w-3.5" /></span>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => live.latest && openItem(live.latest)}>
              <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{live.latest.title}</span>
              <span className="block text-xs text-zinc-600 dark:text-zinc-400">{live.latest.body}</span>
            </button>
            <button type="button" aria-label="Dismiss" onClick={live.dismiss} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"><Icon name="x" className="h-3.5 w-3.5" /></button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
