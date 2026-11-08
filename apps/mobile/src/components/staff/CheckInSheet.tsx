import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/lib/api';
import { formatTime } from '@/lib/booking';
import { type CheckInResult, useCheckIn } from '@/lib/staff';
import { colors, radius, space } from '@/lib/theme';

/**
 * Desk check-in for booked patients: scan the QR code on their phone, or type the
 * reference code. A confirmed appointment for today gets the next queue number.
 * The parent remounts it each time it opens, so it always starts fresh.
 */
export function CheckInSheet({ visible, facilityId, facilityName, onClose }: { visible: boolean; facilityId: string; facilityName?: string; onClose: () => void }) {
  const checkIn = useCheckIn(facilityId);
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The camera reports the same code many times a second: check each one in once,
  // and ignore a repeat of the same code for a few seconds.
  const busy = useRef(false);
  const last = useRef({ value: '', at: 0 });

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy.current) {
      return;
    }
    busy.current = true;
    setError(null);
    setResult(null);
    checkIn.mutate(trimmed, {
      onSuccess: ({ data }) => {
        setResult(data);
        setCode('');
      },
      onError: (failure) => setError(failure instanceof ApiError ? (failure.field('code') ?? failure.body.message) : 'Could not check in. Try again.'),
      onSettled: () => {
        busy.current = false;
      },
    });
  };

  const onScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    if (data === last.current.value && now - last.current.at < 4000) {
      return;
    }
    last.current = { value: data, at: now };
    submit(data);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.flex}>
              <AppText variant="title">Check in a booking</AppText>
              <AppText variant="muted">Scan the QR code on their appointment. They get the next number in the queue at {facilityName ?? 'this facility'}.</AppText>
            </View>
            <Button label="Close" variant="ghost" onPress={onClose} />
          </View>

          {result && (
            <View style={[styles.result, result.already_checked_in ? styles.resultRepeat : styles.resultNew]} accessibilityLiveRegion="polite">
              <AppText style={styles.bigNumber}>{result.ticket.number}</AppText>
              <View style={styles.flex}>
                <AppText style={styles.bold}>{result.already_checked_in ? 'Already checked in' : 'Checked in'}: {result.appointment.name ?? 'Patient'}</AppText>
                <AppText variant="small">Booked for {formatTime(result.appointment.starts_at)} · {result.appointment.reference_code}</AppText>
              </View>
            </View>
          )}
          {error && <Notice tone="danger">{error}</Notice>}

          {permission?.granted ? (
            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={checkIn.isPending ? undefined : onScanned}
              />
              <View pointerEvents="none" style={styles.frame} />
            </View>
          ) : (
            <View style={styles.cameraOff}>
              <AppText variant="muted" style={styles.center}>
                {permission && !permission.canAskAgain ? 'Camera access is off for CommunityCare. Turn it on in Settings, or type the reference code below.' : 'Allow the camera to scan check-in QR codes.'}
              </AppText>
              {(!permission || permission.canAskAgain) && <Button label="Allow camera" icon="camera-outline" onPress={() => void requestPermission()} />}
            </View>
          )}

          <TextField
            label="Or type the reference code"
            icon="keypad-outline"
            placeholder="CC-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
            maxLength={40}
            returnKeyType="go"
            onSubmitEditing={() => submit(code)}
          />
          <Button label="Check in" icon="checkmark-circle-outline" loading={checkIn.isPending} disabled={!code.trim()} onPress={() => submit(code)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.card, borderWidth: 1 },
  resultNew: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  resultRepeat: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  bigNumber: { fontFamily: 'Menlo', fontSize: 36, fontWeight: '800', color: colors.text },
  bold: { fontWeight: '700' },
  cameraBox: { height: 300, borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 190, height: 190, borderRadius: 16, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  cameraOff: { padding: space.lg, gap: space.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'stretch' },
  center: { textAlign: 'center' },
});
