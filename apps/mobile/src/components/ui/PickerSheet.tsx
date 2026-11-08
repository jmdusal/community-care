import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/lib/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export type PickerOption = { value: string; label: string };

/** A full-screen list to choose one option, with search (cities, barangays). */
export function PickerSheet({ visible, title, options, loading, onPick, onClose, allLabel }: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  loading?: boolean;
  onPick: (option: PickerOption | null) => void;
  onClose: () => void;
  allLabel: string;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const filtered = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(text.trim().toLowerCase())), [options, text]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header">{title}</AppText>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><AppText variant="link">Close</AppText></Pressable>
        </View>
        <TextInput style={styles.search} placeholder="Search" placeholderTextColor={colors.textMuted} value={text} onChangeText={setText} accessibilityLabel={`Search ${title}`} autoCorrect={false} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={text ? undefined : <Row label={allLabel} onPress={() => { onPick(null); setText(''); }} />}
          ListEmptyComponent={<AppText variant="muted" style={styles.empty}>{loading ? 'Loading…' : 'Nothing matches.'}</AppText>}
          renderItem={({ item }) => <Row label={item.label} onPress={() => { onPick(item); setText(''); }} />}
        />
        <View style={styles.footer}><Button variant="secondary" label="Cancel" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <AppText>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg },
  close: { minHeight: 44, justifyContent: 'center' },
  search: { marginHorizontal: space.lg, marginBottom: space.sm, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: space.md, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
  row: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.brandSoft },
  empty: { padding: space.lg },
  footer: { padding: space.lg },
});
