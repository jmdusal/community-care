import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { formatTime } from '@/lib/booking';
import { type QueueAction, type QueueTicket, useCallNext, useCounterName, useMoveTicket, useQueue } from '@/lib/staff';
import { colors, radius, shadow, space } from '@/lib/theme';
import { CheckInSheet } from './CheckInSheet';
import { WalkInSheet } from './WalkInSheet';

/** Minutes since a time ("waiting 12 min"). */
function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
}

/**
 * Today's walk-in queue at one facility, same as the web: call the next number to your
 * window, add walk-ins, and move numbers along (serving, done, skip, back in line).
 */
/** Numbers given to booked patients at check-in show their booked time. */
function BookedTag({ ticket }: { ticket: QueueTicket }) {
  return ticket.appointment ? <AppText style={styles.booked}>Booked {formatTime(ticket.appointment.starts_at)}</AppText> : null;
}

export function QueuePanel({ facilityId }: { facilityId: string }) {
  const queue = useQueue(facilityId);
  const callNext = useCallNext(facilityId);
  const move = useMoveTicket(facilityId);
  const [counter, setCounter] = useCounterName();
  const [adding, setAdding] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showFinished, setShowFinished] = useState(false);
  const tickets = queue.data?.data ?? [];
  const now = queue.dataUpdatedAt || 0;
  const active = tickets.filter((ticket) => ticket.status === 'called' || ticket.status === 'serving').sort((a, b) => (b.called_at ?? '').localeCompare(a.called_at ?? ''));
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting');
  const finished = tickets.filter((ticket) => ticket.status === 'done' || ticket.status === 'skipped');
  const error = [callNext.error, move.error].find((item) => item instanceof ApiError) as ApiError | undefined;

  const act = (ticket: QueueTicket, action: QueueAction) => move.mutate({ id: ticket.id, action, counter: action === 'call' ? counter || undefined : undefined });

  if (queue.isPending) {
    return <ActivityIndicator color={colors.brand} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.controls, shadow]}>
        <View style={styles.counterBox}>
          <Ionicons name="desktop-outline" size={18} color={colors.textMuted} />
          <TextInput style={styles.counterInput} placeholder="Your window (e.g. Window 1)" placeholderTextColor={colors.textMuted} value={counter} onChangeText={setCounter} maxLength={30} accessibilityLabel="Your window" />
        </View>
        <Button
          label={waiting.length ? `Call next (${waiting.length} waiting)` : 'Nobody waiting'}
          icon="megaphone-outline"
          loading={callNext.isPending}
          disabled={waiting.length === 0}
          onPress={() => callNext.mutate(counter, { onSuccess: ({ data }) => setMessage(`Calling number ${data.number}`) })}
        />
        <View style={styles.twoButtons}>
          <Button label="Check in booking" variant="secondary" icon="qr-code-outline" onPress={() => { setMessage(null); setCheckingIn(true); }} style={styles.flex} />
          <Button label="Add walk-in" variant="secondary" icon="add" onPress={() => { setMessage(null); setAdding(true); }} style={styles.flex} />
        </View>
      </View>

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="danger">{error.body.message}</Notice>}

      <AppText style={styles.groupLabel}>Now serving</AppText>
      {active.length === 0 ? <AppText variant="muted">Nobody called yet. Press “Call next”.</AppText> : active.map((ticket) => (
        <View key={ticket.id} style={styles.serving}>
          <View style={styles.servingTop}>
            <AppText style={styles.bigNumber}>{ticket.number}</AppText>
            <View style={styles.flex}>
              <AppText style={styles.bold}>{ticket.name ?? 'Walk-in'}</AppText>
              <BookedTag ticket={ticket} />
              <AppText variant="small">{ticket.status === 'serving' ? 'Being served' : 'Called'}{ticket.counter ? ` · ${ticket.counter}` : ''}</AppText>
            </View>
            {ticket.mobile && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Call ${ticket.mobile}`} onPress={() => void Linking.openURL(`tel:${ticket.mobile}`)} style={styles.phone}>
                <Ionicons name="call" size={16} color="#ffffff" />
              </Pressable>
            )}
          </View>
          <View style={styles.actions}>
            {ticket.status === 'called' && <Button label="Serving" variant="secondary" onPress={() => act(ticket, 'serve')} style={styles.action} />}
            <Button label="Done" onPress={() => act(ticket, 'done')} style={styles.action} />
          </View>
          {ticket.status === 'called' && (
            <View style={styles.links}>
              <AppText variant="link" onPress={() => act(ticket, 'call')}>Call again</AppText>
              <AppText variant="link" onPress={() => act(ticket, 'requeue')}>Back in line</AppText>
              <AppText style={styles.danger} onPress={() => act(ticket, 'skip')}>Skip (not here)</AppText>
            </View>
          )}
        </View>
      ))}

      <AppText style={styles.groupLabel}>Waiting ({waiting.length})</AppText>
      {waiting.length === 0 ? <AppText variant="muted">Nobody waiting.</AppText> : (
        <View style={styles.list}>
          {waiting.map((ticket) => (
            <View key={ticket.id} style={styles.row}>
              <AppText style={styles.number}>{ticket.number}</AppText>
              <View style={styles.flex}>
                <AppText>{ticket.name ?? 'Walk-in'}</AppText>
                <BookedTag ticket={ticket} />
                <AppText variant="small">Waiting {minutesSince(ticket.created_at, now)} min</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Call ${ticket.number} now`} onPress={() => act(ticket, 'call')} style={styles.rowButton}><AppText style={styles.rowButtonText}>Call</AppText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Skip ${ticket.number}`} onPress={() => act(ticket, 'skip')} hitSlop={8}><Ionicons name="close-circle-outline" size={22} color={colors.textMuted} /></Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFinished }} onPress={() => setShowFinished(!showFinished)} style={styles.finishedToggle}>
        <AppText style={styles.groupLabel}>Finished today ({finished.length})</AppText>
        <Ionicons name={showFinished ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {showFinished && finished.map((ticket) => (
        <View key={ticket.id} style={styles.row}>
          <AppText style={[styles.number, styles.muted]}>{ticket.number}</AppText>
          <AppText style={styles.flex}>{ticket.name ?? 'Walk-in'}</AppText>
          {ticket.status === 'skipped' ? (
            <Pressable accessibilityRole="button" onPress={() => act(ticket, 'requeue')} style={styles.rowButton}><AppText style={styles.rowButtonText}>Back in line</AppText></Pressable>
          ) : <AppText style={styles.doneTag}>Done</AppText>}
        </View>
      ))}

      <CheckInSheet key={checkingIn ? 'check-in-open' : 'check-in-closed'} visible={checkingIn} facilityId={facilityId} onClose={() => setCheckingIn(false)} />
      <WalkInSheet key={adding ? 'walk-in-open' : 'walk-in-closed'} visible={adding} facilityId={facilityId} onClose={() => setAdding(false)} onDone={(ticket) => { setAdding(false); setMessage(`Walk-in added: number ${ticket.number}`); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  twoButtons: { flexDirection: 'row', gap: space.sm },
  booked: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '600', color: colors.brand, backgroundColor: colors.brandSoft, paddingHorizontal: space.sm, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  wrap: { gap: space.md },
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  muted: { color: colors.textMuted },
  controls: { gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.md },
  counterBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 46, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md },
  counterInput: { flex: 1, fontSize: 16, color: colors.text },
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  serving: { gap: space.sm, backgroundColor: colors.brandSoft, borderRadius: radius.card, padding: space.md, borderWidth: 1, borderColor: '#99f6e4' },
  servingTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bigNumber: { fontSize: 34, fontWeight: '800', color: colors.brandDark, fontVariant: ['tabular-nums'] },
  phone: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1, minHeight: 44 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  danger: { color: colors.danger, fontWeight: '500' },
  list: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  number: { width: 48, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.brandSoft },
  rowButtonText: { color: colors.brandDark, fontWeight: '700', fontSize: 13 },
  finishedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  doneTag: { fontSize: 12, fontWeight: '700', color: colors.success, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
});
