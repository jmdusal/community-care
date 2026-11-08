import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingPanel } from '@/components/facility/BookingPanel';
import { EmergencyNote } from '@/components/facility/EmergencyButton';
import { ReportSheet } from '@/components/facility/ReportSheet';
import { TodayCard } from '@/components/facility/TodayCard';
import { FacilityMap } from '@/components/facility/FacilityMap';
import { ContactActions } from '@/components/facility/ContactActions';
import { OpeningHours } from '@/components/facility/OpeningHours';
import { VerificationBadge } from '@/components/facility/VerificationBadge';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { useFacility } from '@/lib/directory';
import { formatDay, placeLine } from '@/lib/format';
import { programDates } from '@/lib/programs';
import { useSavedFacilities } from '@/lib/saved';
import { colors, space } from '@/lib/theme';

/** Facility screen. Falls back to the saved copy when offline. */
export default function FacilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const live = useFacility(id);
  const saved = useSavedFacilities();
  const offlineCopy = saved.find(id);
  const facility = live.data ?? offlineCopy;
  const [reporting, setReporting] = useState(false);

  if (!facility) {
    if (live.isPending) {
      return <ActivityIndicator style={styles.spinner} color={colors.brand} />;
    }

    return (
      <View style={styles.page}>
        <Notice tone="danger">{live.error instanceof ApiError && live.error.status === 404 ? 'This facility is no longer listed.' : 'Could not load this facility. Check your connection.'}</Notice>
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: facility.name }} />
      {!live.data && <Notice tone="warning">Offline: showing your saved copy. Details may have changed.</Notice>}

      <View style={styles.headerCard}>
        <View style={styles.headerStripe} />
        <View style={styles.headerBody}>
          <View style={styles.headerTop}>
            <View style={styles.iconBox}><Ionicons name="business-outline" size={26} color={colors.brandDark} /></View>
            <View style={styles.flex}>
              {facility.type && <AppText style={styles.type}>{facility.type.name.toUpperCase()}</AppText>}
              <AppText variant="heading" accessibilityRole="header">{facility.name}</AppText>
            </View>
          </View>
          <View style={styles.place}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} style={styles.pin} />
            <AppText variant="muted" style={styles.flex}>{[facility.address, placeLine(facility)].filter(Boolean).join(', ') || 'Location not set'}</AppText>
          </View>
          <VerificationBadge verification={facility.verification} showNotice />
          <View style={styles.actions}>
            <ContactActions facility={facility} />
            <Button variant="ghost" icon={saved.isSaved(facility.id) ? 'bookmark' : 'bookmark-outline'} label={saved.isSaved(facility.id) ? 'Saved for offline use · remove' : 'Save for offline use'} onPress={() => saved.toggle(facility)} />
          </View>
        </View>
      </View>

      {facility.coordinates && (
        <View style={styles.mapBox}>
          <FacilityMap points={[{ id: facility.id, name: facility.name, lat: facility.coordinates.lat, lng: facility.coordinates.lng }]} />
        </View>
      )}

      {live.data?.today && <TodayCard today={live.data.today} />}

      {live.data?.booking_enabled && <Card title="Request an appointment" icon="calendar-outline"><BookingPanel facilityId={facility.id} /></Card>}

      <Card title="Opening hours" icon="time-outline"><OpeningHours hours={facility.hours} exceptions={facility.hour_exceptions} /></Card>

      <Card title="Services" icon="checkmark-circle-outline">
        {facility.services.length > 0 ? (
          <View style={styles.chips}>{facility.services.map((service) => <AppText key={service.slug} style={styles.chip}>{service.name}</AppText>)}</View>
        ) : <AppText variant="muted">No services listed yet.</AppText>}
        <AppText variant="small">A listed service may not be available every day. Call ahead to confirm.</AppText>
      </Card>

      {(facility.programs ?? []).length > 0 && (
        <Card title="Health programs here" icon="megaphone-outline">
          {facility.programs!.map((program) => (
            <Link key={program.id} href={`/programs/${program.id}`} asChild>
              <Pressable accessibilityRole="link" style={styles.programRow}>
                <AppText variant="link">{program.title}</AppText>
                <AppText variant="small">{program.category} · {programDates(program)}</AppText>
              </Pressable>
            </Link>
          ))}
        </Card>
      )}

      <Card title="Source and verification" icon="shield-checkmark-outline">
        {facility.sources.map((source) => (
          <AppText key={source.name} variant="muted">{source.name === 'doh_nhfr' ? 'DOH National Health Facility Registry' : source.name} · checked {formatDay(source.checked_at)}</AppText>
        ))}
        <AppText variant="small">{facility.verification.notice}</AppText>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => setReporting(true)} style={styles.report}>
        <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
        <AppText variant="muted">Report wrong information</AppText>
      </Pressable>

      <EmergencyNote />
      <ReportSheet key={reporting ? 'report-open' : 'report-closed'} visible={reporting} facilityId={facility.id} facilityName={facility.name} onClose={() => setReporting(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  headerCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  headerStripe: { height: 6, backgroundColor: colors.brand },
  headerBody: { padding: space.lg, gap: space.sm },
  headerTop: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.brandDark },
  place: { flexDirection: 'row', gap: 4 },
  pin: { marginTop: 2 },
  flex: { flex: 1 },
  actions: { gap: space.sm, marginTop: space.xs },
  mapBox: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 13, color: colors.text, backgroundColor: '#f4f4f5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden' },
  programRow: { minHeight: 44, justifyContent: 'center', gap: 2 },
  spinner: { marginTop: space.xl },
});
