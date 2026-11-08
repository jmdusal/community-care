import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { CATEGORY_STYLE, DEFAULT_CATEGORY_STYLE, PROGRAM_CATEGORIES, programDates, programTiming, usePrograms } from '@/lib/programs';
import { colors, radius, space } from '@/lib/theme';

/** Current public health programs: intro, category filter, and a card per program. */
export default function ProgramsScreen() {
  const [category, setCategory] = useState('');
  const programs = usePrograms(category);
  // Read the clock once per visit (rendering must not depend on a changing clock).
  const [now] = useState(() => new Date());

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={programs.data?.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={programs.isRefetching}
      onRefresh={() => void programs.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenIntro icon="megaphone-outline" title="Health programs">
            Free public health campaigns near you, such as vaccination drives and check-ups, and the facilities taking part.
          </ScreenIntro>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {PROGRAM_CATEGORIES.map((item) => <Chip key={item.value || 'all'} label={item.label} active={category === item.value} onPress={() => setCategory(item.value)} />)}
          </ScrollView>
          {programs.data && <AppText variant="small">{programs.data.meta.total} current {programs.data.meta.total === 1 ? 'program' : 'programs'}</AppText>}
        </View>
      }
      ListEmptyComponent={programs.isPending ? <ActivityIndicator color={colors.brand} /> : (
        <View style={styles.empty}>
          <Ionicons name="calendar-clear-outline" size={28} color="#a1a1aa" />
          <AppText variant="muted" style={styles.center}>No current programs here. Check back soon, or ask your local health center.</AppText>
        </View>
      )}
      renderItem={({ item }) => {
        const style = CATEGORY_STYLE[item.category.value] ?? DEFAULT_CATEGORY_STYLE;

        return (
          <Link href={`/programs/${item.id}`} asChild>
            <Pressable accessibilityRole="link" accessibilityLabel={`${item.title}, ${item.category.label}`}>
              {({ pressed }) => (
                <View style={[styles.card, pressed && styles.pressed]}>
                  <View style={[styles.stripe, { backgroundColor: style.color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.top}>
                      <View style={[styles.iconBox, { backgroundColor: style.soft }]}><Ionicons name={style.icon} size={20} color={style.color} /></View>
                      <View style={styles.flex}>
                        <AppText style={[styles.category, { color: style.color }]}>{item.category.label.toUpperCase()}</AppText>
                        <AppText variant="title">{item.title}</AppText>
                      </View>
                    </View>
                    <AppText variant="muted" numberOfLines={3}>{item.summary}</AppText>
                    <View style={styles.footer}>
                      <View style={styles.metaItem}><Ionicons name="calendar-outline" size={14} color={colors.textMuted} /><AppText variant="small">{programDates(item)}</AppText></View>
                      {item.facility_count !== undefined && (
                        <View style={styles.metaItem}><Ionicons name="business-outline" size={14} color={colors.textMuted} /><AppText variant="small">{item.facility_count} {item.facility_count === 1 ? 'facility' : 'facilities'}</AppText></View>
                      )}
                      <AppText style={[styles.timing, { color: style.color, backgroundColor: style.soft }]}>{programTiming(item, now)}</AppText>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  header: { gap: space.md, marginBottom: space.xs },
  chips: { gap: space.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  pressed: { backgroundColor: '#f4f4f5' },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: space.lg, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timing: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', backgroundColor: colors.surface },
});
