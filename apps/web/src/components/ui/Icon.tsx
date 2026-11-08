const paths = {
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z',
  building: 'M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16m0-10h2a2 2 0 012 2v8M8 7h4M8 11h4M8 15h4M2 21h20',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6l2-8z',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  megaphone: 'M11 5L6 9H3v6h3l5 4V5zm4.5 3.5a5 5 0 010 7',
  users: 'M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a3 3 0 100-6 3 3 0 000 6zm13 9v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7l1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2l-1.4-1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  right: 'M9 18l6-6-6-6',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  upload: 'M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 4v12m0-12L8 8m4-4l4 4',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM7 7h.01M17 7h.01M7 17h.01',
  search: 'M21 21l-4.3-4.3M18 11a7 7 0 11-14 0 7 7 0 0114 0z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  mail: 'M4 6h16v12H4zM4 6l8 7 8-7',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
  clock: 'M12 7v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  navigation: 'M3 11l18-8-8 18-2-8-8-2z',
  locate: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3m0 14v3M2 12h3m14 0h3',
  x: 'M18 6L6 18M6 6l12 12',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.8 10.8 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2',
  shield: 'M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6l8-3zm-3 9l2 2 4-4',
  calendar: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 7h2m4 0h2m-8 4h2m4 0h2',
  bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a2 2 0 003.4 0',
  refresh: 'M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0012.2 2.4M18.4 9A7 7 0 006.2 6.6L4 10m16 4l-2.2 3.4',
  tag: 'M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9zm5-4.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3',
  plus: 'M12 5v14M5 12h14',
  user: 'M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zm9-13l4 4',
  archive: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
