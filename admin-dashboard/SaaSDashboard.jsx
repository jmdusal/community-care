import React, { useState, useMemo, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 * CommunityCare AI — Admin console, SaaS-style variant (mock data)
 * React + Tailwind (darkMode: "class"). No chart/icon libraries.
 * ------------------------------------------------------------------ */

const P = {
  home: "M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z",
  building: "M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16m0-10h2a2 2 0 012 2v8M8 7h4M8 11h4M8 15h4M2 21h20",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6l2-8z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6",
  megaphone: "M11 5L6 9H3v6h3l5 4V5zm4.5 3.5a5 5 0 010 7",
  users: "M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a3 3 0 100-6 3 3 0 000 6zm13 9v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  cog: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  search: "M21 21l-4.3-4.3M18 11a7 7 0 11-14 0 7 7 0 0114 0z",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7l1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2l-1.4-1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.3 13a2 2 0 01-3.4 0",
  chevron: "M8 9l4-4 4 4m0 6l-4 4-4-4",
  right: "M9 18l6-6-6-6",
  up: "M7 17L17 7M17 7H8m9 0v9",
  down: "M7 7l10 10m0 0V8m0 9H8",
  x: "M18 6L6 18M6 6l12 12",
  check: "M5 12l5 5L20 7",
  plus: "M12 5v14M5 12h14",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  clock: "M12 7v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  link: "M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1m2 5a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  alert: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  menu: "M4 6h16M4 12h16M4 18h16",
  dots: "M12 13a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z",
  sidebar: "M4 4h16v16H4zM9 4v16",
  calendar: "M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  upload: "M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 4v12m0-12L8 8m4-4l4 4",
  download: "M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3M12 16V4m0 12l-4-4m4 4l4-4",
  refresh: "M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0012.2 2.4M18.4 9A7 7 0 006.2 6.6L4 10m16 4l-2.2 3.4",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 118 0v3",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  key: "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  file: "M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5zm0 0v5h5",
};

function I({ n, className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  );
}

const cx = (...c) => c.filter(Boolean).join(" ");

// ---------- Data ----------
const NAV = [
  { key: "overview", label: "Overview", icon: "home" },
  { key: "facilities", label: "Facilities", icon: "building" },
  { key: "review", label: "Review queue", icon: "inbox", count: 42 },
  { key: "imports", label: "Imports", icon: "database" },
  { key: "locations", label: "Locations", icon: "pin" },
  { key: "assistant", label: "AI assistant", icon: "spark", tag: "Beta" },
  { key: "programs", label: "Health programs", icon: "megaphone" },
];
const NAV2 = [
  { key: "team", label: "Team & roles", icon: "users" },
  { key: "audit", label: "Audit log", icon: "list" },
  { key: "settings", label: "Settings", icon: "cog" },
];

const STATUS = {
  verified: { label: "Verified", dot: "bg-emerald-500", cls: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" },
  pending_review: { label: "In review", dot: "bg-amber-500", cls: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10" },
  draft: { label: "Draft", dot: "bg-zinc-400", cls: "text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-500/15" },
  stale: { label: "Stale", dot: "bg-rose-500", cls: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10" },
  rejected: { label: "Rejected", dot: "bg-zinc-600", cls: "text-zinc-700 bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-500/25" },
};

const FACILITIES = [
  { id: "FAC-01J8K2", name: "Brgy. San Isidro Health Station", type: "Barangay Health Station", region: "Region IV-A", city: "Antipolo City, Rizal", status: "pending_review", verified: "—", source: "Facility staff", services: ["Immunization", "Prenatal care", "Family planning"], phone: "(02) 8123 4567", hours: "Mon–Fri · 8:00–17:00" },
  { id: "FAC-01H2Z3", name: "Quezon City RHU 3", type: "Rural Health Unit", region: "NCR", city: "Quezon City", status: "verified", verified: "Oct 30, 2026", source: "DOH NHFR", services: ["Primary care", "TB-DOTS", "Immunization", "Dental"], phone: "(02) 8988 4242", hours: "Mon–Sat · 8:00–17:00" },
  { id: "FAC-01J8M1", name: "Cebu Northern Infirmary", type: "Infirmary", region: "Region VII", city: "Danao City, Cebu", status: "pending_review", verified: "—", source: "DOH NHFR", services: ["Emergency", "Inpatient", "Laboratory"], phone: "(032) 200 1188", hours: "24 hours", flag: "Coordinates differ by 1.8 km" },
  { id: "FAC-01G7T5", name: "Marikina City Health Office", type: "Health Center", region: "NCR", city: "Marikina City", status: "verified", verified: "Nov 7, 2026", source: "DOH NHFR", services: ["Primary care", "Animal bite", "Laboratory"], phone: "(02) 8646 2360", hours: "Mon–Fri · 8:00–17:00" },
  { id: "FAC-01E4R8", name: "Davao Riverside Lying-in Clinic", type: "Birthing Home", region: "Region XI", city: "Davao City", status: "stale", verified: "Mar 2, 2026", source: "DOH NHFR", services: ["Prenatal care", "Normal delivery"], phone: "(082) 227 1010", hours: "24 hours" },
  { id: "FAC-01F1Q6", name: "Iloilo City Health Center II", type: "Health Center", region: "Region VI", city: "Iloilo City", status: "verified", verified: "Oct 12, 2026", source: "Data verifier", services: ["Primary care", "Immunization"], phone: "(033) 337 0451", hours: "Mon–Fri · 8:00–17:00" },
  { id: "FAC-01J8P9", name: "Tarlac Provincial Health Office Clinic", type: "Health Center", region: "Region III", city: "Tarlac City", status: "draft", verified: "—", source: "DOH NHFR", services: ["Primary care"], phone: "—", hours: "Not provided", flag: "Possible duplicate of FAC-01C9W2" },
  { id: "FAC-01D3K1", name: "Baguio Barangay Irisan Health Center", type: "Barangay Health Station", region: "CAR", city: "Baguio City", status: "verified", verified: "Sep 28, 2026", source: "DOH NHFR", services: ["Immunization", "Nutrition"], phone: "(074) 442 8800", hours: "Mon–Fri · 8:00–16:00" },
  { id: "FAC-01B8N2", name: "Pasig Wellness Clinic", type: "Clinic", region: "NCR", city: "Pasig City", status: "rejected", verified: "—", source: "Self-submitted", services: ["Consultation"], phone: "(02) 8634 1122", hours: "Mon–Sat · 9:00–18:00", flag: "Rejected: no verifiable source" },
  { id: "FAC-01A2L7", name: "Legazpi City Health Office", type: "Health Center", region: "Region V", city: "Legazpi City, Albay", status: "verified", verified: "Nov 1, 2026", source: "DOH NHFR", services: ["Primary care", "TB-DOTS", "Dental"], phone: "(052) 480 0145", hours: "Mon–Fri · 8:00–17:00" },
];

const RANGES = { "7d": 7, "30d": 30, "90d": 90 };

function series(n, base, amp, seed) {
  return Array.from({ length: n }, (_, i) => Math.round(base + i * (amp / n) * 1.4 + Math.sin(i * 0.9 + seed) * amp * 0.25 + Math.cos(i * 0.37 + seed * 2) * amp * 0.18));
}

const CHECKLIST = [
  { t: "Facility search works across the geographic hierarchy", d: true },
  { t: "Detail pages show source attribution and last-verified date", d: true },
  { t: "Unverified records are never shown as verified", d: true },
  { t: "Repeat imports don't create duplicates", d: true },
  { t: "Admin workflow separates edit, review and publish", d: true },
  { t: "Public APIs don't expose internal fields", d: true },
  { t: "Authorization tests for protected resources", d: true },
  { t: "Mobile app tested on target Android/iOS devices", d: false },
  { t: "Keyboard navigation and accessible labels", d: true },
  { t: "Backup restore and rollback documented", d: false },
  { t: "AI answers evaluated against approved sources", d: false },
  { t: "Privacy notice and data-source terms documented", d: false },
];

const ACTIVITY = [
  { who: "Maria Reyes", init: "MR", c: "bg-violet-500", what: "approved", obj: "Marikina City Health Office", t: "12m" },
  { who: "Import job", init: "⚙", c: "bg-zinc-500", what: "flagged 87 duplicates in", obj: "NHFR batch #214", t: "3h" },
  { who: "Juan Dela Cruz", init: "JD", c: "bg-sky-500", what: "invited", obj: "Ana Villanueva as Verifier", t: "5h" },
  { who: "Rico Santos", init: "RS", c: "bg-amber-500", what: "proposed hours change on", obj: "Brgy. San Isidro HS", t: "6h" },
  { who: "Maria Reyes", init: "MR", c: "bg-violet-500", what: "rejected", obj: "Pasig Wellness Clinic", t: "1d" },
];

// ---------- Primitives ----------
function Badge({ status }) {
  const s = STATUS[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", s.cls)}>
      <span className={cx("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function Panel({ children, className = "" }) {
  return <div className={cx("rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)}>{children}</div>;
}

function PanelHead({ title, desc, right }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
        {desc && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

function Btn({ children, variant = "secondary", className = "", ...p }) {
  const v = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary: "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800",
    ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
    brand: "bg-teal-600 text-white hover:bg-teal-700",
  }[variant];
  return (
    <button className={cx("inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50", v, className)} {...p}>
      {children}
    </button>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cx("px-2.5 h-7 rounded-md text-xs font-medium transition", value === o ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Spark({ data, color }) {
  const w = 100, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const d = data.map((v, i) => `${i ? "L" : "M"}${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-24 h-7">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------- Charts ----------
function AreaChart({ a, b, labels, names = ["Searches", "Profile opens"], scale = 1000 }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const w = 800, h = 220;
  const max = Math.max(...a, ...b) * 1.1;
  const xy = (arr) => arr.map((v, i) => [(i / (arr.length - 1)) * w, h - (v / max) * h]);
  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const pa = xy(a), pb = xy(b);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (a.length - 1));
    setHover(Math.max(0, Math.min(a.length - 1, i)));
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((g) => (
          <div key={g} className="border-t border-dashed border-zinc-200 dark:border-zinc-800" />
        ))}
      </div>
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="relative w-full h-56 cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${names[0]} and ${names[1]} over time`}>
        <defs>
          <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14b8a6" stopOpacity=".28" />
            <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path(pa)} L${w},${h} L0,${h} Z`} fill="url(#ga)" />
        <path d={path(pa)} fill="none" stroke="#14b8a6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={path(pb)} fill="none" stroke="#a1a1aa" strokeWidth="1.75" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      </svg>
      {hover !== null && (
        <>
          <div className="absolute top-0 bottom-6 w-px bg-zinc-300 dark:bg-zinc-600 pointer-events-none" style={{ left: `${(hover / (a.length - 1)) * 100}%` }} />
          <div
            className="absolute top-2 z-10 pointer-events-none rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95"
            style={{ left: `${(hover / (a.length - 1)) * 100}%`, transform: `translateX(${hover > a.length / 2 ? "calc(-100% - 10px)" : "10px"})` }}
          >
            <div className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">{labels[hover]}</div>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300"><span className="w-2 h-2 rounded-full bg-teal-500" />{names[0]} <b className="ml-auto pl-4 tabular-nums">{(a[hover] * scale).toLocaleString()}</b></div>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300"><span className="w-2 h-2 rounded-full bg-zinc-400" />{names[1]} <b className="ml-auto pl-4 tabular-nums">{(b[hover] * scale).toLocaleString()}</b></div>
          </div>
        </>
      )}
      <div className="flex justify-between text-[11px] text-zinc-400 mt-2">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function Donut({ parts }) {
  const total = parts.reduce((s, p) => s + p.v, 0);
  const r = 42, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="11" className="stroke-zinc-100 dark:stroke-zinc-800" />
          {parts.map((p) => {
            const len = (p.v / total) * c;
            const el = <circle key={p.k} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="11" strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${c}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-semibold text-zinc-900 dark:text-white tabular-nums">{Math.round((parts[0].v / total) * 100)}%</div>
            <div className="text-[10px] text-zinc-500">fresh</div>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-xs w-full">
        {parts.map((p) => (
          <li key={p.k} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-zinc-600 dark:text-zinc-400">{p.k}</span>
            <span className="ml-auto tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{p.v.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Overview ----------
function Overview({ range, setRange, openFacility, go }) {
  const n = RANGES[range];
  const a = useMemo(() => series(n, 60, 50, 1), [n]);
  const b = useMemo(() => a.map((v, i) => Math.round(v * (0.66 + Math.sin(i) * 0.04))), [a]);
  const labels = useMemo(() => {
    const end = new Date(2026, 10, 7);
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(end);
      d.setDate(end.getDate() - (n - 1 - i));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
  }, [n]);
  const [tab, setTab] = useState("Directory usage");
  const [checks, setChecks] = useState(CHECKLIST);
  const doneCount = checks.filter((c) => c.d).length;

  const stats = [
    { label: "Published facilities", value: "18,426", delta: "+1.7%", up: true, data: series(12, 40, 10, 2), color: "#14b8a6" },
    { label: "Searches → profile", value: "71.2%", delta: "+3.4%", up: true, data: series(12, 30, 12, 4), color: "#14b8a6" },
    { label: "Median time in review", value: "1.8d", delta: "-0.6d", up: true, data: series(12, 40, -12, 6), color: "#14b8a6" },
    { label: "Stale records", value: "1,208", delta: "+4.1%", up: false, data: series(12, 30, 10, 8), color: "#f43f5e" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Overview</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Directory health across 17 regions · updated 2 minutes ago</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={range} onChange={setRange} options={Object.keys(RANGES)} />
          <Btn variant="primary" onClick={() => go("imports")}><I n="plus" /> New import</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-zinc-900 p-5">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-white">{s.value}</div>
                <span className={cx("mt-1 inline-flex items-center gap-0.5 text-xs font-medium", s.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  <I n={s.delta.startsWith("-") ? "down" : "up"} className="w-3 h-3" /> {s.delta}
                  <span className="text-zinc-400 font-normal ml-1">vs prev.</span>
                </span>
              </div>
              <Spark data={s.data} color={s.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5">
            <div className="flex gap-5 text-sm">
              {["Directory usage", "Data quality", "AI assistant"].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cx("py-3 -mb-px border-b-2 transition", tab === t ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white font-medium" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-teal-500 rounded" />Searches</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t border-dashed border-zinc-400" />Profile opens</span>
            </div>
          </div>
          <div className="p-5">
            {tab === "Directory usage" ? (
              <AreaChart a={a} b={b} labels={labels} />
            ) : tab === "Data quality" ? (
              <div className="grid sm:grid-cols-3 gap-4 py-6">
                {[["96.4%", "records with traceable source"], ["87", "duplicate candidates open"], ["133", "flags from last import"]].map(([v, l]) => (
                  <div key={l} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-4">
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">{v}</div>
                    <div className="text-xs text-zinc-500 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4 py-6">
                {[["94%", "answers include citations"], ["7%", "honestly said 'no info found'"], ["21", "prompt-injection attempts blocked"]].map(([v, l]) => (
                  <div key={l} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-4">
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-white tabular-nums">{v}</div>
                    <div className="text-xs text-zinc-500 mt-1">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Data freshness" desc="Days since last verification" />
          <div className="px-5 pb-5">
            <Donut parts={[
              { k: "< 90 days", v: 14210, color: "#14b8a6" },
              { k: "90–180 days", v: 2630, color: "#5eead4" },
              { k: "> 180 days (stale)", v: 1208, color: "#f43f5e" },
              { k: "Never verified", v: 440, color: "#a1a1aa" },
            ]} />
            <p className="mt-5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              "Verified" is our own review state, not a DOH license or accreditation.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel className="xl:col-span-2">
          <PanelHead title="Needs attention" desc="Highest-impact items in the review queue" right={<Btn variant="ghost" onClick={() => go("review")}>View queue <I n="right" className="w-3.5 h-3.5" /></Btn>} />
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
            {FACILITIES.filter((f) => f.flag || f.status === "pending_review").slice(0, 5).map((f) => (
              <li key={f.id}>
                <button onClick={() => openFacility(f)} className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                  <Avatar name={f.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{f.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{f.flag || "Correction submitted by facility staff"}</div>
                  </div>
                  <span className="hidden sm:block text-xs text-zinc-400">{f.city}</span>
                  <Badge status={f.status} />
                  <I n="right" className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead title="Pilot launch checklist" desc={`${doneCount} of ${checks.length} complete`} />
          <div className="px-5">
            <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
            </div>
          </div>
          <ul className="p-3 max-h-72 overflow-y-auto">
            {checks.map((c, i) => (
              <li key={c.t}>
                <label className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                  <input type="checkbox" checked={c.d} onChange={() => setChecks((cs) => cs.map((x, j) => (j === i ? { ...x, d: !x.d } : x)))} className="mt-0.5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 accent-teal-600" />
                  <span className={cx("text-xs leading-snug", c.d ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300")}>{c.t}</span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel>
          <PanelHead title="Imports" desc="Staged before publishing" right={<Btn variant="ghost" onClick={() => go("imports")}>All imports <I n="right" className="w-3.5 h-3.5" /></Btn>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
                {[
                  ["#215", "PSA PSGC · Q3 release", "Running", "64%", "text-sky-600 dark:text-sky-400"],
                  ["#214", "DOH NHFR · full extract", "Needs review", "133 flags", "text-amber-600 dark:text-amber-400"],
                  ["#213", "Facility corrections", "Completed", "214 rows", "text-emerald-600 dark:text-emerald-400"],
                  ["#212", "DOH NHFR · delta", "Failed", "Schema mismatch", "text-rose-600 dark:text-rose-400"],
                ].map(([id, src, st, meta, color]) => (
                  <tr key={id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="pl-5 py-3 font-mono text-xs text-zinc-400">{id}</td>
                    <td className="px-3 py-3 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{src}</td>
                    <td className={cx("px-3 py-3 text-xs font-medium whitespace-nowrap", color)}>● {st}</td>
                    <td className="pr-5 py-3 text-xs text-zinc-500 text-right whitespace-nowrap">{meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Activity" desc="From the audit log" />
          <ul className="px-5 pb-4 space-y-3.5">
            {ACTIVITY.map((x, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cx("grid place-items-center w-6 h-6 rounded-full text-[10px] font-semibold text-white shrink-0", x.c)}>{x.init}</span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 flex-1">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{x.who}</span> {x.what} <span className="text-zinc-900 dark:text-zinc-100">{x.obj}</span>
                </p>
                <span className="text-xs text-zinc-400 tabular-nums">{x.t}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Avatar({ name }) {
  const initials = name.replace(/^Brgy\.\s*/, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hues = ["bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300", "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300", "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300", "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"];
  const h = hues[name.length % hues.length];
  return <span className={cx("grid place-items-center w-8 h-8 rounded-lg text-[11px] font-semibold shrink-0", h)}>{initials}</span>;
}

// ---------- Facilities ----------
function Facilities({ rows, openFacility }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("All regions");
  const [selected, setSelected] = useState([]);

  const regions = ["All regions", ...Array.from(new Set(rows.map((f) => f.region)))];
  const filtered = rows.filter((f) =>
    (status === "all" || f.status === status) &&
    (region === "All regions" || f.region === region) &&
    (f.name + f.city + f.id).toLowerCase().includes(q.toLowerCase())
  );
  const counts = rows.reduce((m, f) => ({ ...m, [f.status]: (m[f.status] || 0) + 1 }), {});
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Facilities</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">18,426 published · showing sample of {rows.length}</p>
        </div>
        <div className="flex gap-2">
          <Btn>Export CSV</Btn>
          <Btn variant="primary"><I n="plus" /> Add facility</Btn>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {[["all", "All", rows.length], ...Object.keys(STATUS).map((k) => [k, STATUS[k].label, counts[k] || 0])].map(([k, l, c]) => (
          <button key={k} onClick={() => setStatus(k)} className={cx("flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-sm whitespace-nowrap transition", status === k ? "border-teal-500 text-zinc-900 dark:text-white font-medium" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>
            {l}
            <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 text-[11px] tabular-nums text-zinc-500">{c}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 w-full sm:w-72 focus-within:ring-2 focus-within:ring-teal-500/40">
            <I n="search" className="w-4 h-4 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city or ID" className="bg-transparent outline-none text-sm flex-1 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400" />
          </label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm px-2 text-zinc-700 dark:text-zinc-200 outline-none">
            {regions.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Btn variant="ghost"><I n="filter" /> More filters</Btn>
          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-zinc-500">{selected.length} selected</span>
              <Btn onClick={() => setSelected([])}>Clear</Btn>
              <Btn variant="brand">Send to review</Btn>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <th className="pl-4 pr-2 py-2.5 w-8"><input type="checkbox" className="accent-teal-600" checked={selected.length === filtered.length && filtered.length > 0} onChange={(e) => setSelected(e.target.checked ? filtered.map((f) => f.id) : [])} aria-label="Select all" /></th>
                <th className="px-2 py-2.5 font-medium">Facility</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Region</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Last verified</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="pr-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
              {filtered.map((f) => (
                <tr key={f.id} onClick={() => openFacility(f)} className={cx("cursor-pointer transition", selected.includes(f.id) ? "bg-teal-50/60 dark:bg-teal-500/5" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>
                  <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="accent-teal-600" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                  </td>
                  <td className="px-2 py-3 min-w-[260px]">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.name} />
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{f.name}</div>
                        <div className="text-xs text-zinc-500 truncate">{f.city} · <span className="font-mono">{f.id}</span></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{f.type}</td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{f.region}</td>
                  <td className="px-3 py-3"><Badge status={f.status} /></td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap tabular-nums">{f.verified}</td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{f.source}</td>
                  <td className="pr-4 py-3 text-zinc-400"><I n="dots" /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-zinc-500">No facilities match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <span>Showing {filtered.length} of 18,426</span>
          <div className="flex gap-1.5">
            <Btn className="h-7 text-xs" disabled>Previous</Btn>
            <Btn className="h-7 text-xs">Next</Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ---------- Facility drawer ----------
function FacilityDrawer({ f, onClose, onDecide }) {
  const open = !!f;
  return (
    <>
      <div onClick={onClose} className={cx("fixed inset-0 z-40 bg-zinc-950/30 backdrop-blur-[1px] transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      <aside className={cx("fixed z-50 inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")} aria-hidden={!open}>
        {f && (
          <>
            <div className="flex items-start gap-3 p-5 border-b border-zinc-200 dark:border-zinc-800">
              <Avatar name={f.name} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white leading-snug">{f.name}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{f.type} · <span className="font-mono">{f.id}</span></p>
                <div className="mt-2"><Badge status={f.status} /></div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><I n="x" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
              {f.flag && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs">
                  <I n="alert" className="w-4 h-4 shrink-0" /> {f.flag}
                </div>
              )}

              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Public details</h4>
                <dl className="space-y-2.5">
                  {[["pin", f.city + ", " + f.region], ["phone", f.phone], ["clock", f.hours]].map(([ic, v]) => (
                    <div key={ic} className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300"><I n={ic} className="w-4 h-4 text-zinc-400" />{v}</div>
                  ))}
                </dl>
              </section>

              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Listed services</h4>
                <div className="flex flex-wrap gap-1.5">
                  {f.services.map((s) => <span key={s} className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">{s}</span>)}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Provenance</h4>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[["Source", f.source], ["Source record", "NHFR-" + f.id.slice(-5)], ["Imported", "Nov 7, 2026 · batch #214"], ["Last verified", f.verified]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-3 py-2 text-xs">
                      <span className="text-zinc-500">{k}</span>
                      <span className="text-zinc-800 dark:text-zinc-200 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">History</h4>
                <ol className="relative border-l border-zinc-200 dark:border-zinc-800 ml-1 space-y-4">
                  {[["Submitted for review", "Rico Santos · facility staff", "6h ago"], ["Hours edited", "Rico Santos", "6h ago"], ["Imported from NHFR", "Import job #214", "Nov 7"]].map(([t, by, when]) => (
                    <li key={t} className="ml-4">
                      <span className="absolute -left-[4.5px] mt-1 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <div className="text-zinc-800 dark:text-zinc-200 text-xs font-medium">{t}</div>
                      <div className="text-[11px] text-zinc-500">{by} · {when}</div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="flex gap-2 p-4 border-t border-zinc-200 dark:border-zinc-800">
              <Btn className="flex-1" onClick={() => onDecide(f, "rejected")}>Reject</Btn>
              <Btn variant="brand" className="flex-1" onClick={() => onDecide(f, "verified")}><I n="check" /> Approve & publish</Btn>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// ---------- Command palette ----------
function CommandPalette({ open, onClose, go, openFacility }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current && inputRef.current.focus(), 10);
    }
  }, [open]);
  if (!open) return null;
  const pages = [...NAV, ...NAV2].filter((n) => n.label.toLowerCase().includes(q.toLowerCase()));
  const facs = FACILITIES.filter((f) => q && f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <I n="search" className="w-4 h-4 text-zinc-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages and facilities…" className="flex-1 h-12 bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400" />
          <kbd className="text-[10px] text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {facs.length > 0 && <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-zinc-400">Facilities</div>}
          {facs.map((f) => (
            <button key={f.id} onClick={() => { openFacility(f); onClose(); }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Avatar name={f.name} />
              <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 truncate">{f.name}</span>
              <Badge status={f.status} />
            </button>
          ))}
          <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-zinc-400">Go to</div>
          {pages.map((p) => (
            <button key={p.key} onClick={() => { go(p.key); onClose(); }} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <I n={p.icon} className="w-4 h-4 text-zinc-400" /> {p.label}
            </button>
          ))}
          {pages.length === 0 && facs.length === 0 && <div className="py-8 text-center text-sm text-zinc-500">No results for "{q}"</div>}
        </div>
      </div>
    </div>
  );
}

// ================================================================== //
//  Shared page primitives
// ================================================================== //
const inpBase = "h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-teal-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const inp = inpBase + " w-full";

const PILL = {
  teal: "text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-500/10",
  emerald: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
  amber: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10",
  rose: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10",
  sky: "text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10",
  violet: "text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10",
  zinc: "text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-500/15",
};

function Pill({ tone = "zinc", dot, children }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", PILL[tone])}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

function PageHead({ title, desc, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
        {desc && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function StatStrip({ items }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
      {items.map(([label, value, sub, tone]) => (
        <div key={label} className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
          <div className={cx("mt-1.5 text-xl font-semibold tracking-tight tabular-nums", tone || "text-zinc-900 dark:text-white")}>{value}</div>
          {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {items.map(([k, l, c]) => (
        <button key={k} onClick={() => onChange(k)} className={cx("flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-sm whitespace-nowrap transition", value === k ? "border-teal-500 text-zinc-900 dark:text-white font-medium" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300")}>
          {l}
          {c !== undefined && <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 text-[11px] tabular-nums text-zinc-500">{c}</span>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={cx("relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed", on ? "bg-teal-600" : "bg-zinc-300 dark:bg-zinc-700")}>
      <span className={cx("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", on && "translate-x-4")} />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-500 mt-1">{hint}</span>}
    </label>
  );
}

function Modal({ open, onClose, title, desc, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
          {desc && <p className="text-xs text-zinc-500 mt-1">{desc}</p>}
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-200 bg-zinc-50 rounded-b-xl dark:border-zinc-800 dark:bg-zinc-950/40">{footer}</div>
      </div>
    </div>
  );
}

function SlideOver({ open, onClose, title, desc, children, footer }) {
  return (
    <>
      <div onClick={onClose} className={cx("fixed inset-0 z-40 bg-zinc-950/30 transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      <aside className={cx("fixed z-50 inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")} aria-hidden={!open}>
        <div className="flex items-start gap-3 p-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
            {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><I n="x" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">{open && children}</div>
        {footer && <div className="flex gap-2 p-4 border-t border-zinc-200 dark:border-zinc-800">{footer}</div>}
      </aside>
    </>
  );
}

function KV({ rows }) {
  return (
    <dl className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-3 py-2 text-xs">
          <dt className="text-zinc-500 shrink-0">{k}</dt>
          <dd className="text-zinc-800 dark:text-zinc-200 text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ================================================================== //
//  Imports
// ================================================================== //
const PIPELINE = ["Acquire", "Stage", "Normalize", "Match", "Flag", "Review", "Publish"];
const IMP = {
  running: { label: "Running", tone: "sky" },
  needs_review: { label: "Needs review", tone: "amber" },
  completed: { label: "Completed", tone: "emerald" },
  failed: { label: "Failed", tone: "rose" },
};
const BATCHES = [
  { id: "#215", source: "PSA PSGC", label: "Q3 2026 release", kind: "Geography", started: "Nov 7, 11:40", by: "Juan Dela Cruz", status: "running", step: 2, progress: 64, file: "psgc_2026q3.xlsx · 18.2 MB", version: "2026-Q3", terms: "Public data · attribution required", stats: { new: 14, updated: 1204, unchanged: 28184, duplicates: 0, conflicts: 0, errors: 0 } },
  { id: "#214", source: "DOH NHFR", label: "Full extract", kind: "Facilities", started: "Nov 7, 09:12", by: "Scheduled job", status: "needs_review", step: 5, progress: 100, file: "nhfr_export_20261107.csv · 9.6 MB", version: "2026-11-07", terms: "Confirm redistribution terms before publishing", stats: { new: 312, updated: 1480, unchanged: 17025, duplicates: 87, conflicts: 46, errors: 0 } },
  { id: "#213", source: "Facility staff", label: "Self-service corrections", kind: "Facilities", started: "Nov 6, 18:00", by: "Nightly job", status: "completed", step: 7, progress: 100, file: "—", version: "—", terms: "Submitted by authorized facility staff", stats: { new: 0, updated: 211, unchanged: 0, duplicates: 0, conflicts: 3, errors: 0 } },
  { id: "#212", source: "DOH NHFR", label: "Delta", kind: "Facilities", started: "Nov 3, 09:00", by: "Scheduled job", status: "failed", step: 1, progress: 22, file: "nhfr_delta_20261103.csv · 412 KB", version: "2026-11-03", terms: "Confirm redistribution terms before publishing", error: "Stage failed: column 'facility_code' is missing from the source file (adapter nhfr-v2 expects it). No published records were changed.", stats: { new: 0, updated: 0, unchanged: 0, duplicates: 0, conflicts: 0, errors: 1 } },
  { id: "#211", source: "DOH NHFR", label: "Delta", kind: "Facilities", started: "Oct 27, 09:00", by: "Scheduled job", status: "completed", step: 7, progress: 100, file: "nhfr_delta_20261027.csv · 388 KB", version: "2026-10-27", terms: "Confirm redistribution terms before publishing", stats: { new: 41, updated: 980, unchanged: 0, duplicates: 6, conflicts: 2, errors: 0 } },
];

function Stepper({ b }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <ol className="flex min-w-[520px]">
        {PIPELINE.map((s, i) => {
          const failed = b.status === "failed" && i === b.step;
          const done = b.status === "completed" || i < b.step;
          const current = !done && !failed && i === b.step;
          return (
            <li key={s} className="relative flex-1 flex flex-col items-center text-center">
              {i > 0 && <span className={cx("absolute top-3 right-1/2 w-full h-0.5", done || i <= b.step ? "bg-teal-500" : "bg-zinc-200 dark:bg-zinc-700")} />}
              <span className={cx("relative z-10 grid place-items-center w-6 h-6 rounded-full text-[10px] font-semibold ring-4 ring-white dark:ring-zinc-900", done ? "bg-teal-600 text-white" : failed ? "bg-rose-500 text-white" : current ? "bg-white text-teal-700 border-2 border-teal-500 dark:bg-zinc-900 dark:text-teal-300" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800")}>
                {done ? <I n="check" className="w-3 h-3" /> : failed ? "!" : i + 1}
              </span>
              <span className={cx("mt-1.5 text-[11px]", current ? "text-teal-700 dark:text-teal-300 font-medium" : failed ? "text-rose-600 dark:text-rose-400 font-medium" : "text-zinc-500")}>{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ImportsPage({ notify, go }) {
  const [sel, setSel] = useState("#214");
  const [modal, setModal] = useState(false);
  const [src, setSrc] = useState("nhfr");
  const [ack, setAck] = useState(false);
  const b = BATCHES.find((x) => x.id === sel);

  return (
    <div className="space-y-6">
      <PageHead title="Imports" desc="Every batch lands in staging first. Nothing is published until it has been reviewed.">
        <Btn onClick={() => notify("Adapter docs would open here")}><I n="file" /> Adapter docs</Btn>
        <Btn variant="primary" onClick={() => { setAck(false); setModal(true); }}><I n="upload" /> New import</Btn>
      </PageHead>

      <StatStrip items={[
        ["Batches this month", "9", "2 scheduled next week"],
        ["Records processed", "64,310", "across all sources"],
        ["Open flags", "133", "87 duplicates · 46 conflicts", "text-amber-600 dark:text-amber-400"],
        ["Failed batches", "1", "#212 · schema mismatch", "text-rose-600 dark:text-rose-400"],
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Panel className="lg:col-span-2 overflow-hidden">
          <PanelHead title="Batch history" desc="Newest first" />
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
            {BATCHES.map((x) => (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} className={cx("w-full text-left px-5 py-3 transition", sel === x.id ? "bg-teal-50/70 dark:bg-teal-500/5" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        <span className="font-mono text-xs text-zinc-400 mr-1.5">{x.id}</span>
                        {x.source} · {x.label}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{x.started} · {x.by}</div>
                    </div>
                    <Pill tone={IMP[x.status].tone} dot>{IMP[x.status].label}</Pill>
                  </div>
                  {x.status === "running" && (
                    <div className="mt-2 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-sky-500 animate-pulse" style={{ width: `${x.progress}%` }} />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-zinc-400">{b.id}</span>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{b.source} · {b.label}</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{b.kind} · started {b.started} by {b.by}</p>
            </div>
            <Pill tone={IMP[b.status].tone} dot>{IMP[b.status].label}{b.status === "running" ? ` · ${b.progress}%` : ""}</Pill>
          </div>
          <div className="p-5 space-y-6">
            <Stepper b={b} />
            {b.error && (
              <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <I n="alert" className="w-4 h-4 shrink-0" />
                <span className="font-mono leading-relaxed">{b.error}</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[["New", b.stats.new], ["Updated", b.stats.updated], ["Unchanged", b.stats.unchanged], ["Duplicate candidates", b.stats.duplicates, "text-violet-600 dark:text-violet-400"], ["Conflicts", b.stats.conflicts, "text-amber-600 dark:text-amber-400"], ["Errors", b.stats.errors, "text-rose-600 dark:text-rose-400"]].map(([l, v, t]) => (
                <div key={l} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
                  <div className="text-[11px] text-zinc-500">{l}</div>
                  <div className={cx("text-lg font-semibold tabular-nums", v ? t || "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600")}>{v.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <KV rows={[["Source file", b.file], ["Source version", b.version], ["Usage terms", b.terms], ["Matching rule", "Source ID first; name + address only proposes duplicates"]]} />
            <div className="flex flex-wrap gap-2">
              {b.status === "needs_review" && <Btn variant="brand" onClick={() => go("review")}>Review {b.stats.duplicates + b.stats.conflicts} flagged records</Btn>}
              {b.status === "failed" && <Btn variant="brand" onClick={() => notify(`Retrying ${b.id} with adapter nhfr-v2`)}><I n="refresh" /> Retry batch</Btn>}
              {b.status === "running" && <Btn onClick={() => notify(`Cancel requested for ${b.id}`)}>Cancel batch</Btn>}
              <Btn onClick={() => notify(`Log for ${b.id} downloaded (sample)`)}><I n="download" /> Download log</Btn>
            </div>
          </div>
        </Panel>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New import"
        desc="Records go to staging tables. Published data is never overwritten directly."
        footer={<>
          <Btn onClick={() => setModal(false)}>Cancel</Btn>
          <Btn variant="primary" disabled={!ack} onClick={() => { setModal(false); notify("Batch #216 queued · loading into staging"); }}>Start import</Btn>
        </>}
      >
        <div className="grid gap-2">
          {[["nhfr", "DOH NHFR export", "National Health Facility Registry file"], ["psgc", "PSA PSGC release", "Official geographic codes"], ["csv", "Custom CSV", "Mapped with a saved column template"]].map(([k, t, d]) => (
            <label key={k} className={cx("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition", src === k ? "border-teal-500 bg-teal-50/60 dark:bg-teal-500/5" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300")}>
              <input type="radio" name="src" checked={src === k} onChange={() => setSrc(k)} className="mt-0.5 accent-teal-600" />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{t}</span>
                <span className="block text-xs text-zinc-500">{d}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="grid place-items-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-6 text-center">
          <I n="upload" className="w-5 h-5 text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Drop a file or <span className="text-teal-600 font-medium">browse</span></p>
          <p className="text-[11px] text-zinc-400">CSV or XLSX, up to 50 MB</p>
        </div>
        <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-teal-600" />
          I've recorded this file's source, date, version and usage terms.
        </label>
      </Modal>
    </div>
  );
}

// ================================================================== //
//  Locations (PSGC hierarchy)
// ================================================================== //
const brgys = (base, list) => list.map(([name, fac, ver], i) => ({ name, code: base.slice(0, 7) + String(i + 1).padStart(3, "0"), fac, ver }));
const GEO = [
  { name: "NCR", code: "1300000000", fac: 3120, ver: 2950, children: [
    { name: "NCR, 1st District", code: "1380600000", fac: 410, ver: 388, children: [
      { name: "City of Manila", code: "1380601000", fac: 410, ver: 388, children: brgys("1380601000", [["Tondo I", 52, 50], ["Sampaloc", 61, 58], ["Ermita", 18, 18]]) },
    ] },
    { name: "NCR, 2nd District", code: "1381200000", fac: 1460, ver: 1390, children: [
      { name: "Quezon City", code: "1381300000", fac: 980, ver: 935, children: brgys("1381300000", [["Bagong Silangan", 24, 22], ["Commonwealth", 41, 40], ["Batasan Hills", 33, 31]]) },
      { name: "Marikina City", code: "1380700000", fac: 210, ver: 198, children: brgys("1380700000", [["Concepcion Uno", 18, 18], ["Parang", 15, 14], ["Nangka", 12, 11]]) },
    ] },
  ] },
  { name: "Region IV-A", code: "0400000000", fac: 2860, ver: 2610, children: [
    { name: "Rizal", code: "0405800000", fac: 520, ver: 470, children: [
      { name: "Antipolo City", code: "0405802000", fac: 148, ver: 131, children: brgys("0405802000", [["San Isidro", 18, 14], ["Dela Paz", 22, 21], ["Mayamot", 25, 22], ["Cupang", 19, 17], ["San Roque", 31, 29], ["Mambugan", 16, 13]]) },
      { name: "Cainta", code: "0405804000", fac: 64, ver: 60, children: brgys("0405804000", [["San Andres", 21, 20], ["Santo Domingo", 24, 22], ["San Juan", 19, 18]]) },
    ] },
    { name: "Laguna", code: "0403400000", fac: 690, ver: 640, children: [
      { name: "Santa Rosa City", code: "0403428000", fac: 120, ver: 112, children: brgys("0403428000", [["Balibago", 31, 30], ["Dila", 18, 17], ["Tagapo", 22, 20]]) },
      { name: "Calamba City", code: "0403405000", fac: 166, ver: 150, children: brgys("0403405000", [["Real", 28, 26], ["Parian", 20, 19], ["Canlubang", 34, 29]]) },
    ] },
    { name: "Cavite", code: "0402100000", fac: 810, ver: 735, children: [
      { name: "Bacoor City", code: "0402103000", fac: 190, ver: 170, children: brgys("0402103000", [["Molino III", 30, 27], ["Talaba", 12, 12]]) },
      { name: "Dasmariñas City", code: "0402106000", fac: 210, ver: 188, children: brgys("0402106000", [["Salitran", 26, 24], ["Burol", 22, 19]]) },
    ] },
  ] },
  { name: "Region VII", code: "0700000000", fac: 1690, ver: 1420, children: [
    { name: "Cebu", code: "0702200000", fac: 980, ver: 810, children: [
      { name: "Cebu City", code: "0702217000", fac: 310, ver: 280, children: brgys("0702217000", [["Lahug", 22, 21], ["Guadalupe", 28, 25], ["Mabolo", 17, 16]]) },
      { name: "Danao City", code: "0702219000", fac: 44, ver: 32, children: brgys("0702219000", [["Poblacion", 12, 9], ["Guinsay", 6, 4]]) },
    ] },
    { name: "Bohol", code: "0701200000", fac: 420, ver: 360, children: [
      { name: "Tagbilaran City", code: "0701242000", fac: 70, ver: 63, children: brgys("0701242000", [["Cogon", 9, 9], ["Dampas", 7, 6]]) },
    ] },
  ] },
  { name: "Region XI", code: "1100000000", fac: 1180, ver: 1050, children: [
    { name: "Davao del Sur", code: "1102400000", fac: 610, ver: 548, children: [
      { name: "Davao City", code: "1102402000", fac: 402, ver: 360, children: brgys("1102402000", [["Buhangin", 41, 37], ["Talomo", 38, 35], ["Toril", 33, 28]]) },
    ] },
    { name: "Davao de Oro", code: "1108200000", fac: 160, ver: 141, children: [
      { name: "Nabunturan", code: "1108207000", fac: 38, ver: 33, children: brgys("1108207000", [["Poblacion", 11, 10], ["Magsaysay", 6, 5]]) },
    ] },
  ] },
];
const GEO_LEVELS = ["Region", "Province / District", "City / Municipality", "Barangay"];

function GeoColumn({ title, items, sel, onPick, leaf, emptyHint }) {
  return (
    <div className="min-w-0 border-b md:border-b-0 md:border-r last:border-0 border-zinc-200 dark:border-zinc-800">
      <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">{title}</div>
      {items ? (
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {items.map((it, i) => (
            <li key={it.code}>
              <button onClick={() => onPick(i)} className={cx("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition", sel === i ? "bg-teal-50 dark:bg-teal-500/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>
                <div className="min-w-0 flex-1">
                  <div className={cx("text-sm truncate", sel === i ? "text-teal-900 dark:text-teal-200 font-medium" : "text-zinc-800 dark:text-zinc-200")}>{it.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">{it.code}</div>
                </div>
                <span className="text-xs tabular-nums text-zinc-500">{it.fac.toLocaleString()}</span>
                {!leaf && <I n="right" className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-xs text-zinc-400">{emptyHint}</div>
      )}
    </div>
  );
}

function LocationsPage({ notify, go }) {
  const [path, setPath] = useState([1, 0, 0]);
  const pick = (level) => (i) => setPath((p) => [...p.slice(0, level), i]);
  const r = GEO[path[0]];
  const p = path.length > 1 ? r.children[path[1]] : null;
  const c = path.length > 2 ? p.children[path[2]] : null;
  const bgy = path.length > 3 ? c.children[path[3]] : null;
  const node = bgy || c || p || r;
  const level = path.length - 1;
  const pct = Math.round((node.ver / node.fac) * 100);
  const crumbs = [r, p, c, bgy].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHead title="Locations" desc="Philippine Standard Geographic Code (PSGC) hierarchy used for directory filters.">
        <Btn onClick={() => notify("Export started (sample)")}><I n="download" /> Export codes</Btn>
      </PageHead>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        <I n="refresh" className="w-4 h-4 animate-spin [animation-duration:3s]" />
        <span className="flex-1">PSGC Q3 2026 is importing (batch #215, 64%). The codes shown are from the Q2 2026 release until it has been reviewed.</span>
        <Btn onClick={() => go("imports")}>View batch</Btn>
      </div>

      <StatStrip items={[["Regions", "17", "PSGC Q2 2026"], ["Provinces", "82", "plus NCR districts"], ["Cities / municipalities", "1,642", "sample figure"], ["Facilities without geo code", "214", "need barangay or city", "text-amber-600 dark:text-amber-400"]]} />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm">
          <button onClick={() => setPath([path[0]])} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Philippines</button>
          {crumbs.map((n, i) => (
            <span key={n.code} className="flex items-center gap-1.5">
              <I n="right" className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
              <button onClick={() => setPath(path.slice(0, i + 1))} className={i === crumbs.length - 1 ? "font-medium text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}>{n.name}</button>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <GeoColumn title="Region" items={GEO} sel={path[0]} onPick={pick(0)} />
          <GeoColumn title="Province / District" items={r.children} sel={path[1]} onPick={pick(1)} />
          <GeoColumn title="City / Municipality" items={p ? p.children : null} sel={path[2]} onPick={pick(2)} emptyHint="Select a province" />
          <GeoColumn title="Barangay" items={c ? c.children : null} sel={path[3]} onPick={pick(3)} leaf emptyHint="Select a city or municipality" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel className="xl:col-span-2">
          <PanelHead title={node.name} desc={`${GEO_LEVELS[level]} · PSGC ${node.code}`} right={<Btn variant="ghost" onClick={() => go("facilities")}>View facilities <I n="right" className="w-3.5 h-3.5" /></Btn>} />
          <div className="px-5 pb-5 grid sm:grid-cols-3 gap-4">
            {[["Facilities", node.fac.toLocaleString()], ["Verified", node.ver.toLocaleString()], ["Missing coordinates", Math.max(1, Math.round(node.fac * 0.02)).toLocaleString()]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-4">
                <div className="text-xs text-zinc-500">{l}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900 dark:text-white">{v}</div>
              </div>
            ))}
            <div className="sm:col-span-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-500">Verification coverage</span>
                <span className="font-medium tabular-nums text-zinc-900 dark:text-white">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div className={cx("h-full rounded-full", pct >= 90 ? "bg-teal-500" : pct >= 80 ? "bg-amber-400" : "bg-rose-500")} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Geography issues" desc="Detected during the last import" />
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
            {[["3 facilities", "have coordinates outside their city boundary", "rose"], ["12 facilities", "are missing a barangay code", "amber"], ["2 cities", "were renamed in the PSGC Q3 release", "sky"]].map(([a, b, t]) => (
              <li key={a + b} className="flex items-center gap-3 px-5 py-3">
                <span className={cx("w-1.5 h-8 rounded-full", t === "rose" ? "bg-rose-500" : t === "amber" ? "bg-amber-400" : "bg-sky-500")} />
                <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400"><b className="font-medium text-zinc-900 dark:text-zinc-100">{a}</b> {b}</p>
                <Btn variant="ghost" className="h-7 text-xs" onClick={() => notify("Opened in review queue (sample)")}>Fix</Btn>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// ================================================================== //
//  AI assistant
// ================================================================== //
const CHAT0 = [
  { role: "user", text: "Where can I get my baby vaccinated near Antipolo this Saturday?" },
  {
    role: "ai", tag: ["Grounded", "emerald"], meta: "3 records retrieved · 1.9s",
    body: (
      <>
        <p>From approved directory records, two nearby facilities list <b>Immunization</b>:</p>
        <ul className="mt-2 space-y-1.5 list-disc pl-4">
          <li><b>Brgy. San Isidro Health Station</b>: its listed hours are Mon–Fri only, so it is probably closed on Saturday.</li>
          <li><b>Quezon City RHU 3</b>: listed as open Mon–Sat, 8:00–17:00 (about 14 km away).</li>
        </ul>
        <p className="mt-2">Hours can change, so please call ahead before you go.</p>
      </>
    ),
    cites: [["Quezon City RHU 3", "Verified Oct 30", "emerald"], ["Brgy. San Isidro HS", "Correction in review", "amber"]],
  },
  { role: "user", text: "Is Cebu Northern Infirmary PhilHealth accredited?" },
  {
    role: "ai", tag: ["No source found", "amber"], meta: "1 record retrieved · 1.2s",
    body: <p>I don't have verified information about PhilHealth accreditation for Cebu Northern Infirmary, so I can't confirm it. Please check with PhilHealth directly, or call the facility at (032) 200 1188.</p>,
    cites: [["Cebu Northern Infirmary", "In review", "amber"]],
  },
  { role: "user", text: "My father has chest pain and is having trouble breathing" },
  {
    role: "ai", emergency: true, tag: ["Emergency redirect", "rose"], meta: "Safety rule · 0.3s",
    body: <p><b>This could be an emergency.</b> Call <b>911</b> now or go to the nearest emergency room. I can't assess symptoms, and directory listings may not show whether a facility can take emergency patients right now.</p>,
  },
];
const GUARDS = [
  ["cite", "Require citations for facility facts", "Hours, services and contacts must link to a record."],
  ["stale", "Warn on sources older than 180 days", "Stale records are mentioned only with a freshness warning."],
  ["log", "Log questions (anonymized)", "Used for evaluation; no account IDs are stored."],
];
const LOCKED_GUARDS = [
  ["Refuse diagnosis and treatment advice", "Always on"],
  ["Emergency redirect to 911", "Always on"],
  ["Send personal or health data to provider", "Off · needs legal review"],
];
const KDOCS = [
  ["Approved facility records", "16,840 records · synced 2 min ago", "Live", "emerald"],
  ["DOH immunization schedule FAQ", "v3 · verified Oct 2, 2026", "Published", "emerald"],
  ["TB-DOTS program overview", "v1 · verified May 14, 2026", "Review due", "amber"],
  ["Emergency guidance copy", "v2 · verified Sep 1, 2026", "Published", "emerald"],
  ["Dengue prevention leaflet", "v1 · not yet verified", "Draft", "zinc"],
];
const EVALS = [["Grounded in sources", 94, 95], ["Acknowledges missing info", 100, 100], ["No invented facts", 99.6, 99.5], ["Prompt-injection tests passed", 100, 100]];

function AssistantPage({ notify }) {
  const [msgs, setMsgs] = useState(CHAT0);
  const [q, setQ] = useState("");
  const [thinking, setThinking] = useState(false);
  const [guards, setGuards] = useState({ cite: true, stale: true, log: true });
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs, thinking]);

  const send = (e) => {
    e.preventDefault();
    const t = q.trim();
    if (!t || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setQ("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { role: "ai", tag: ["Sample response", "zinc"], meta: "design preview", body: <p>This is a design preview, so no model is connected. In production, this answer would be generated only from approved facility records and knowledge documents, with citations and last-verified dates.</p> }]);
    }, 1100);
  };

  return (
    <div className="space-y-6">
      <PageHead title="AI assistant" desc="Answers public questions only from approved records. It never diagnoses or prescribes.">
        <Pill tone="teal">Beta · staging</Pill>
        <Btn onClick={() => notify("Evaluation run queued · 500 questions")}><I n="refresh" /> Run evaluation</Btn>
      </PageHead>

      <StatStrip items={[["Questions (7d)", "12,940", "+8% vs last week"], ["Answers with citations", "94%", "target 95%"], ["Said 'no info found'", "7%", "honest gaps, not guesses"], ["Spend this month", "₱23,400", "of ₱40,000 budget"]]} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel className="xl:col-span-2 flex flex-col">
          <PanelHead title="Test console" desc="Ask questions against staging data. Nothing here reaches real users." right={<Btn variant="ghost" onClick={() => setMsgs([])}>Clear</Btn>} />
          <div ref={boxRef} className="h-[480px] overflow-y-auto px-5 py-4 space-y-4 border-y border-zinc-100 dark:border-zinc-800">
            {msgs.length === 0 && <div className="h-full grid place-items-center text-sm text-zinc-400">Ask something to test the assistant.</div>}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3.5 py-2 text-sm">{m.text}</div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white shrink-0"><I n="spark" className="w-3.5 h-3.5" /></span>
                  <div className="max-w-[85%] min-w-0">
                    <div className={cx("rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed", m.emergency ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200")}>{m.body}</div>
                    {m.cites && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.cites.map(([n, d, t]) => (
                          <span key={n} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            <I n="link" className="w-3 h-3 text-zinc-400" />{n}<span className={cx("rounded px-1", PILL[t])}>{d}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400"><Pill tone={m.tag[1]}>{m.tag[0]}</Pill>{m.meta}</div>
                  </div>
                </div>
              )
            )}
            {thinking && (
              <div className="flex gap-2.5 items-center">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white"><I n="spark" className="w-3.5 h-3.5" /></span>
                <div className="flex gap-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 px-3 py-3">
                  {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {["Free dental check-up in Cebu City?", "Which Marikina health centers offer TB-DOTS?", "Can you tell me what medicine to take for fever?"].map((s) => (
                <button key={s} onClick={() => setQ(s)} className="rounded-full border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">{s}</button>
              ))}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3.5 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-teal-500/40">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question as a member of the public…" className="flex-1 bg-transparent outline-none text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400" />
              <Btn variant="brand" type="submit" disabled={!q.trim() || thinking} className="h-8 w-8 px-0" aria-label="Send"><I n="send" /></Btn>
            </form>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHead title="Guardrails" desc="Safety rules from the AI design spec" />
            <ul className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {GUARDS.map(([k, t, d]) => (
                <li key={k} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-1">
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">{t}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{d}</div>
                  </div>
                  <Toggle on={guards[k]} label={t} onChange={(v) => { setGuards((g) => ({ ...g, [k]: v })); notify(`${t}: ${v ? "on" : "off"}`); }} />
                </li>
              ))}
              {LOCKED_GUARDS.map(([t, s]) => (
                <li key={t} className="flex items-center gap-3 px-5 py-3">
                  <I n="lock" className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{t}</span>
                  <span className="text-[11px] text-zinc-500">{s}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Evaluation" desc="Last run Nov 6 · 500 questions · 48 injection tests" />
            <ul className="px-5 pb-5 space-y-3">
              {EVALS.map(([l, v, target]) => (
                <li key={l}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">{l}</span>
                    <span className={cx("font-medium tabular-nums", v >= target ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{v}%</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className={cx("h-full rounded-full", v >= target ? "bg-teal-500" : "bg-amber-400")} style={{ width: `${v}%` }} />
                    <span className="absolute -top-0.5 w-0.5 h-2.5 bg-zinc-500 rounded" style={{ left: `${target}%` }} title={`Target ${target}%`} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHead title="Knowledge sources" desc="Only published, verified documents are retrieved" right={<Btn variant="ghost" onClick={() => notify("Upload dialog (sample)")}><I n="plus" /> Add document</Btn>} />
        <ul className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {KDOCS.map(([n, d, s, t]) => (
            <li key={n} className="flex items-center gap-3 px-5 py-3">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><I n="file" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{n}</div>
                <div className="text-xs text-zinc-500">{d}</div>
              </div>
              <Pill tone={t} dot>{s}</Pill>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

// ================================================================== //
//  Health programs
// ================================================================== //
const TODAY = new Date("2026-11-07T00:00:00");
const ALL_REGIONS = ["NCR", "CAR", "Region III", "Region IV-A", "Region V", "Region VI", "Region VII", "Region XI"];
const PROGRAMS0 = [
  { id: 1, title: "Measles-Rubella Catch-up Immunization", cat: "Immunization", start: "2026-11-01", end: "2026-11-30", facilities: 214, regions: ["NCR", "Region IV-A", "Region III"], published: true, desc: "Free MR vaccines for children aged 9–59 months at participating health centers." },
  { id: 2, title: "Senior Citizen Flu Vaccination", cat: "Immunization", start: "2026-10-15", end: "2026-11-15", facilities: 340, regions: ["NCR", "Region VII", "Region XI"], published: true, desc: "Free influenza vaccine for adults 60 and above. Bring a senior citizen ID." },
  { id: 3, title: "TB Awareness and Free Screening", cat: "Tuberculosis", start: "2026-12-01", end: "2026-12-15", facilities: 96, regions: ["Region VI", "Region VII"], published: true, desc: "Chest X-ray screening and TB-DOTS enrollment at selected rural health units." },
  { id: 4, title: "Dengue Prevention Campaign", cat: "Vector-borne", start: "2027-01-05", end: "2027-02-28", facilities: 58, regions: ["Region XI"], published: true, desc: "Community clean-up drives and fever-check stations in high-risk barangays." },
  { id: 5, title: "Prenatal Care Week", cat: "Maternal health", start: "2027-01-12", end: "2027-01-18", facilities: 0, regions: [], published: false, desc: "Free prenatal check-ups and counseling for expecting mothers." },
  { id: 6, title: "Oral Health Month: Free Dental Check-ups", cat: "Dental", start: "2026-02-01", end: "2026-02-28", facilities: 128, regions: ["NCR", "Region V"], published: true, desc: "Free dental check-ups and fluoride varnish for children." },
];
const PSTAT = { live: ["Live", "emerald"], scheduled: ["Scheduled", "sky"], draft: ["Draft", "zinc"], ended: ["Ended", "zinc"] };
const fmtD = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const progStatus = (p) => (!p.published ? "draft" : new Date(p.end + "T00:00:00") < TODAY ? "ended" : new Date(p.start + "T00:00:00") > TODAY ? "scheduled" : "live");
const elapsed = (p) => Math.max(0, Math.min(100, ((TODAY - new Date(p.start + "T00:00:00")) / (new Date(p.end + "T00:00:00") - new Date(p.start + "T00:00:00"))) * 100));

function ProgramsPage({ notify }) {
  const [programs, setPrograms] = useState(PROGRAMS0);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState(null);
  const withStatus = programs.map((p) => ({ ...p, status: progStatus(p) }));
  const counts = withStatus.reduce((m, p) => ({ ...m, [p.status]: (m[p.status] || 0) + 1 }), {});
  const shown = withStatus.filter((p) => filter === "all" || p.status === filter);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (!draft.title.trim()) return notify("Add a title first");
    setPrograms((ps) => (draft.id ? ps.map((p) => (p.id === draft.id ? draft : p)) : [{ ...draft, id: Date.now() }, ...ps]));
    notify(draft.published ? `"${draft.title}" saved and published` : `"${draft.title}" saved as draft`);
    setDraft(null);
  };

  return (
    <div className="space-y-6">
      <PageHead title="Health programs" desc="Public announcements and campaigns, shown in the web and mobile apps.">
        <Btn variant="primary" onClick={() => setDraft({ title: "", cat: "Immunization", start: "2026-12-01", end: "2026-12-31", facilities: 0, regions: [], published: false, desc: "" })}><I n="plus" /> New program</Btn>
      </PageHead>

      <Tabs value={filter} onChange={setFilter} items={[["all", "All", programs.length], ["live", "Live", counts.live || 0], ["scheduled", "Scheduled", counts.scheduled || 0], ["draft", "Draft", counts.draft || 0], ["ended", "Ended", counts.ended || 0]]} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((p) => (
          <button key={p.id} onClick={() => setDraft({ ...p })} className="text-left flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
            <div className="flex items-center justify-between gap-2">
              <Pill tone="teal">{p.cat}</Pill>
              <Pill tone={PSTAT[p.status][1]} dot>{PSTAT[p.status][0]}</Pill>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">{p.title}</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{p.desc}</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <I n="calendar" className="w-3.5 h-3.5" /> {fmtD(p.start)} – {fmtD(p.end)}
            </div>
            {p.status === "live" && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${elapsed(p)}%` }} /></div>
                <div className="mt-1 text-[11px] text-zinc-400">{Math.round(elapsed(p))}% of campaign elapsed</div>
              </div>
            )}
            <div className="flex-1" />
            <div className="mt-4 pt-3 flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-zinc-500 whitespace-nowrap"><b className="font-semibold text-zinc-900 dark:text-white tabular-nums">{p.facilities}</b> facilities</span>
              <span className="text-zinc-400 truncate">{p.regions.join(", ") || "No regions yet"}</span>
            </div>
          </button>
        ))}
        {shown.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center text-sm text-zinc-500">No programs in this view.</div>}
      </div>

      <SlideOver
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft && draft.id ? "Edit program" : "New program"}
        desc="Published programs appear in the public web and mobile apps."
        footer={<>
          <Btn className="flex-1" onClick={() => setDraft(null)}>Cancel</Btn>
          <Btn variant="brand" className="flex-1" onClick={save}>{draft && draft.published ? "Save & publish" : "Save draft"}</Btn>
        </>}
      >
        {draft && (
          <>
            <Field label="Title"><input className={inp} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Free Flu Vaccination Week" /></Field>
            <Field label="Category">
              <select className={inp} value={draft.cat} onChange={(e) => set("cat", e.target.value)}>
                {["Immunization", "Tuberculosis", "Maternal health", "Dental", "Vector-borne", "Nutrition"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Public description" hint="Plain language. No medical advice. Link to official sources where possible.">
              <textarea rows={3} className={cx(inp, "h-auto py-2")} value={draft.desc} onChange={(e) => set("desc", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts"><input type="date" className={inp} value={draft.start} onChange={(e) => set("start", e.target.value)} /></Field>
              <Field label="Ends"><input type="date" className={inp} value={draft.end} onChange={(e) => set("end", e.target.value)} /></Field>
            </div>
            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Regions</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_REGIONS.map((r) => {
                  const on = draft.regions.includes(r);
                  return (
                    <button key={r} type="button" onClick={() => set("regions", on ? draft.regions.filter((x) => x !== r) : [...draft.regions, r])} className={cx("rounded-full px-2.5 py-1 text-xs border transition", on ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200" : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400")}>
                      {on && "✓ "}{r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{draft.facilities} participating facilities</div>
                <div className="text-[11px] text-zinc-500">Only verified facilities can be listed as participating.</div>
              </div>
              <Btn onClick={() => notify("Facility picker (sample)")}>Manage</Btn>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-3">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Publish to public apps</div>
                <div className="text-[11px] text-zinc-500">Status follows the dates: scheduled, live, then ended.</div>
              </div>
              <Toggle on={draft.published} label="Publish" onChange={(v) => set("published", v)} />
            </div>
          </>
        )}
      </SlideOver>
    </div>
  );
}

// ================================================================== //
//  Team & roles
// ================================================================== //
const MEMBERS0 = [
  { id: 1, name: "Juan Dela Cruz", email: "juan.delacruz@example.org", role: "System admin", fac: "All facilities", last: "Active now", mfa: true, c: "bg-sky-500" },
  { id: 2, name: "Maria Reyes", email: "maria.reyes@example.org", role: "Verifier", fac: "—", last: "12 min ago", mfa: true, c: "bg-violet-500", you: true },
  { id: 3, name: "Grace Tan", email: "grace.tan@example.org", role: "System admin", fac: "All facilities", last: "3 d ago", mfa: true, c: "bg-emerald-500" },
  { id: 4, name: "Rico Santos", email: "rico.santos@example.org", role: "Facility staff", fac: "Brgy. San Isidro Health Station", last: "6 h ago", mfa: false, c: "bg-amber-500" },
  { id: 5, name: "Liza Mendoza", email: "liza.mendoza@example.org", role: "Facility staff", fac: "Quezon City RHU 3 +1", last: "2 d ago", mfa: true, c: "bg-pink-500" },
  { id: 6, name: "Paolo Garcia", email: "paolo.garcia@example.org", role: "Facility staff", fac: "Cebu Northern Infirmary", last: "47 d ago", mfa: false, c: "bg-orange-500", inactive: true },
  { id: 7, name: "Ana Villanueva", email: "ana.villanueva@example.org", role: "Verifier", fac: "—", last: "Invite sent 5 h ago", mfa: false, c: "bg-zinc-400", pending: true },
];
const ROLE_CARDS = [
  ["Guest", "Search facilities, view services, contacts and source dates.", "Public"],
  ["Patient", "Save preferences; request appointments in phase 2.", "Phase 2"],
  ["Facility staff", "Maintain assigned facility info and appointment requests.", "3 members"],
  ["Verifier", "Review records, source evidence, imports and corrections.", "2 members"],
  ["System admin", "Roles, configuration, imports, security and audit review.", "2 members"],
];
const MATRIX = [
  ["Search public facilities", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ["View published programs", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ["Manage own account", "No", "Yes", "Yes", "Yes", "Yes"],
  ["Request appointments", "No", "Yes", "Optional", "No", "No"],
  ["View own appointments", "No", "Yes", "No", "No", "No"],
  ["Manage assigned facility appointments", "No", "No", "Yes", "No", "Optional"],
  ["Edit assigned facility info", "No", "No", "Limited", "Review only", "Yes"],
  ["Verify facility records", "No", "No", "No", "Yes", "Yes"],
  ["Import datasets", "No", "No", "No", "Authorized", "Yes"],
  ["Manage roles", "No", "No", "No", "No", "Yes"],
  ["Access audit logs", "No", "No", "Limited if needed", "Limited", "Authorized"],
];

function PermCell({ v }) {
  if (v === "Yes") return <span className="inline-grid place-items-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"><I n="check" className="w-3 h-3" /></span>;
  if (v === "No") return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
  return <Pill tone="amber">{v}</Pill>;
}

function TeamPage({ notify }) {
  const [tab, setTab] = useState("members");
  const [viewAs, setViewAs] = useState("System admin");
  const [members, setMembers] = useState(MEMBERS0);
  const [invite, setInvite] = useState(null);
  const canEdit = viewAs === "System admin";

  const changeRole = (m, role) => {
    setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role } : x)));
    notify(`${m.name} is now ${role} · logged to audit`);
  };
  const sendInvite = () => {
    if (!invite.email.includes("@")) return notify("Enter a valid email");
    setMembers((ms) => [...ms, { id: Date.now(), name: invite.email.split("@")[0], email: invite.email, role: invite.role, fac: invite.role === "Facility staff" ? invite.fac : "—", last: "Invite sent just now", mfa: false, c: "bg-zinc-400", pending: true }]);
    notify(`Invite sent to ${invite.email}`);
    setInvite(null);
  };

  return (
    <div className="space-y-6">
      <PageHead title="Team & roles" desc="Least-privilege access, enforced on the server by Laravel Policies and Gates.">
        <div className="flex items-center gap-2 text-xs text-zinc-500">Preview as <Segmented value={viewAs} onChange={setViewAs} options={["System admin", "Verifier"]} /></div>
        <Btn variant="primary" disabled={!canEdit} onClick={() => setInvite({ email: "", role: "Facility staff", fac: FACILITIES[0].name })}><I n="plus" /> Invite member</Btn>
      </PageHead>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <I n="lock" className="w-4 h-4" /> Verifiers can view the team but can't change roles. Ask a System admin.
        </div>
      )}

      <Tabs value={tab} onChange={setTab} items={[["members", "Members", members.length], ["roles", "Roles & permissions"]]} />

      {tab === "members" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <I n="clock" className="w-4 h-4" />
            <span className="flex-1">Quarterly access review is due in <b>12 days</b>: 1 account inactive for 45+ days, 2 without two-factor authentication.</span>
            <Btn onClick={() => notify("Access review started")}>Start review</Btn>
          </div>
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Member</th>
                    <th className="px-3 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Assigned facilities</th>
                    <th className="px-3 py-2.5 font-medium">2FA</th>
                    <th className="px-3 py-2.5 font-medium">Last active</th>
                    <th className="pr-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-3 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          <span className={cx("grid place-items-center w-8 h-8 rounded-full text-[11px] font-semibold text-white shrink-0", m.c)}>{m.name.split(/[\s.]/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{m.name} {m.you && <span className="text-xs font-normal text-zinc-400">(you)</span>}</div>
                            <div className="text-xs text-zinc-500 truncate">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {canEdit && !m.pending && !m.you ? (
                          <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} className={cx(inpBase, "h-8 pr-7")}>
                            {["System admin", "Verifier", "Facility staff"].map((r) => <option key={r}>{r}</option>)}
                          </select>
                        ) : (
                          <Pill tone={m.role === "System admin" ? "sky" : m.role === "Verifier" ? "violet" : "zinc"}>{m.role}</Pill>
                        )}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{m.fac}</td>
                      <td className="px-3 py-3">{m.pending ? <span className="text-xs text-zinc-400">—</span> : m.mfa ? <Pill tone="emerald">On</Pill> : <Pill tone="rose">Off</Pill>}</td>
                      <td className={cx("px-3 py-3 whitespace-nowrap text-xs", m.inactive ? "text-rose-600 dark:text-rose-400 font-medium" : "text-zinc-500")}>{m.pending ? <Pill tone="amber">Invited</Pill> : m.last}</td>
                      <td className="pr-5 py-3 text-right whitespace-nowrap">
                        {m.pending ? (
                          <Btn variant="ghost" className="h-7 text-xs" disabled={!canEdit} onClick={() => notify(`Invite re-sent to ${m.email}`)}>Resend</Btn>
                        ) : m.inactive ? (
                          <Btn className="h-7 text-xs !text-rose-600 !border-rose-200 dark:!text-rose-400 dark:!border-rose-500/30" disabled={!canEdit} onClick={() => notify(`${m.name} suspended · logged to audit`)}>Suspend</Btn>
                        ) : (
                          <span className="text-zinc-400 inline-block"><I n="dots" /></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {ROLE_CARDS.map(([n, d, c]) => (
              <Panel key={n} className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{n}</h3>
                  <span className="text-[11px] text-zinc-400">{c}</span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{d}</p>
              </Panel>
            ))}
          </div>
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/40">
                    <th className="text-left px-5 py-2.5 font-medium">Capability</th>
                    {["Guest", "Patient", "Facility staff", "Verifier", "System admin"].map((r) => <th key={r} className="px-3 py-2.5 font-medium text-center whitespace-nowrap">{r}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
                  {MATRIX.map(([cap, ...vals]) => (
                    <tr key={cap} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-2.5 text-zinc-800 dark:text-zinc-200 min-w-[220px]">{cap}</td>
                      {vals.map((v, i) => <td key={i} className="px-3 py-2.5 text-center"><PermCell v={v} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <ul className="grid sm:grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            {["Ownership and facility assignment are checked on every protected request.", "A verifier does not automatically get access to patient appointment details.", "Editing and approval are separated where practical (four-eyes review).", "UI controls improve usability but are not the security boundary."].map((t) => (
              <li key={t} className="flex gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"><I n="shield" className="w-4 h-4 text-teal-600 shrink-0" />{t}</li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={!!invite}
        onClose={() => setInvite(null)}
        title="Invite a team member"
        desc="Invites expire in 7 days. Admins and verifiers must turn on 2FA at first sign-in."
        footer={<><Btn onClick={() => setInvite(null)}>Cancel</Btn><Btn variant="primary" onClick={sendInvite}><I n="send" /> Send invite</Btn></>}
      >
        {invite && (
          <>
            <Field label="Email"><input type="email" className={inp} value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="name@example.org" /></Field>
            <Field label="Role">
              <select className={inp} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                {["Facility staff", "Verifier", "System admin"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            {invite.role === "Facility staff" && (
              <Field label="Assigned facility" hint="Staff can only edit facilities assigned to them.">
                <select className={inp} value={invite.fac} onChange={(e) => setInvite({ ...invite, fac: e.target.value })}>
                  {FACILITIES.map((f) => <option key={f.id}>{f.name}</option>)}
                </select>
              </Field>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// ================================================================== //
//  Audit log
// ================================================================== //
const AUDIT_CAT = { Facilities: "teal", Imports: "sky", Access: "violet", Security: "rose", Settings: "zinc" };
const AUDIT_ROWS = [
  { id: 1, t: "Nov 7 · 14:32", ts: "2026-11-07T14:32:08+08:00", actor: "Maria Reyes", role: "Verifier", action: "facility.approved", cat: "Facilities", rid: "FAC-01G7T5", ip: "203.177.•.•", before: { verification_status: "pending_review", verified_at: null }, after: { verification_status: "verified", verified_at: "2026-11-07T14:32:08+08:00" } },
  { id: 2, t: "Nov 7 · 14:05", ts: "2026-11-07T14:05:51+08:00", actor: "System", role: "Import job", action: "import.flagged", cat: "Imports", rid: "#214", ip: "internal", after: { duplicate_candidates: 87, conflicts: 46 } },
  { id: 3, t: "Nov 7 · 12:10", ts: "2026-11-07T12:10:33+08:00", actor: "Grace Tan", role: "System admin", action: "settings.updated", cat: "Settings", rid: "verification.stale_after_days", ip: "203.177.•.•", before: { value: 150 }, after: { value: 180 } },
  { id: 4, t: "Nov 7 · 11:40", ts: "2026-11-07T11:40:02+08:00", actor: "Juan Dela Cruz", role: "System admin", action: "import.started", cat: "Imports", rid: "#215", ip: "112.198.•.•", after: { source: "PSA PSGC", version: "2026-Q3" } },
  { id: 5, t: "Nov 7 · 09:18", ts: "2026-11-07T09:18:44+08:00", actor: "Juan Dela Cruz", role: "System admin", action: "user.invited", cat: "Access", rid: "usr_01J9…A7", ip: "112.198.•.•", after: { email: "a•••@example.org", role: "verifier" } },
  { id: 6, t: "Nov 7 · 08:41", ts: "2026-11-07T08:41:10+08:00", actor: "Rico Santos", role: "Facility staff", action: "facility.correction_submitted", cat: "Facilities", rid: "FAC-01J8K2", ip: "49.145.•.•", before: { hours_sat: "closed", phone: "[redacted]" }, after: { hours_sat: "08:00–12:00", phone: "[redacted]" } },
  { id: 7, t: "Nov 7 · 03:12", ts: "2026-11-07T03:12:55+08:00", actor: "Unknown", role: "—", action: "auth.login_rate_limited", cat: "Security", rid: "—", ip: "185.220.•.•", after: { attempts: 5, window: "1 min", response: 429 } },
  { id: 8, t: "Nov 6 · 17:50", ts: "2026-11-06T17:50:19+08:00", actor: "Maria Reyes", role: "Verifier", action: "facility.rejected", cat: "Facilities", rid: "FAC-01B8N2", ip: "203.177.•.•", before: { verification_status: "pending_review" }, after: { verification_status: "rejected", reason: "No verifiable source" } },
  { id: 9, t: "Nov 6 · 15:02", ts: "2026-11-06T15:02:37+08:00", actor: "Liza Mendoza", role: "Facility staff", action: "user.mfa_enabled", cat: "Security", rid: "usr_01J2…K9", ip: "120.29.•.•", after: { mfa: "totp" } },
  { id: 10, t: "Nov 6 · 10:25", ts: "2026-11-06T10:25:00+08:00", actor: "Juan Dela Cruz", role: "System admin", action: "api_key.rotated", cat: "Security", rid: "key_web_public", ip: "112.198.•.•", before: { key: "pk_live_••••91c0" }, after: { key: "pk_live_••••3fa2" } },
  { id: 11, t: "Nov 5 · 16:44", ts: "2026-11-05T16:44:12+08:00", actor: "Juan Dela Cruz", role: "System admin", action: "role.revoked", cat: "Access", rid: "usr_01G4…P3", ip: "112.198.•.•", before: { roles: ["verifier"] }, after: { roles: [] } },
  { id: 12, t: "Nov 5 · 00:00", ts: "2026-11-05T00:00:00+08:00", actor: "System", role: "Scheduler", action: "facility.marked_stale", cat: "Facilities", rid: "1,208 records", ip: "internal", after: { threshold_days: 180 } },
];

function AuditPage({ notify, scopeId }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [actor, setActor] = useState("Anyone");
  const [open, setOpen] = useState(1);
  const actors = ["Anyone", ...Array.from(new Set(AUDIT_ROWS.map((r) => r.actor)))];
  const rows = AUDIT_ROWS.filter((r) => (!scopeId || r.rid === scopeId) && (cat === "All" || r.cat === cat) && (actor === "Anyone" || r.actor === actor) && (r.action + r.rid + r.actor).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHead title="Audit log" desc="Administrative actions and protected-resource access. Kept for 365 days.">
        <Btn onClick={() => notify("CSV export started (sample)")}><I n="download" /> Export CSV</Btn>
      </PageHead>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 w-full sm:w-72 focus-within:ring-2 focus-within:ring-teal-500/40">
            <I n="search" className="w-4 h-4 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, resource or actor" className="bg-transparent outline-none text-sm flex-1 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400" />
          </label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={cx(inpBase, "h-8")}>
            {["All", ...Object.keys(AUDIT_CAT)].map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={actor} onChange={(e) => setActor(e.target.value)} className={cx(inpBase, "h-8")}>
            {actors.map((a) => <option key={a}>{a}</option>)}
          </select>
          <span className="ml-auto text-xs text-zinc-500">{rows.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <th className="pl-5 pr-2 py-2.5 w-6" />
                <th className="px-2 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Actor</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Resource</th>
                <th className="pr-5 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="border-t border-zinc-100 dark:border-zinc-800">
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr onClick={() => setOpen(open === r.id ? null : r.id)} className={cx("cursor-pointer border-b border-zinc-100 dark:border-zinc-800 transition", open === r.id ? "bg-zinc-50 dark:bg-zinc-800/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>
                    <td className="pl-5 pr-2 py-3 text-zinc-400"><I n="right" className={cx("w-3.5 h-3.5 transition-transform", open === r.id && "rotate-90")} /></td>
                    <td className="px-2 py-3 text-xs text-zinc-500 whitespace-nowrap tabular-nums">{r.t}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-zinc-900 dark:text-zinc-100">{r.actor}</div>
                      <div className="text-[11px] text-zinc-500">{r.role}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-2"><Pill tone={AUDIT_CAT[r.cat]}>{r.cat}</Pill><code className="text-xs text-zinc-700 dark:text-zinc-300">{r.action}</code></span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{r.rid}</td>
                    <td className="pr-5 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">{r.ip}</td>
                  </tr>
                  {open === r.id && (
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                      <td colSpan={6} className="px-5 pb-4 pt-1">
                        <div className="grid md:grid-cols-2 gap-3">
                          {[["Before", r.before, "text-rose-700 dark:text-rose-300"], ["After", r.after, "text-emerald-700 dark:text-emerald-300"]].map(([l, obj, tone]) => (
                            <div key={l} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden">
                              <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">{l}</div>
                              <pre className={cx("px-3 py-2 text-xs font-mono whitespace-pre-wrap", obj ? tone : "text-zinc-400")}>{obj ? JSON.stringify(obj, null, 2) : "—"}</pre>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-500">Event {r.ts} · request req_{(9000 + r.id * 37).toString(16)}…</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-14 text-center text-sm text-zinc-500">No events match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="flex items-center gap-2 text-xs text-zinc-500"><I n="shield" className="w-4 h-4 text-teal-600" /> Tokens, passwords and personal contact details are redacted before logging. No medical data is written to the audit log.</p>
    </div>
  );
}

// ================================================================== //
//  Settings
// ================================================================== //
const SETTINGS0 = { name: "CommunityCare AI", lang: "English", tz: "Asia/Manila", stale: 180, fourEyes: true, requireSource: true, conflictKm: 1, rl_search: 60, rl_login: 5, rl_ai: 10, pageMax: 50, radius: 50, n_review: true, n_import: true, n_fail: true, n_digest: false, mfa: true, timeout: "30 minutes", ips: "203.177.0.0/16\n112.198.0.0/16" };
const SETTING_SECTIONS = [["general", "General"], ["verification", "Verification"], ["api", "API & limits"], ["notifications", "Notifications"], ["security", "Security"], ["danger", "Danger zone"]];

function SettingRow({ title, desc, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
        {desc && <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>}
      </div>
      <div className="sm:w-64 shrink-0 flex sm:justify-end">{children}</div>
    </div>
  );
}

function SettingsPage({ notify }) {
  const [sec, setSec] = useState("general");
  const [s, setS] = useState(SETTINGS0);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setS((x) => ({ ...x, [k]: v })); setDirty(true); };
  const staleEst = Math.round(1208 * Math.pow(180 / s.stale, 1.6));
  const num = (k, suffix) => (
    <div className="flex items-center gap-2 w-full sm:justify-end">
      <input type="number" value={s[k]} onChange={(e) => set(k, +e.target.value)} className={cx(inpBase, "w-24 text-right tabular-nums")} />
      <span className="text-xs text-zinc-500 whitespace-nowrap w-24">{suffix}</span>
    </div>
  );
  const tog = (k, label) => <Toggle on={s[k]} label={label} onChange={(v) => set(k, v)} />;
  const locked = (text) => <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500"><I n="lock" className="w-3.5 h-3.5" />{text}</span>;

  return (
    <div className="space-y-6 pb-16">
      <PageHead title="Settings" desc="Workspace configuration for the staging environment." />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-10">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {SETTING_SECTIONS.map(([k, l]) => (
            <button key={k} onClick={() => setSec(k)} className={cx("text-left px-3 h-8 rounded-lg text-sm whitespace-nowrap transition", sec === k ? "bg-zinc-100 text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-white" : k === "danger" ? "font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" : "font-medium text-zinc-800 hover:text-black hover:bg-zinc-100 dark:text-zinc-200 dark:hover:text-white dark:hover:bg-zinc-900")}>{l}</button>
          ))}
        </nav>

        <div className="space-y-6 min-w-0">
          {sec === "general" && (
            <Panel>
              <PanelHead title="General" desc="Basic workspace details" />
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                <SettingRow title="Workspace name"><input className={inp} value={s.name} onChange={(e) => set("name", e.target.value)} /></SettingRow>
                <SettingRow title="Default language" desc="Used by the public web and mobile apps">
                  <select className={inp} value={s.lang} onChange={(e) => set("lang", e.target.value)}>{["English", "Filipino", "Cebuano"].map((x) => <option key={x}>{x}</option>)}</select>
                </SettingRow>
                <SettingRow title="Timezone"><select className={inp} value={s.tz} onChange={(e) => set("tz", e.target.value)}><option>Asia/Manila</option><option>UTC</option></select></SettingRow>
                <SettingRow title="Public directory URL" desc="Read-only, set at deployment"><code className="text-xs text-zinc-600 dark:text-zinc-400">https://care.example.org</code></SettingRow>
                <SettingRow title="Environment"><Pill tone="amber" dot>Staging</Pill></SettingRow>
              </div>
            </Panel>
          )}

          {sec === "verification" && (
            <Panel>
              <PanelHead title="Verification" desc="How records move from draft to verified" />
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                <SettingRow title={`Mark records stale after ${s.stale} days`} desc={`About ${staleEst.toLocaleString()} published records would be marked stale`}>
                  <input type="range" min={30} max={365} step={15} value={s.stale} onChange={(e) => set("stale", +e.target.value)} className="w-full accent-teal-600" aria-label="Stale threshold in days" />
                </SettingRow>
                <SettingRow title="Four-eyes review" desc="The person who edits a record can't approve it">{tog("fourEyes", "Four-eyes review")}</SettingRow>
                <SettingRow title="Require a traceable source to publish" desc="Records without source_name and source_record_id stay in draft">{tog("requireSource", "Require source")}</SettingRow>
                <SettingRow title="Flag coordinate conflicts over" desc="Compared with the existing record during import">{num("conflictKm", "km")}</SettingRow>
                <SettingRow title="'Not a license or accreditation' notice" desc="Shown next to verification badges on public pages">{locked("Always on")}</SettingRow>
              </div>
            </Panel>
          )}

          {sec === "api" && (
            <>
              <Panel>
                <PanelHead title="Rate limits" desc="Applied per IP address on /api/v1" />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  <SettingRow title="Public facility search">{num("rl_search", "req / min")}</SettingRow>
                  <SettingRow title="Login attempts">{num("rl_login", "req / min")}</SettingRow>
                  <SettingRow title="AI assistant messages">{num("rl_ai", "req / min")}</SettingRow>
                  <SettingRow title="Maximum page size" desc="Caps per_page on list endpoints">{num("pageMax", "items")}</SettingRow>
                  <SettingRow title="Nearby search radius cap" desc="Caps radius_km">{num("radius", "km")}</SettingRow>
                </div>
              </Panel>
              <Panel>
                <PanelHead title="Client keys" desc="AI provider keys stay server-side and are never shipped in web or mobile bundles." />
                <ul className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[["Web app (public)", "pk_live_••••3fa2", "Rotated Nov 6, 2026"], ["Mobile app (public)", "pk_live_••••7b19", "Created Sep 2, 2026"]].map(([n, k, d]) => (
                    <li key={n} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="grid place-items-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><I n="key" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n}</div>
                        <div className="text-xs text-zinc-500"><code>{k}</code> · {d}</div>
                      </div>
                      <Btn onClick={() => notify(`${n} key rotated · logged to audit`)}><I n="refresh" /> Rotate</Btn>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          )}

          {sec === "notifications" && (
            <Panel>
              <PanelHead title="Notifications" desc="Email and in-app alerts for your account" />
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                <SettingRow title="New item in review queue">{tog("n_review", "Review queue alerts")}</SettingRow>
                <SettingRow title="Import finished">{tog("n_import", "Import finished alerts")}</SettingRow>
                <SettingRow title="Import failed">{tog("n_fail", "Import failed alerts")}</SettingRow>
                <SettingRow title="Weekly data-quality digest" desc="Stale records, duplicates and coverage by region">{tog("n_digest", "Weekly digest")}</SettingRow>
                <SettingRow title="Security alerts" desc="New sign-ins, role changes, key rotations">{locked("Always on")}</SettingRow>
              </div>
            </Panel>
          )}

          {sec === "security" && (
            <>
              <Panel>
                <PanelHead title="Security" desc="Strong administrative authentication" />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  <SettingRow title="Require 2FA for admins and verifiers">{tog("mfa", "Require 2FA")}</SettingRow>
                  <SettingRow title="Session timeout" desc="Idle admin sessions are signed out">
                    <select className={inp} value={s.timeout} onChange={(e) => set("timeout", e.target.value)}>{["15 minutes", "30 minutes", "1 hour", "8 hours"].map((x) => <option key={x}>{x}</option>)}</select>
                  </SettingRow>
                  <SettingRow title="Allowed admin IP ranges" desc="One CIDR per line. Leave empty to allow all.">
                    <textarea rows={3} className={cx(inp, "h-auto py-2 font-mono text-xs")} value={s.ips} onChange={(e) => set("ips", e.target.value)} />
                  </SettingRow>
                </div>
              </Panel>
              <Panel>
                <PanelHead title="Backups" desc="Managed PostgreSQL, daily snapshots, 30-day retention" />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  <SettingRow title="Last backup" desc="Nov 7, 2026 · 02:00 PHT"><Pill tone="emerald" dot>Healthy</Pill></SettingRow>
                  <SettingRow title="Last restore test" desc="Restored into a clean environment on Oct 28, 2026"><Btn onClick={() => notify("Restore test scheduled")}>Schedule test</Btn></SettingRow>
                </div>
              </Panel>
            </>
          )}

          {sec === "danger" && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-zinc-900">
              <PanelHead title="Danger zone" desc="These actions are logged and can't be undone easily." />
              <div className="border-t border-rose-100 dark:border-rose-500/20">
                {[["Unpublish all stale records", "Hides 1,208 records from the public directory until re-verified"], ["Reset staging data", "Clears staging tables and import history (staging only)"], ["Delete workspace", "Owner only, production requires a support request"]].map(([t, d], i) => (
                  <SettingRow key={t} title={t} desc={d}>
                    <Btn className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-500/30 dark:hover:bg-rose-500/10" disabled={i === 2} onClick={() => notify("Disabled in this sample")}>{t.split(" ")[0]}</Btn>
                  </SettingRow>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white pl-4 pr-2 py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">Unsaved changes</span>
          <Btn variant="ghost" onClick={() => { setS(SETTINGS0); setDirty(false); }}>Discard</Btn>
          <Btn variant="primary" onClick={() => { setDirty(false); notify("Settings saved · logged to audit"); }}>Save changes</Btn>
        </div>
      )}
    </div>
  );
}

// ================================================================== //
//  Facility scope: dropdown + single-facility dashboard
// ================================================================== //
const SCOPED_PAGES = ["overview", "facilities", "review", "audit"];
const seedOf = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const daysSince = (d) => {
  const t = Date.parse(d);
  return isNaN(t) ? null : Math.round((TODAY - t) / 86400000);
};
const dayLabels = (n) => {
  const end = new Date(2026, 10, 7);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (n - 1 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
};

function ScopePicker({ scope, setScope, items }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = items.find((f) => f.id === scope);
  const list = items.filter((f) => (f.name + f.city + f.region + f.id).toLowerCase().includes(q.toLowerCase()));
  const groups = list.reduce((m, f) => ({ ...m, [f.region]: [...(m[f.region] || []), f] }), {});
  const choose = (id) => { setScope(id); setOpen(false); setQ(""); };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx("flex items-center gap-2 h-8 max-w-[150px] sm:max-w-[280px] rounded-lg border px-2.5 text-sm transition", current ? "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100" : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800")}
      >
        <I n="building" className="w-4 h-4 shrink-0" />
        <span className="truncate font-medium">{current ? current.name : "All facilities"}</span>
        <I n="chevron" className="w-3.5 h-3.5 shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <I n="search" className="w-4 h-4 text-zinc-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a facility, city or ID" className="flex-1 bg-transparent outline-none text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400" />
            </label>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5" role="listbox">
            <button onClick={() => choose(null)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"><I n="building" /></span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">All facilities</span>
                <span className="block text-[11px] text-zinc-500">Workspace-wide dashboard</span>
              </span>
              {!scope && <I n="check" className="w-4 h-4 text-teal-600" />}
            </button>
            {Object.entries(groups).map(([region, fs]) => (
              <div key={region}>
                <div className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{region}</div>
                {fs.map((f) => (
                  <button key={f.id} onClick={() => choose(f.id)} role="option" aria-selected={scope === f.id} className={cx("w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left", scope === f.id ? "bg-teal-50 dark:bg-teal-500/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                    <Avatar name={f.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-zinc-900 dark:text-zinc-100 truncate">{f.name}</span>
                      <span className="block text-[11px] text-zinc-500 truncate">{f.city}</span>
                    </span>
                    {scope === f.id ? <I n="check" className="w-4 h-4 text-teal-600" /> : <span className={cx("w-2 h-2 rounded-full shrink-0", STATUS[f.status].dot)} title={STATUS[f.status].label} />}
                  </button>
                ))}
              </div>
            ))}
            {list.length === 0 && <div className="py-6 text-center text-sm text-zinc-500">No facilities found</div>}
          </div>
          <div className="flex items-start gap-1.5 px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500">
            <I n="lock" className="w-3.5 h-3.5 shrink-0 mt-px" />
            Facility staff only see the facilities assigned to them. Enforced by the API, not this menu.
          </div>
        </div>
      )}
    </div>
  );
}

function FacilityOverview({ f, range, setRange, openFacility, go, clear }) {
  const n = RANGES[range];
  const seed = seedOf(f.id);
  const base = 6 + (seed % 9);
  const views = useMemo(() => series(n, base, base * 0.8, seed % 7).map((v) => Math.max(1, v)), [n, f.id]);
  const actions = useMemo(() => views.map((v, i) => Math.max(0, Math.round(v * (0.3 + Math.sin(i + seed) * 0.05)))), [views]);
  const labels = useMemo(() => dayLabels(n), [n]);
  const sum = (arr) => arr.reduce((a, b) => a + b, 0) * 10;
  const d = daysSince(f.verified);
  const isStale = f.status === "stale" || (d !== null && d > 180);

  const checks = [
    ["Traceable source", f.source !== "Self-submitted", f.source],
    ["Verified in the last 180 days", d !== null && d <= 180, d === null ? "Not verified yet" : `${d} days ago`],
    ["Public contact number", f.phone !== "—", f.phone],
    ["Opening hours", f.hours !== "Not provided", f.hours],
    ["Services listed", f.services.length > 0, `${f.services.length} services`],
    ["No open flags", !f.flag, f.flag || "None"],
  ];
  const score = checks.filter((c) => c[1]).length;

  const openItems = [
    f.status === "pending_review" && ["Change awaiting review", `Source: ${f.source}`, "amber"],
    f.flag && [f.flag, "Raised by import #214", "rose"],
    isStale && ["Re-verification due", `Last verified ${f.verified}`, "rose"],
    f.status === "draft" && ["Record not published", "Missing required fields", "zinc"],
  ].filter(Boolean);

  const programs = PROGRAMS0.filter((p) => p.published && p.regions.includes(f.region) && progStatus(p) !== "ended");
  const activity = AUDIT_ROWS.filter((r) => r.rid === f.id);

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300 text-sm font-semibold shrink-0">
            {f.name.replace(/^Brgy\.\s*/, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{f.name}</h1>
              <Badge status={f.status} />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{f.type} · {f.city} · {f.region} · <span className="font-mono text-xs">{f.id}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={clear}>← All facilities</Btn>
            <Btn variant="primary" onClick={() => openFacility(f)}>Open record</Btn>
          </div>
        </div>
      </Panel>

      <StatStrip items={[
        ["Profile views", sum(views).toLocaleString(), `last ${range}`],
        ["Calls & directions", sum(actions).toLocaleString(), "tapped from the profile"],
        ["Search appearances", Math.round(sum(views) * 4.2).toLocaleString(), "shown in results"],
        ["Last verified", d === null ? "Never" : `${d} days ago`, f.verified === "—" ? "needs verification" : f.verified, isStale || d === null ? "text-rose-600 dark:text-rose-400" : undefined],
      ]} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel className="xl:col-span-2">
          <PanelHead
            title="Public interest"
            desc="How often people open this facility in the web and mobile apps"
            right={<Segmented value={range} onChange={setRange} options={Object.keys(RANGES)} />}
          />
          <div className="px-5 pb-5">
            <AreaChart a={views} b={actions} labels={labels} names={["Profile views", "Calls & directions"]} scale={10} />
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Record health" desc={`${score} of ${checks.length} checks passing`} />
          <div className="px-5">
            <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className={cx("h-full rounded-full", score === checks.length ? "bg-teal-500" : score >= 4 ? "bg-amber-400" : "bg-rose-500")} style={{ width: `${(score / checks.length) * 100}%` }} />
            </div>
          </div>
          <ul className="p-3">
            {checks.map(([label, ok, detail]) => (
              <li key={label} className="flex items-start gap-2.5 px-2 py-1.5">
                <span className={cx("mt-0.5 grid place-items-center w-4 h-4 rounded-full shrink-0", ok ? "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300")}>
                  <I n={ok ? "check" : "x"} className="w-2.5 h-2.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-zinc-800 dark:text-zinc-200">{label}</span>
                  <span className="block text-[11px] text-zinc-500 truncate">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel>
          <PanelHead title="Needs attention" desc="Open items for this facility" />
          {openItems.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
              {openItems.map(([t, sub, tone]) => (
                <li key={t} className="flex items-center gap-3 px-5 py-3">
                  <span className={cx("w-1.5 h-8 rounded-full", tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : "bg-zinc-400")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t}</div>
                    <div className="text-xs text-zinc-500">{sub}</div>
                  </div>
                  <Btn variant="ghost" className="h-7 text-xs" onClick={() => openFacility(f)}>Review</Btn>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 pb-6 pt-2 text-sm text-zinc-500 flex items-center gap-2"><I n="check" className="w-4 h-4 text-teal-600" /> Nothing needs attention.</div>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Listed services" desc="From facility_services" />
          <div className="px-5 pb-5 flex flex-wrap gap-1.5">
            {f.services.map((s) => <span key={s} className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300">{s}</span>)}
          </div>
          <div className="px-5 pb-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">Health programs in {f.region}</h4>
            {programs.length ? (
              <ul className="space-y-2">
                {programs.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <Pill tone={PSTAT[progStatus(p)][1]} dot>{PSTAT[progStatus(p)][0]}</Pill>
                    <span className="truncate text-zinc-800 dark:text-zinc-200">{p.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">No active programs in this region.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Activity" desc="Audit log for this facility" right={<Btn variant="ghost" onClick={() => go("audit")}>All <I n="right" className="w-3.5 h-3.5" /></Btn>} />
          {activity.length ? (
            <ul className="px-5 pb-4 space-y-3">
              {activity.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="text-zinc-700 dark:text-zinc-300"><b className="font-medium text-zinc-900 dark:text-zinc-100">{r.actor}</b> <code className="text-xs">{r.action}</code></div>
                  <div className="text-[11px] text-zinc-500">{r.t}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-sm text-zinc-500">No admin activity in the last 30 days.</p>
          )}
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-xs text-zinc-500"><I n="shield" className="w-4 h-4 text-teal-600" /> Usage numbers are anonymous public counts. No patient or personal data is shown here.</p>
    </div>
  );
}

// ---------- Shell ----------
function NavItem({ item, active, collapsed, onClick, count }) {
  const isActive = active === item.key;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cx("group w-full flex items-center gap-2.5 h-8 rounded-lg text-sm transition", collapsed ? "justify-center px-0" : "px-2.5", isActive ? "bg-white text-zinc-950 font-semibold shadow-sm ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700" : "text-zinc-900 font-medium hover:text-black hover:bg-zinc-200/70 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800/70")}
      aria-current={isActive ? "page" : undefined}
    >
      <I n={item.icon} className={cx("w-4 h-4 shrink-0", isActive ? "text-teal-600 dark:text-teal-400" : "text-zinc-800 dark:text-zinc-200")} />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
      {!collapsed && count ? <span className="text-[11px] font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{count}</span> : null}
      {!collapsed && item.tag ? <span className="text-[10px] font-medium rounded px-1 py-px bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">{item.tag}</span> : null}
    </button>
  );
}

function Sidebar({ active, go, collapsed, mobileOpen, closeMobile, openPalette, pending }) {
  return (
    <>
      <div className={cx("fixed inset-0 z-30 bg-zinc-950/40 lg:hidden", mobileOpen ? "block" : "hidden")} onClick={closeMobile} />
      <aside className={cx("fixed z-40 inset-y-0 left-0 flex flex-col bg-zinc-50 border-r border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 transition-all duration-200", collapsed ? "lg:w-[64px]" : "lg:w-60", "w-60", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className={cx("flex items-center gap-2 h-14 shrink-0", collapsed ? "justify-center" : "px-3")}>
          <button className={cx("flex items-center gap-2.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 p-1.5", !collapsed && "flex-1")}>
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white text-xs font-bold shadow-sm">CC</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left leading-tight">
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-white">CommunityCare</span>
                  <span className="block text-[11px] text-zinc-500">Staging workspace</span>
                </span>
                <I n="chevron" className="w-3.5 h-3.5 text-zinc-400" />
              </>
            )}
          </button>
        </div>

        <div className={cx("pb-2", collapsed ? "px-3" : "px-3")}>
          <button onClick={openPalette} className={cx("w-full flex items-center gap-2 h-8 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-400 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700", collapsed ? "justify-center" : "px-2.5")} aria-label="Search">
            <I n="search" className="w-4 h-4" />
            {!collapsed && <><span className="flex-1 text-left">Search…</span><kbd className="text-[10px] border border-zinc-200 dark:border-zinc-700 rounded px-1">⌘K</kbd></>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {NAV.map((n) => <NavItem key={n.key} item={n} active={active} collapsed={collapsed} onClick={() => go(n.key)} count={n.key === "review" ? pending : n.count} />)}
          <div className={cx("pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400", collapsed ? "text-center" : "px-2.5")}>{collapsed ? "·" : "Workspace"}</div>
          {NAV2.map((n) => <NavItem key={n.key} item={n} active={active} collapsed={collapsed} onClick={() => go(n.key)} />)}
        </nav>

        {!collapsed && (
          <div className="m-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">AI usage</span>
              <span className="text-zinc-500 tabular-nums">62%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-teal-400 to-teal-600" /></div>
            <p className="mt-2 text-[11px] text-zinc-500">12.9k of 20k monthly answers</p>
          </div>
        )}

        <div className={cx("flex items-center gap-2.5 border-t border-zinc-200 dark:border-zinc-800 h-14 shrink-0", collapsed ? "justify-center" : "px-4")}>
          <span className="grid place-items-center w-7 h-7 rounded-full bg-violet-500 text-white text-[11px] font-semibold">MR</span>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">Maria Reyes</div>
              <div className="text-[11px] text-zinc-500">Data verifier</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Placeholder({ k }) {
  const item = [...NAV, ...NAV2].find((n) => n.key === k);
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-24 text-center">
      <div>
        <span className="mx-auto grid place-items-center w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><I n={item.icon} className="w-5 h-5" /></span>
        <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{item.label}</h2>
        <p className="mt-1 text-sm text-zinc-500">This screen isn't designed yet in the sample.</p>
      </div>
    </div>
  );
}

export default function SaaSDashboard() {
  const [page, setPage] = useState(() => {
    const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    return [...NAV, ...NAV2].some((n) => n.key === h) ? h : "overview";
  });
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [range, setRange] = useState("30d");
  const [drawer, setDrawer] = useState(null);
  const [rows, setRows] = useState(FACILITIES);
  const [toast, setToast] = useState(null);
  const [scope, setScope] = useState(null);
  const scopedF = rows.find((r) => r.id === scope) || null;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setDrawer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (k) => {
    setPage(k);
    setMobileOpen(false);
    if (typeof window !== "undefined") window.history.replaceState(null, "", "#" + k);
  };

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(window.__ccT);
    window.__ccT = setTimeout(() => setToast(null), 2600);
  };

  const decide = (f, status) => {
    setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, status, verified: status === "verified" ? "Nov 7, 2026" : r.verified, flag: status === "verified" ? undefined : r.flag } : r)));
    setDrawer(null);
    notify(status === "verified" ? `${f.name} approved and published` : `${f.name} rejected`);
  };

  const pending = 36 + rows.filter((r) => r.status === "pending_review").length;
  const crumb = [...NAV, ...NAV2].find((n) => n.key === page).label;

  return (
    <div className="min-h-screen bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-sans antialiased">
      <Sidebar active={page} go={go} collapsed={collapsed} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} openPalette={() => setPalette(true)} pending={pending} />

      <div className={cx("transition-all duration-200", collapsed ? "lg:pl-[64px]" : "lg:pl-60")}>
        <header className="sticky top-0 z-20 h-14 flex items-center gap-2 px-4 sm:px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
          <button className="lg:hidden p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setMobileOpen(true)} aria-label="Open menu"><I n="menu" /></button>
          <button className="hidden lg:block p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar"><I n="sidebar" /></button>
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="hidden sm:inline text-zinc-400">CommunityCare</span>
            <I n="right" className="hidden sm:block w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
            <span className="font-medium text-zinc-900 dark:text-white truncate">{crumb}</span>
          </nav>
          <span className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <ScopePicker scope={scope} setScope={(id) => { setScope(id); if (id) notify(`Showing data for ${rows.find((r) => r.id === id).name}`); }} items={rows} />
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden md:inline-flex items-center gap-1.5 mr-2 text-xs text-zinc-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />All systems normal</span>
            <button onClick={() => setDark((d) => !d)} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Toggle dark mode"><I n={dark ? "sun" : "moon"} /></button>
            <button className="relative p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Notifications">
              <I n="bell" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-teal-500" />
            </button>
            <Btn className="ml-1 hidden sm:inline-flex">Invite</Btn>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1320px] mx-auto">
          {scope && !SCOPED_PAGES.includes(page) && (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <I n="alert" className="w-3.5 h-3.5" />
              <span className="flex-1">This page shows workspace-wide data. The facility filter applies to Overview, Facilities, Review queue and Audit log.</span>
              <button onClick={() => setScope(null)} className="font-medium text-zinc-900 dark:text-white hover:underline">Clear filter</button>
            </div>
          )}
          {page === "overview" && (scopedF ? (
            <FacilityOverview f={scopedF} range={range} setRange={setRange} openFacility={setDrawer} go={go} clear={() => setScope(null)} />
          ) : (
            <Overview range={range} setRange={setRange} openFacility={setDrawer} go={go} />
          ))}
          {(page === "facilities" || page === "review") && (
            <Facilities
              key={page + (scope || "")}
              rows={(page === "review" ? rows.filter((r) => r.status === "pending_review" || r.flag) : rows).filter((r) => !scope || r.id === scope)}
              openFacility={setDrawer}
            />
          )}
          {page === "imports" && <ImportsPage notify={notify} go={go} />}
          {page === "locations" && <LocationsPage notify={notify} go={go} />}
          {page === "assistant" && <AssistantPage notify={notify} />}
          {page === "programs" && <ProgramsPage notify={notify} />}
          {page === "team" && <TeamPage notify={notify} />}
          {page === "audit" && <AuditPage notify={notify} scopeId={scope} />}
          {page === "settings" && <SettingsPage notify={notify} />}
          {![...NAV, ...NAV2].some((n) => n.key === page) && <Placeholder k={page} />}
        </main>
      </div>

      <FacilityDrawer f={drawer} onClose={() => setDrawer(null)} onDecide={decide} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} go={go} openFacility={setDrawer} />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm pl-3 pr-4 py-2 shadow-xl">
          <span className="grid place-items-center w-5 h-5 rounded-full bg-teal-500 text-white"><I n="check" className="w-3 h-3" /></span>
          {toast}
        </div>
      )}
    </div>
  );
}
