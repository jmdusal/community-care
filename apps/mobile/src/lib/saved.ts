import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { FacilityDetail } from './directory';

const KEY = 'communitycare.saved-facilities.v1';

/**
 * Saved facilities live only on the device (no account needed). The full
 * detail is stored, so a saved facility opens even with no connection.
 */
export function useSavedFacilities() {
  const [saved, setSaved] = useState<FacilityDetail[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setSaved(raw ? (JSON.parse(raw) as FacilityDetail[]) : []))
      .catch(() => setSaved([]))
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: FacilityDetail[]) => {
    setSaved(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const isSaved = (id: string) => saved.some((facility) => facility.id === id);

  const toggle = (facility: FacilityDetail) =>
    persist(isSaved(facility.id) ? saved.filter((item) => item.id !== facility.id) : [{ ...facility }, ...saved]);

  const find = (id: string) => saved.find((facility) => facility.id === id);

  return { saved, loaded, isSaved, toggle, find };
}
