import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { type StaffAction, type StaffAppointment, type StaffScope, useStaffCalendar } from '@/lib/staff';
import { colors, radius, space } from '@/lib/theme';
import { StaffAppointmentCard } from './StaffAppointmentCard';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Dot colour per status (same meaning as the web calendar). */
const DOT: Record<string, string> = {
  requested: '#f59e0b',
  confirmed: '#10b981',
  completed: '#0ea5e9',
  no_show: '#e11d48',
  declined: '#a1a1aa',
  cancelled: '#a1a1aa',
};

const LEGEND: [string, string][] = [['requested', 'Waiting'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['no_show', 'Missed'], ['cancelled', 'Cancelled']];

const manilaDay = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + by, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The 6×7 grid for a month, Sunday first. */
function gridFor(month: string): { date: string; inMonth: boolean }[] {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);

    return { date: day.toISOString().slice(0, 10), inMonth: day.getUTCMonth() === m - 1 };
  });
}

/**
 * Month calendar for staff: each day shows coloured dots (one per appointment, up to 4)
 * and a count. Tap a day to see its appointments below, with the usual actions.
 */
export function CalendarPanel({ scope, busyId, onAction }: { scope: StaffScope; busyId: string | null; onAction: (appointment: StaffAppointment, action: StaffAction, needsReason: boolean) => void }) {
  // Read the clock once per visit (rendering must not depend on a changing clock).
  const [today] = useState(() => manilaDay(new Date()));
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const calendar = useStaffCalendar(month, scope);
  const cells = useMemo(() => gridFor(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, StaffAppointment[]>();
    for (const appointment of calendar.data?.data ?? []) {
      const day = manilaDay(new Date(appointment.starts_at));
      map.set(day, [...(map.get(day) ?? []), appointment]);
    }

    return map;
  }, [calendar.data]);
  const dayItems = byDay.get(selected) ?? [];
  const title = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const selectedTitle = new Date(`${selected}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  const move = (by: number) => {
    const next = shiftMonth(month, by);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} hitSlop={8} style={styles.navButton}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
          <View style={styles.titleBox}>
            <AppText variant="title">{title}</AppText>
            <AppText variant="small">{calendar.data?.meta.total ?? 0} appointments{calendar.isFetching ? ' · updating…' : ''}</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} hitSlop={8} style={styles.navButton}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, index) => <AppText key={index} style={styles.weekday}>{day}</AppText>)}
        </View>

        <View style={styles.grid}>
          {cells.map(({ date, inMonth }) => {
            const items = byDay.get(date) ?? [];
            const isSelected = date === selected;
            const isToday = date === today;

            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${date}, ${items.length} appointments`}
                onPress={() => { setSelected(date); if (!inMonth) { setMonth(date.slice(0, 7)); } }}
                style={styles.cell}
              >
                <View style={[styles.dayCircle, isToday && styles.today, isSelected && styles.selected]}>
                  <AppText style={[styles.dayText, !inMonth && styles.outside, (isSelected || isToday) && styles.dayTextStrong, isSelected && styles.white]}>{Number(date.slice(8))}</AppText>
                </View>
                <View style={styles.dots}>
                  {items.slice(0, 4).map((item) => <View key={item.id} style={[styles.dot, { backgroundColor: DOT[item.status.value] ?? '#a1a1aa' }]} />)}
                </View>
                {items.length > 4 && <AppText style={styles.more}>+{items.length - 4}</AppText>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          {LEGEND.map(([status, label]) => (
            <View key={status} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: DOT[status] }]} /><AppText variant="small">{label}</AppText></View>
          ))}
        </View>
      </View>

      <AppText style={styles.dayTitle} accessibilityRole="header">{selectedTitle}</AppText>
      {calendar.isPending ? <ActivityIndicator color={colors.brand} /> : dayItems.length === 0 ? (
        <AppText variant="muted">No appointments this day.</AppText>
      ) : dayItems.map((appointment) => (
        <StaffAppointmentCard key={appointment.id} appointment={appointment} busy={busyId === appointment.id} onAction={(action, needsReason) => onAction(appointment, action, needsReason)} />
      ))}
      {calendar.data?.meta.truncated && <AppText variant="small">Showing the first 1,000 appointments. Choose fewer facilities to see all.</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f5' },
  titleBox: { alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, minHeight: 52 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.brand },
  selected: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  dayText: { fontSize: 14 },
  dayTextStrong: { fontWeight: '700' },
  outside: { color: '#d4d4d8' },
  white: { color: '#ffffff' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  more: { fontSize: 9, color: colors.textMuted, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center', paddingTop: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
