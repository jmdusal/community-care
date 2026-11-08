import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { useRegions } from '@/lib/directory';
import { type Place, useBarangays, useCities } from '@/lib/places';
import { space } from '@/lib/theme';

export type PlaceFilter = { region?: Place; city?: Place; barangay?: Place };

/** Region chips, then city/municipality and barangay pickers (all Philippine places, with search). */
export function PlaceFilters({ value, onChange }: { value: PlaceFilter; onChange: (value: PlaceFilter) => void }) {
  const regions = useRegions();
  const cities = useCities(value.region?.code);
  const barangays = useBarangays(value.city?.code);
  const [picking, setPicking] = useState<'city' | 'barangay' | null>(null);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[{ code: '', name: 'All regions' }, ...(regions.data ?? [])].map((region) => (
          <Chip
            key={region.code || 'all'}
            label={region.name}
            active={(value.region?.code ?? '') === region.code}
            onPress={() => onChange(region.code ? { region } : {})}
          />
        ))}
      </ScrollView>

      {value.region && (
        <View style={styles.pickers}>
          <Chip label={value.city ? value.city.name : 'Any city / municipality'} active={Boolean(value.city)} onPress={() => setPicking('city')} accessibilityLabel={`City or municipality: ${value.city?.name ?? 'any'}. Change`} />
          {value.city && (
            <Chip label={value.barangay ? value.barangay.name : 'Any barangay'} active={Boolean(value.barangay)} onPress={() => setPicking('barangay')} accessibilityLabel={`Barangay: ${value.barangay?.name ?? 'any'}. Change`} />
          )}
        </View>
      )}

      <PickerSheet
        visible={picking === 'city'}
        title="City / municipality"
        allLabel={`Anywhere in ${value.region?.name ?? 'the region'}`}
        loading={cities.isPending}
        options={(cities.data ?? []).map((city) => ({ value: city.code, label: city.name }))}
        onClose={() => setPicking(null)}
        onPick={(option) => { onChange({ region: value.region, city: option ? { code: option.value, name: option.label } : undefined }); setPicking(null); }}
      />
      <PickerSheet
        visible={picking === 'barangay'}
        title="Barangay"
        allLabel={`Anywhere in ${value.city?.name ?? 'the city'}`}
        loading={barangays.isPending}
        options={(barangays.data ?? []).map((barangay) => ({ value: barangay.code, label: barangay.name }))}
        onClose={() => setPicking(null)}
        onPick={(option) => { onChange({ ...value, barangay: option ? { code: option.value, name: option.label } : undefined }); setPicking(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { gap: space.sm },
  pickers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
