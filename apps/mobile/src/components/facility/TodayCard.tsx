import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { clockTime, hhmm, type TodayStatus } from '@/lib/today';
import { colors, radius, space } from '@/lib/theme';

type Tone = 'good' | 'warn' | 'bad' | 'plain';
const TONE: Record<Tone, string> = { good: colors.success, warn: colors.warning, bad: colors.danger, plain: colors.text };

function Line({ icon, tone, text }: { icon: keyof typeof Ionicons.glyphMap; tone: Tone; text: string }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={17} color={TONE[tone]} />
      <AppText style={[styles.lineText, { color: TONE[tone] }]}>{text}</AppText>
    </View>
  );
}

/** "Today at this facility": what staff posted this morning (only on that day). */
export function TodayCard({ today }: { today: TodayStatus }) {
  if (!today.doctor && !today.opening && today.out_of_stock.length === 0 && !today.note) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <AppText style={styles.title}>Today at this facility</AppText>
        {today.updated_at && <AppText variant="small">Updated {clockTime(today.updated_at)}</AppText>}
      </View>
      {today.opening === 'closed' && <Line icon="close-circle" tone="bad" text="Closed today" />}
      {today.opening === 'closing_early' && <Line icon="time-outline" tone="warn" text={`Closing early today at ${hhmm(today.closes_at)}`} />}
      {today.opening === 'open' && <Line icon="checkmark-circle" tone="good" text="Open as usual" />}
      {today.doctor === 'in' && <Line icon="person" tone="good" text="A doctor is in today" />}
      {today.doctor === 'out' && <Line icon="person-outline" tone="warn" text="No doctor today" />}
      {today.out_of_stock.length > 0 && <Line icon="alert-circle" tone="warn" text={`Out of stock: ${today.out_of_stock.join(', ')}`} />}
      {today.note && <Line icon="megaphone-outline" tone="plain" text={today.note} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, backgroundColor: colors.brandSoft, borderRadius: radius.card, borderWidth: 1, borderColor: '#99f6e4', padding: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  title: { flex: 1, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  lineText: { flex: 1, lineHeight: 21 },
});
