import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors, radius, space } from '@/lib/theme';

/** Asks for the reason the patient will see when a request is declined or an appointment cancelled. */
export function ReasonSheet({ visible, title, busy, onSubmit, onClose }: { visible: boolean; title: string; busy: boolean; onSubmit: (reason: string) => void; onClose: () => void }) {
  // Empty each time it opens (the parent remounts it).
  const [reason, setReason] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.card}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="muted">The patient sees this reason in their email.</AppText>
          <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Doctor on leave that day" maxLength={300} autoFocus multiline />
          <View style={styles.row}>
            <Button variant="secondary" label="Back" onPress={onClose} style={styles.flex} />
            <Button variant="danger" label={title.startsWith('Decline') ? 'Decline' : 'Cancel appointment'} loading={busy} disabled={reason.trim().length < 3} onPress={() => onSubmit(reason.trim())} style={styles.grow} />
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
