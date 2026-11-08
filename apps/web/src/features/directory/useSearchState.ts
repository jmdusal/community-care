import { useSearchParams } from 'react-router';
import type { SearchParams } from './api';

/**
 * Search filters live in the URL, so a search can be bookmarked, shared and
 * restored with the back button.
 */
export function useSearchState(): [SearchParams, (changes: Partial<SearchParams>, options?: { replace?: boolean }) => void] {
  const [params, setParams] = useSearchParams();
  const number = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined);
  const text = (key: string) => params.get(key) ?? undefined;

  const state: SearchParams = {
    q: text('q'),
    region: text('region'),
    city: text('city'),
    type: text('type'),
    service: text('service'),
    verified: params.get('verified') === '1',
    lat: number('lat'),
    lng: number('lng'),
    radius: number('radius'),
    page: number('page'),
  };

  /** `replace` updates the URL without a new history entry (used while typing). */
  const update = (changes: Partial<SearchParams>, options: { replace?: boolean } = {}) => {
    const next = { ...state, page: undefined, ...changes };
    const query = new URLSearchParams();

    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === false) {
        return;
      }
      query.set(key, value === true ? '1' : String(value));
    });

    setParams(query, { replace: options.replace });
  };

  return [state, update];
}
