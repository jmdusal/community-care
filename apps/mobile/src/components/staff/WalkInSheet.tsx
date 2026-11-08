import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { type QueueTicket, useAddWalkIn } from '@/lib/staff';
import { colors, radius, space } from '@/lib/theme';

/** Gives a walk-in the next number. Name and mobile are optional (the parent remounts it each time). */
export function WalkInSheet({ visible, facilityId, onDone, onClose }: { visible: boolean; facilityId: string; onDone: (ticket: QueueTicket) => void; onClose: () => void }) {
  const add = useAddWalkIn(facilityId);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const error = add.error instanceof ApiError ? add.error : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.card}>
          <AppText variant="title">Add a walk-in</AppText>
          <AppText variant="muted">They get the next number. Name and mobile are optional.</AppText>
          {error && !error.body.fields && <Notice tone="danger">{error.body.message}</Notice>}
          <TextField label="Name (optional)" icon="person-outline" value={name} onChangeText={setName} maxLength={120} autoFocus />
          <TextField label="Mobile (optional)" icon="call-outline" placeholder="0917 123 4567" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} error={error?.field('mobile')} />
          <View style={styles.row}>
            <Button variant="secondary" label="Cancel" onPress={onClose} style={styles.flex} />
            <Button
              label="Give next number"
              icon="ticket-outline"
              loading={add.isPending}
              onPress={() => add.mutate({ name: name.trim() || undefined, mobile: mobile.trim() || undefined }, { onSuccess: ({ data }) => onDone(data) })}
              style={styles.grow}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9,9,11,0.4)' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: radius.card + 4, borderTopRightRadius: radius.card + 4, padding: space.lg, paddingBottom: space.xl * 1.5, gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  grow: { flex: 2 },
});
