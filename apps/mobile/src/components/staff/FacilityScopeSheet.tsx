import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import type { CurrentUser } from '@/lib/auth';
import { type StaffScope, useFacilitySearchForStaff } from '@/lib/staff';
import { colors, radius, space } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/**
 * Choose which facilities the Clinic tab shows: all of them, or tick one or several.
 * Assigned staff pick from their facilities; admins search (2+ letters).
 */
export function FacilityScopeSheet({ visible, user, scope, onApply, onClose }: {
  visible: boolean;
  user: CurrentUser;
  scope: StaffScope;
  onApply: (scope: StaffScope) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const seesAll = user.sees_all_facilities ?? false;
  const allLabel = seesAll ? 'All facilities' : 'All my facilities';
  const [text, setText] = useState('');
  // Starts from what is shown now; the parent remounts the sheet each time it opens.
  const [picked, setPicked] = useState<Map<string, string>>(() => {
    const names = new Map((user.facilities ?? []).map((facility) => [facility.id, facility.name]));

    return new Map(scope.facilityIds.map((id) => [id, names.get(id) ?? (scope.facilityIds.length === 1 ? scope.name : 'Selected facility')]));
  });
  const query = useDebouncedValue(text.trim(), 250);
  const search = useFacilitySearchForStaff(query, visible && seesAll);

  const assigned = (user.facilities ?? []).filter((facility) => facility.name.toLowerCase().includes(text.trim().toLowerCase()));
  const options = seesAll
    ? (query.length >= 2 ? (search.data ?? []).map((facility) => ({ id: facility.id, name: facility.name, hint: facility.city ?? undefined })) : [...picked].map(([id, name]) => ({ id, name, hint: undefined })))
    : assigned.map((facility) => ({ id: facility.id, name: facility.name, hint: undefined }));

  const toggle = (id: string, name: string) => setPicked((current) => {
    const next = new Map(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.set(id, name);
    }

    return next;
  });

  const apply = () => {
    const ids = [...picked.keys()];
    onApply(ids.length === 0 ? { facilityIds: [], name: allLabel } : { facilityIds: ids, name: ids.length === 1 ? picked.get(ids[0])! : `${ids.length} facilities` });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header">Facilities</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textMuted} /></Pressable>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={styles.search} placeholder={seesAll ? 'Search facilities (2+ letters)' : 'Search your facilities'} placeholderTextColor={colors.textMuted} value={text} onChangeText={setText} autoCorrect={false} accessibilityLabel="Search facilities" />
        </View>

        <Pressable accessibilityRole="button" onPress={() => onApply({ facilityIds: [], name: allLabel })} style={styles.allRow}>
          <Ionicons name="globe-outline" size={20} color={colors.brandDark} />
          <AppText style={styles.allText}>{allLabel}</AppText>
          {scope.facilityIds.length === 0 && <Ionicons name="checkmark" size={20} color={colors.brandDark} />}
        </Pressable>

        <AppText style={styles.groupLabel}>{seesAll && query.length < 2 ? (picked.size ? 'Ticked facilities' : 'Search to find facilities') : 'Tick one or more'}</AppText>
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText variant="muted" style={styles.empty}>{search.isFetching ? 'Searching…' : seesAll && query.length < 2 ? 'Type at least 2 letters.' : 'Nothing matches.'}</AppText>}
          renderItem={({ item }) => {
            const checked = picked.has(item.id);

            return (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => toggle(item.id, item.name)} style={styles.row}>
                <View style={[styles.box, checked && styles.boxOn]}>{checked && <Ionicons name="checkmark" size={15} color="#ffffff" />}</View>
                <View style={styles.flex}>
                  <AppText style={checked ? styles.bold : undefined}>{item.name}</AppText>
                  {item.hint && <AppText variant="small">{item.hint}</AppText>}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={styles.footer}>
          <Button variant="secondary" label="Clear" onPress={() => setPicked(new Map())} style={styles.flex} />
          <Button label={picked.size === 0 ? `Show ${allLabel.toLowerCase()}` : `Show ${picked.size} ${picked.size === 1 ? 'facility' : 'facilities'}`} onPress={apply} style={styles.grow} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: space.md },
  search: { flex: 1, fontSize: 16, color: colors.text },
  allRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, marginTop: space.md, paddingHorizontal: space.md, borderRadius: radius.control, backgroundColor: colors.brandSoft },
  allText: { flex: 1, fontWeight: '600', color: colors.brandDark },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: space.lg, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  flex: { flex: 1 },
  grow: { flex: 2 },
  bold: { fontWeight: '600' },
  empty: { paddingVertical: space.lg, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: space.sm, paddingTop: space.md },
});
