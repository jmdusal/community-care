import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { REPORT_REASONS, useReportFacility } from '@/lib/today';
import { colors, radius, space } from '@/lib/theme';

/** "Report wrong information": anyone tells the facility team something is wrong (remounted on open). */
export function ReportSheet({ visible, facilityId, facilityName, onClose }: { visible: boolean; facilityId: string; facilityName: string; onClose: () => void }) {
  const report = useReportFacility(facilityId);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const error = report.error instanceof ApiError ? report.error : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AppText variant="title">{report.isSuccess ? 'Thank you' : 'What is wrong?'}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.textMuted} /></Pressable>
        </View>
        {report.isSuccess ? (
          <View style={styles.body}>
            <Notice tone="success">The {facilityName} team will check it and fix the page if needed.</Notice>
            <Button label="Done" onPress={onClose} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <AppText variant="muted">Tell the {facilityName} team. No account needed.</AppText>
            {error && !error.body.fields && <Notice tone="danger">{error.status === 429 ? 'Too many reports from this connection. Please try again later.' : error.body.message}</Notice>}
            {REPORT_REASONS.map((item) => {
              const on = reason === item.value;

              return (
                <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setReason(item.value)} style={[styles.option, on && styles.optionOn]}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.brandDark : colors.textMuted} />
                  <AppText style={on ? styles.bold : undefined}>{item.label}</AppText>
                </Pressable>
              );
            })}
            <TextField label={reason === 'other' ? 'What is wrong?' : 'Details (optional)'} value={details} onChangeText={setDetails} multiline maxLength={500} placeholder="e.g. The number rings out" error={error?.field('details')} />
            <TextField label="Your email or mobile (optional)" hint="Only if you are happy for the team to ask you about it." value={contact} onChangeText={setContact} maxLength={120} />
            <Button label="Send report" icon="paper-plane-outline" loading={report.isPending} disabled={!reason} onPress={() => report.mutate({ reason, details: details.trim() || undefined, contact: contact.trim() || undefined })} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 50, paddingHorizontal: space.md, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.brandDark, backgroundColor: colors.brandSoft },
  bold: { fontWeight: '600' },
});
