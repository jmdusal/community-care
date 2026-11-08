import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { CATEGORY_STYLE, DEFAULT_CATEGORY_STYLE, programDates, programTiming, useProgram } from '@/lib/programs';
import { colors, radius, space } from '@/lib/theme';

/** One program: header, dates and source, what it is, and the facilities taking part. */
export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram(id);
  const data = program.data;
  const [now] = useState(() => new Date());

  if (!data) {
    return program.isPending ? <ActivityIndicator style={styles.spinner} color={colors.brand} /> : (
      <View style={styles.page}><Notice tone="danger">{program.error instanceof ApiError && program.error.status === 404 ? 'This program has ended or was withdrawn.' : 'Could not load this program. Check your connection.'}</Notice></View>
    );
  }

  const style = CATEGORY_STYLE[data.category.value] ?? DEFAULT_CATEGORY_STYLE;
  const facilities = data.facilities ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: data.category.label }} />

      <View style={[styles.hero, { backgroundColor: style.soft }]}>
        <View style={styles.heroIcon}><Ionicons name={style.icon} size={26} color={style.color} /></View>
        <AppText style={[styles.category, { color: style.color }]}>{data.category.label.toUpperCase()}</AppText>
        <AppText variant="heading" accessibilityRole="header">{data.title}</AppText>
        <AppText variant="muted" style={styles.summary}>{data.summary}</AppText>
        <View style={styles.facts}>
          <View style={styles.fact}><Ionicons name="calendar-outline" size={16} color={style.color} /><AppText style={styles.factText}>{programDates(data)}</AppText></View>
          <View style={styles.fact}><Ionicons name="time-outline" size={16} color={style.color} /><AppText style={styles.factText}>{programTiming(data, now)}</AppText></View>
          <View style={styles.fact}><Ionicons name="business-outline" size={16} color={style.color} /><AppText style={styles.factText}>{facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'}</AppText></View>
        </View>
      </View>

      <Card title="About this program" icon="information-circle-outline">
        <AppText style={styles.body}>{data.description}</AppText>
        {data.source && (
          <AppText variant={data.source.url ? 'link' : 'small'} onPress={data.source.url ? () => void Linking.openURL(data.source!.url!) : undefined}>
            Source: {data.source.name}{data.source.url ? ' ↗' : ''}
          </AppText>
        )}
      </Card>

      <AppText style={styles.groupLabel}>Where to go</AppText>
      {facilities.length === 0 ? (
        <Notice>No facilities listed yet. Ask your local health center.</Notice>
      ) : (
        <ListGroup>
          {facilities.map((facility) => (
            <ListRow key={facility.id} icon="business-outline" label={facility.name} detail={[facility.city, facility.region].filter(Boolean).join(', ') || undefined} onPress={() => router.push(`/facilities/${facility.id}`)} />
          ))}
        </ListGroup>
      )}
      <Notice tone="warning">Schedules can change. Call the facility before you go.</Notice>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  spinner: { marginTop: space.xl },
  hero: { borderRadius: radius.card + 4, padding: space.lg, gap: space.sm },
  heroIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: space.xs },
  summary: { lineHeight: 21 },
  facts: { gap: 6, marginTop: space.xs, backgroundColor: '#ffffffb3', borderRadius: radius.control, padding: space.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  factText: { fontWeight: '500' },
  body: { lineHeight: 22 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: space.sm },
});
