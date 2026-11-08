import { useState } from 'react';
import { useFacilityOptions } from '../../lib/catalog';
import { type Scope, scopeParams } from '../../lib/scope';

export type WorkingFacility = { id: string; name: string };

/**
 * The one facility the queue, schedule and "Book for a patient" act on. With exactly one
 * facility in the top bar, that one. Otherwise (all facilities, several, a region) the
 * person picks one of the facilities in their current selection, defaulting to the first.
 */
export function useWorkingFacility(scope: Scope) {
  const single = scope.facilityId ? { id: scope.facilityId, name: scope.name ?? 'Selected facility' } : null;
  const options = useFacilityOptions('', single === null, scopeParams(scope));
  const list = (options.data?.data ?? []).map((facility) => ({ id: facility.id, name: facility.name }));
  const [chosenId, setChosenId] = useState<string | null>(null);

  const facility: WorkingFacility | null = single ?? list.find((item) => item.id === chosenId) ?? list[0] ?? null;

  return { facility, options: single ? [] : list, loading: single === null && options.isPending, choose: setChosenId, needsChoice: single === null };
}
