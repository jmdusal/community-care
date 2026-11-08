import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { clockTime, type TodayStatus, useSaveToday } from '@/lib/today';
import { colors, radius, space } from '@/lib/theme';

type Doctor = 'in' | 'out' | null;
type Opening = 'open' | 'closing_early' | 'closed' | null;

/**
 * Staff post "Today at this facility": doctor, opening, out-of-stock items and a note.
 * Starts from today's saved values (the parent remounts it each time it opens).
 */
export function TodaySheet({ visible, facilityId, facilityName, current, onClose }: { visible: boolean; facilityId: string; facilityName: string; current: TodayStatus | null; onClose: () => void }) {
  const save = useSaveToday(facilityId);
  const [doctor, setDoctor] = useState<Doctor>(current?.doctor ?? null);
  const [opening, setOpening] = useState<Opening>(current?.opening ?? null);
  const [closesAt, setClosesAt] = useState(current?.closes_at ?? '15:00');
  const [items, setItems] = useState<string[]>(current?.out_of_stock ?? []);
  const [item, setItem] = useState('');
  const [note, setNote] = useState(current?.note ?? '');
  const error = save.error instanceof ApiError ? save.error : null;

  const addItem = () => {
    const value = item.trim();
    if (value.length >= 2 && !items.includes(value) && items.length < 12) {
      setItems([...items, value]);
    }
    setItem('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="title">Today at {facilityName}</AppText>
            <AppText variant="small">{current?.updated_at ? `Last updated ${clockTime(current.updated_at)}` : 'Not posted today'} · clears itself tomorrow</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textMuted} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {save.isSuccess && <Notice tone="success">Posted. The public facility page shows it now.</Notice>}
          {error && !error.body.fields && <Notice tone="danger">{error.body.message}</Notice>}

          <AppText style={styles.label}>Doctor</AppText>
          <View style={styles.chips}>
            <Chip label="Not set" active={doctor === null} onPress={() => setDoctor(null)} />
            <Chip label="In today" active={doctor === 'in'} onPress={() => setDoctor('in')} />
            <Chip label="Not in" active={doctor === 'out'} onPress={() => setDoctor('out')} />
          </View>

          <AppText style={styles.label}>Opening</AppText>
          <View style={styles.chips}>
            <Chip label="Not set" active={opening === null} onPress={() => setOpening(null)} />
            <Chip label="Open" active={opening === 'open'} onPress={() => setOpening('open')} />
            <Chip label="Closing early" active={opening === 'closing_early'} onPress={() => setOpening('closing_early')} />
            <Chip label="Closed" active={opening === 'closed'} onPress={() => setOpening('closed')} />
          </View>
          {opening === 'closing_early' && <TextField label="Closes at (24-hour, e.g. 15:00)" value={closesAt} onChangeText={setClosesAt} keyboardType="numbers-and-punctuation" maxLength={5} error={error?.field('closes_at')} />}

          <AppText style={styles.label}>Out of stock</AppText>
          {items.length > 0 && (
            <View style={styles.chips}>
              {items.map((name) => (
                <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={() => setItems(items.filter((value) => value !== name))} style={styles.stock}>
                  <AppText style={styles.stockText}>{name}</AppText>
                  <Ionicons name="close" size={14} color={colors.warning} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.addRow}>
            <TextInput style={styles.input} placeholder="e.g. BCG vaccine" placeholderTextColor={colors.textMuted} value={item} onChangeText={setItem} maxLength={60} returnKeyType="done" onSubmitEditing={addItem} />
            <Button label="Add" variant="secondary" onPress={addItem} disabled={item.trim().length < 2} />
          </View>

          <TextField label="Note for the public (optional)" value={note} onChangeText={setNote} maxLength={160} placeholder="e.g. Bring your baby book" />

          <Button label="Post for today" icon="checkmark" loading={save.isPending} onPress={() => save.mutate({ doctor, opening, closes_at: opening === 'closing_early' ? closesAt : null, out_of_stock: items, note: note.trim() || null })} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.warningSoft },
  stockText: { fontSize: 13, color: colors.warning },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: space.md, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
});
