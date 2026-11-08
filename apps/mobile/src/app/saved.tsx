import { FlatList, StyleSheet } from 'react-native';
import { FacilityCard } from '@/components/facility/FacilityCard';
import { Notice } from '@/components/ui/Notice';
import { useSavedFacilities } from '@/lib/saved';
import { space } from '@/lib/theme';

/** Facilities saved on this device; they open without a connection. */
export default function SavedScreen() {
  const { saved, loaded } = useSavedFacilities();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={saved}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FacilityCard facility={item} />}
      ListEmptyComponent={loaded ? <Notice>Nothing saved yet. Open a facility and tap “Save for offline use”.</Notice> : undefined}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({ list: { padding: space.lg, gap: space.md } });
