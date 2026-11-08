import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * The admin console's working scope: everything, one region, or one or more facilities.
 * Chosen in the top bar; every scoped page follows it. Remembered per person on this
 * device (the API still enforces access).
 *
 * - facilityId: exactly one facility (pages that need a single facility, like the
 *   appointment schedule, use this);
 * - facilityIds: two or more facilities;
 * - neither: all facilities the person may see (for assigned-facility roles, all of theirs).
 */
export type Scope = { facilityId?: string; facilityIds?: string[]; regionCode?: string; name?: string };

/** What the provider needs to know about the signed-in person. */
export type ScopeOwner = { id: string; sees_all_facilities?: boolean; facilities?: Array<{ id: string; name: string }> };

type ScopeState = { scope: Scope; setScope: (scope: Scope) => void };

const ScopeContext = createContext<ScopeContextValue | null>(null);
type ScopeContextValue = ScopeState;

const storageKey = (userId: string) => `communitycare.scope.${userId}`;

/** Two or more ids stay a list; exactly one becomes facilityId; none clears it. */
export function normalizeScope(scope: Scope): Scope {
  const ids = [...new Set(scope.facilityIds ?? (scope.facilityId ? [scope.facilityId] : []))];
  if (ids.length === 0) {
    return { regionCode: scope.regionCode, name: scope.name };
  }

  return ids.length === 1 ? { facilityId: ids[0], name: scope.name } : { facilityIds: ids, name: scope.name };
}

/**
 * The starting scope, decided before the first page loads (so nothing loads twice):
 * the saved choice when it is still allowed; otherwise, for people who work at assigned
 * facilities, their only facility or "all my facilities".
 */
function initialScope(owner: ScopeOwner): Scope {
  let saved: Scope = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey(owner.id)) ?? '{}') as Scope;
  } catch {
    saved = {};
  }
  saved = normalizeScope(typeof saved === 'object' && saved !== null ? saved : {});

  if (owner.sees_all_facilities) {
    return saved;
  }

  const assigned = owner.facilities ?? [];
  const allowed = new Set(assigned.map((facility) => facility.id));
  const chosen = saved.facilityIds ?? (saved.facilityId ? [saved.facilityId] : []);
  if (chosen.length > 0 && chosen.every((id) => allowed.has(id))) {
    return saved;
  }

  return assigned.length === 1 ? { facilityId: assigned[0].id, name: assigned[0].name } : { name: 'All my facilities' };
}

export function ScopeProvider({ owner, children }: { owner: ScopeOwner; children: ReactNode }) {
  const [scope, setState] = useState<Scope>(() => initialScope(owner));

  const setScope = useCallback((next: Scope) => {
    const value = normalizeScope(next);
    setState(value);
    try {
      localStorage.setItem(storageKey(owner.id), JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode): the scope still applies for this visit.
    }
  }, [owner.id]);

  const value = useMemo(() => ({ scope, setScope }), [scope, setScope]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeState {
  const state = useContext(ScopeContext);
  if (!state) {
    throw new Error('useScope must be used inside ScopeProvider.');
  }

  return state;
}

/** True when the scope narrows to some facilities or a region. */
export function isNarrowed(scope: Scope): boolean {
  return Boolean(scope.facilityId || scope.facilityIds?.length || scope.regionCode);
}

/** A stable key for the scope (to restart pages when it changes). */
export function scopeKey(scope: Scope): string {
  return scope.facilityId ?? scope.facilityIds?.join(',') ?? scope.regionCode ?? 'all';
}

/** API query parameters for a scope: facility_id (one, or several comma-separated) or region_code. */
export function scopeParams(scope: Scope): Record<string, string> {
  if (scope.facilityId) {
    return { facility_id: scope.facilityId };
  }
  if (scope.facilityIds?.length) {
    return { facility_id: scope.facilityIds.join(',') };
  }

  return scope.regionCode ? { region_code: scope.regionCode } : {};
}
