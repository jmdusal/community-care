import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { FacilityDetail } from '@/lib/directory';
import { DAY_NAMES, formatDay } from '@/lib/format';
import { formatRange, isAllDay, manilaNow, openNow } from '@/lib/hours';
import { colors, space } from '@/lib/theme';

/** Weekly hours (today in bold, open-now badge), "Open 24 hours", overnight times and special days. */
export function OpeningHours({ hours, exceptions }: { hours: FacilityDetail['hours']; exceptions: FacilityDetail['hour_exceptions'] }) {
  // Read the clock once per visit (rendering must not depend on a changing clock).
  const [now] = useState(() => new Date());

  if (hours.length === 0) {
    return <AppText variant="muted">Hours are not listed. Call ahead before visiting.</AppText>;
  }

  const today = manilaNow(now).day;
  const open = openNow(hours, exceptions, now);
  const everyDay24 = DAY_NAMES.every((_, index) => hours.some((hour) => hour.day_of_week === index + 1 && isAllDay(hour)));

  return (
    <View style={styles.list}>
      {open !== null && (
        <View style={[styles.badge, open ? styles.badgeOpen : styles.badgeClosed]}>
          <View style={[styles.dot, { backgroundColor: open ? colors.brand : colors.textMuted }]} />
          <AppText style={[styles.badgeText, { color: open ? colors.brandDark : colors.textMuted }]}>{open ? 'Open now' : 'Closed now'}</AppText>
        </View>
      )}

      {everyDay24 ? (
        <AppText style={styles.bold}>Open 24 hours, every day</AppText>
      ) : DAY_NAMES.map((day, index) => {
        const slots = hours.filter((hour) => hour.day_of_week === index + 1).sort((a, b) => a.opens_at.localeCompare(b.opens_at));
        const text = slots.length ? slots.map((slot) => formatRange(slot.opens_at, slot.closes_at)).join(', ') : 'Closed';
        const isToday = index + 1 === today;

        return (
          <View key={day} style={styles.row} accessible accessibilityLabel={`${day}${isToday ? ', today' : ''}: ${text}`}>
            <AppText variant={isToday ? undefined : 'muted'} style={isToday ? styles.bold : undefined}>{day}</AppText>
            <AppText style={[styles.time, isToday && styles.bold]}>{text}</AppText>
          </View>
        );
      })}

      {exceptions.length > 0 && (
        <View style={styles.specials}>
          <AppText style={styles.bold}>Special days</AppText>
          {exceptions.map((exception) => (
            <AppText key={exception.date} style={styles.exception}>
              {formatDay(exception.date)}: {exception.is_closed ? 'Closed' : formatRange(exception.opens_at ?? '', exception.closes_at ?? '')}{exception.reason ? ` (${exception.reason})` : ''}
            </AppText>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  time: { flexShrink: 1, textAlign: 'right' },
  bold: { fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: 999, marginBottom: space.xs },
  badgeOpen: { backgroundColor: colors.brandSoft },
  badgeClosed: { backgroundColor: colors.border },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  specials: { gap: 2, marginTop: space.sm },
  exception: { color: colors.warning, fontSize: 13 },
});
