import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { FacilitySummary } from '@/lib/directory';
import { formatDistance, placeLine } from '@/lib/format';
import { colors, space } from '@/lib/theme';
import { VerificationBadge } from './VerificationBadge';

/** One search result (same look as the website): type icon, name, place, services, verification. */
export function FacilityCard({ facility }: { facility: FacilitySummary }) {
  const services = facility.services.slice(0, 3);
  const more = facility.services.length - services.length;

  return (
    <Link href={{ pathname: '/facilities/[id]', params: { id: facility.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${facility.name}, ${placeLine(facility)}`}>
        {({ pressed }) => (
        <View style={[styles.card, pressed && styles.pressed]}>
        <View style={styles.iconBox}><Ionicons name="business-outline" size={22} color={colors.brandDark} /></View>
        <View style={styles.body}>
          <AppText variant="title">{facility.name}</AppText>
          {facility.type && <AppText style={styles.type}>{facility.type.name}</AppText>}
          <View style={styles.place}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} style={styles.pin} />
            <View style={styles.flex}>
              <AppText variant="muted">{placeLine(facility) || 'Location not set'}</AppText>
              {facility.address && <AppText variant="small">{facility.address}</AppText>}
            </View>
          </View>
          {services.length > 0 && (
            <View style={styles.chips}>
              {services.map((service) => <AppText key={service.slug} style={styles.chip}>{service.name}</AppText>)}
              {more > 0 && <AppText variant="small">+{more} more</AppText>}
            </View>
          )}
          <View style={styles.footer}>
            <VerificationBadge verification={facility.verification} />
            {facility.distance_km !== undefined && <AppText variant="small">{formatDistance(facility.distance_km)}</AppText>}
          </View>
        </View>
        </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: space.lg },
  pressed: { backgroundColor: '#f4f4f5' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  type: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: -4 },
  place: { flexDirection: 'row', gap: 4 },
  pin: { marginTop: 2 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { fontSize: 12, color: colors.text, backgroundColor: '#f4f4f5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
});
