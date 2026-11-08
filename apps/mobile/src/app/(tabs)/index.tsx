import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { FacilityCard } from '@/components/facility/FacilityCard';
import { FacilityMap } from '@/components/facility/FacilityMap';
import { type PlaceFilter, PlaceFilters } from '@/components/search/PlaceFilters';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { useFacilitySearch, useServices } from '@/lib/directory';
import { colors, space } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Search: text (as you type), region / city / barangay, near me, list or map. */
export default function SearchScreen() {
  const [text, setText] = useState('');
  const [place, setPlace] = useState<PlaceFilter>({});
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [service, setService] = useState<string | undefined>();
  const catalog = useServices();
  const popular = (catalog.data ?? []).filter((item) => item.facilities > 0).sort((a, b) => b.facilities - a.facilities).slice(0, 6);
  const typed = useDebouncedValue(text.trim());
  const results = useFacilitySearch({
    q: typed || undefined,
    service,
    region: near ? undefined : place.region?.code,
    city: near ? undefined : place.city?.code,
    barangay: near ? undefined : place.barangay?.code,
    ...(near ? { lat: near.lat, lng: near.lng, radiusKm: 10 } : {}),
  });
  const facilities = results.data?.data ?? [];
  const points = facilities.filter((f) => f.coordinates).map((f) => ({ id: f.id, name: f.name, lat: f.coordinates!.lat, lng: f.coordinates!.lng }));

  const findNearMe = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationError('Location permission was not given. Choose a place instead.');

        return;
      }
      const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setNear({ lat: Number(position.coords.latitude.toFixed(4)), lng: Number(position.coords.longitude.toFixed(4)) });
    } catch {
      setLocationError('Could not get your location. Try again or choose a place.');
    } finally {
      setLocating(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <View style={styles.tag}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.brandDark} />
          <AppText style={styles.tagText}>Free · public sources · reviewed by our team</AppText>
        </View>
        <AppText variant="heading" accessibilityRole="header">Find a health facility near you</AppText>
        <AppText variant="muted">Health centers, clinics and hospitals across the Philippines, with hours and services.</AppText>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Facility name, city or address"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Facility name or address"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            value={text}
            onChangeText={setText}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: Boolean(near) }}
          disabled={locating}
          onPress={() => (near ? setNear(null) : void findNearMe())}
          style={[styles.nearMe, near && styles.nearMeOn]}
        >
          <Ionicons name={near ? 'close-circle' : 'locate-outline'} size={16} color={near ? '#ffffff' : colors.brandDark} />
          <AppText style={[styles.nearMeText, near && styles.white]}>{near ? 'Near me (within 10 km) · tap to turn off' : locating ? 'Locating…' : 'Near me'}</AppText>
        </Pressable>
        {locationError && <Notice tone="warning">{locationError}</Notice>}

        {popular.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popular}>
            {popular.map((item) => <Chip key={item.slug} label={item.name} active={service === item.slug} onPress={() => setService(service === item.slug ? undefined : item.slug)} />)}
          </ScrollView>
        )}
      </View>

      {!near && <PlaceFilters value={place} onChange={setPlace} />}
      <View style={styles.summary}>
        {results.data && <AppText style={styles.flex}><AppText style={styles.bold}>{results.data.meta.total}</AppText> facilities{near ? ', nearest first' : ''}</AppText>}
        <Chip label="List" active={view === 'list'} onPress={() => setView('list')} />
        <Chip label="Map" active={view === 'map'} onPress={() => setView('map')} />
      </View>
      {results.error && <Notice tone="danger">{results.error instanceof ApiError ? results.error.body.message : 'Something went wrong.'}</Notice>}
      {view === 'map' && (points.length > 0 ? <FacilityMap points={points} height={420} onOpen={(id) => router.push(`/facilities/${id}`)} /> : results.data && <Notice>None of these facilities has a map position yet.</Notice>)}
    </View>
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={view === 'list' ? facilities : []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FacilityCard facility={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={view === 'map' ? undefined : results.isPending ? <ActivityIndicator style={styles.spinner} color={colors.brand} /> : results.data ? <Notice>No facilities found. Try a shorter name or another place.</Notice> : undefined}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshing={results.isRefetching}
      onRefresh={() => void results.refetch()}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md },
  header: { gap: space.md, marginBottom: space.sm },
  hero: { gap: space.sm, backgroundColor: colors.brandSoft, borderRadius: 20, padding: space.lg, marginHorizontal: -4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#ffffffcc', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.brandDark },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 50, borderRadius: 14, paddingHorizontal: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: space.xs },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: space.sm },
  nearMe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  nearMeOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  nearMeText: { fontWeight: '600', color: colors.brandDark },
  white: { color: '#ffffff' },
  popular: { gap: space.sm, paddingTop: space.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  spinner: { marginTop: space.xl },
});
