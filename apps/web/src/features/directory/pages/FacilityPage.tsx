import { lazy, type ReactNode, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { buttonClass } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { ApiError } from '../../../lib/api';
import { recordFacilityEvent, useFacility } from '../api';
import { BookingPanel } from '../components/BookingPanel';
import { ContactList } from '../components/ContactList';
import { FacilityPrograms } from '../components/FacilityPrograms';
import { OpeningHours } from '../components/OpeningHours';
import { ReportFacility } from '../components/ReportFacility';
import { ServiceTags } from '../components/ServiceTags';
import { SourceAttribution } from '../components/SourceAttribution';
import { TodayBox } from '../components/TodayBox';
import { VerificationBadge } from '../components/VerificationBadge';
import { directionsUrl, placeLine } from '../format';

const FacilityMiniMap = lazy(() => import('../components/FacilityMiniMap'));

function Section({ title, icon, children, footer }: { title: string; icon: IconName; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100"><Icon name={icon} className="h-4 w-4" /></span>
        {title}
      </h2>
      {children}
      {footer && <div className="mt-4 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800">{footer}</div>}
    </section>
  );
}

/** Public facility page: header with actions, booking and details, and a sidebar with map, hours and contact. */
export function FacilityPage() {
  const { id = '' } = useParams();
  const facility = useFacility(id);

  if (facility.error instanceof ApiError && facility.error.status === 404) {
    return (
      <EmptyState icon="building" title="Facility not found" action={<Link to="/" className="text-sm font-medium text-brand-700 underline">Back to search</Link>}>
        It may have been removed from the public directory.
      </EmptyState>
    );
  }

  if (!facility.data) {
    return facility.error ? (
      <p className="py-16 text-center text-sm text-zinc-500">The directory could not be reached.</p>
    ) : (
      <div className="space-y-4" aria-label="Loading">
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]"><div className="h-64 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" /><div className="h-64 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" /></div>
      </div>
    );
  }

  const data = facility.data;
  const phone = data.contacts.find((contact) => contact.type === 'phone');
  const website = data.contacts.find((contact) => contact.type === 'website');

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        <Icon name="right" className="h-3.5 w-3.5 rotate-180" /> Back to search
      </Link>

      <header className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-2 bg-gradient-to-r from-brand-500 to-brand-700" aria-hidden="true" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100" aria-hidden="true">
              <Icon name="building" className="h-7 w-7" />
            </span>
            <div className="min-w-0 space-y-1.5">
              {data.type && <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-100">{data.type.name}</p>}
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">{data.name}</h1>
              <p className="flex items-start gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>{[data.address, placeLine(data)].filter(Boolean).join(', ') || 'Location not set'}</span>
              </p>
              <VerificationBadge verification={data.verification} showNotice />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-stretch">
            {data.coordinates && (
              <a href={directionsUrl(data.coordinates.lat, data.coordinates.lng)} target="_blank" rel="noreferrer" className={buttonClass('brand')} onClick={() => recordFacilityEvent(data.id, 'directions_click')}>
                <Icon name="navigation" /> Get directions
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.value.replace(/[^\d+]/g, '')}`} className={buttonClass('secondary')} onClick={() => recordFacilityEvent(data.id, 'call_click')}>
                <Icon name="phone" /> Call {phone.value}
              </a>
            )}
            {website && (
              <a href={/^https?:\/\//.test(website.value) ? website.value : `https://${website.value}`} target="_blank" rel="noreferrer" className={buttonClass('ghost')}>
                <Icon name="globe" /> Website
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {data.booking_enabled && (
            <Section title="Request an appointment" icon="calendar">
              <BookingPanel facilityId={data.id} />
            </Section>
          )}

          <Section title="Services" icon="check" footer="A listed service may not be available every day. Call ahead to confirm.">
            <ServiceTags services={data.services} />
          </Section>

          {(data.programs ?? []).length > 0 && (
            <Section title="Health programs here" icon="megaphone">
              <FacilityPrograms programs={data.programs!} />
            </Section>
          )}

          <Section title="Source and verification" icon="shield">
            <SourceAttribution facility={data} />
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {data.today && <TodayBox today={data.today} />}
          {data.coordinates && (
            <div className="h-56 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <Suspense fallback={<div className="grid h-full place-items-center text-sm text-zinc-500">Loading map…</div>}>
                <FacilityMiniMap name={data.name} lat={data.coordinates.lat} lng={data.coordinates.lng} />
              </Suspense>
            </div>
          )}
          <Section title="Opening hours" icon="clock">
            <OpeningHours hours={data.hours} exceptions={data.hour_exceptions} />
          </Section>
          <Section title="Contact" icon="phone">
            <ContactList facilityId={data.id} contacts={data.contacts} />
          </Section>
          <div className="text-center"><ReportFacility facilityId={data.id} facilityName={data.name} /></div>
          <p className="rounded-2xl bg-rose-50 p-4 text-xs leading-relaxed text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            <strong>Emergency?</strong> Call <a href="tel:911" className="font-semibold underline">911</a> or go to the nearest emergency room. This page may not show whether the facility can take emergency patients right now.
          </p>
        </aside>
      </div>
    </div>
  );
}
