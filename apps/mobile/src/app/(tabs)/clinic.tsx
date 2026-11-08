import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CalendarPanel } from '@/components/staff/CalendarPanel';
import { FacilityScopeSheet } from '@/components/staff/FacilityScopeSheet';
import { QueuePanel } from '@/components/staff/QueuePanel';
import { ReasonSheet } from '@/components/staff/ReasonSheet';
import { TodaySheet } from '@/components/staff/TodaySheet';
import { StaffAppointmentCard } from '@/components/staff/StaffAppointmentCard';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { ApiError } from '@/lib/api';
import { type CurrentUser, isClinicStaff, useMe } from '@/lib/auth';
import { type StaffAction, type StaffAppointment, type StaffView, useStaffAction, useStaffAppointments, useStaffScope } from '@/lib/staff';
import { colors, radius, shadow, space } from '@/lib/theme';
import { clockTime, useTodayStatus } from '@/lib/today';

type ClinicView = StaffView | 'calendar' | 'queue';

const VIEWS: { value: ClinicView; label: string }[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'queue', label: 'Queue' },
];

/** Staff mode: choose facilities (one, several or all), then handle appointment requests. */
export default function ClinicScreen() {
  const me = useMe();

  if (!me.data || !isClinicStaff(me.data)) {
    return <View style={styles.page}><Notice>Sign in with a facility staff account to handle appointments here.</Notice></View>;
  }

  return <Clinic user={me.data} />;
}

function Clinic({ user }: { user: CurrentUser }) {
  const { scope, setScope } = useStaffScope(user);
  const [view, setView] = useState<ClinicView>('requests');
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<{ appointment: StaffAppointment; action: StaffAction } | null>(null);
  const list = useStaffAppointments(view === 'queue' || view === 'calendar' ? 'requests' : view, scope);
  // The queue runs at one facility: the selected one, or (with several / all) one the person picks here.
  const assigned = user.facilities ?? [];
  const queueOptions = scope && scope.facilityIds.length !== 1 ? assigned.filter((facility) => scope.facilityIds.length === 0 || scope.facilityIds.includes(facility.id)) : [];
  const [queuePick, setQueuePick] = useState<string | null>(null);
  const [postingToday, setPostingToday] = useState(false);
  const queueFacility = scope?.facilityIds.length === 1 ? scope.facilityIds[0] : (queueOptions.find((facility) => facility.id === queuePick) ?? queueOptions[0])?.id ?? null;
  const act = useStaffAction();
  const counts = list.data?.meta.counts;
  const setupNeeded = list.error instanceof ApiError && list.error.body.code === 'two_factor_setup_required';

  const run = (appointment: StaffAppointment, action: StaffAction, needsReason: boolean) => {
    if (needsReason) {
      setPending({ appointment, action });

      return;
    }
    act.mutate({ id: appointment.id, action });
  };

  if (!scope) {
    return <ActivityIndicator style={styles.spinner} color={colors.brand} />;
  }

  return (
    <>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={view === 'queue' || view === 'calendar' ? [] : (list.data?.data ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.page}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Facilities: ${scope.name}. Change`} onPress={() => setPicking(true)} style={[styles.scope, shadow]}>
              <View style={styles.scopeIcon}><Ionicons name={scope.facilityIds.length ? 'business' : 'globe-outline'} size={20} color={colors.brandDark} /></View>
              <View style={styles.flex}>
                <AppText variant="small">Showing</AppText>
                <AppText style={styles.scopeName} numberOfLines={1}>{scope.name}</AppText>
              </View>
              <AppText variant="link">Change</AppText>
            </Pressable>

            {queueFacility && (
              <TodayButton facilityId={queueFacility} facilityName={assigned.find((facility) => facility.id === queueFacility)?.name ?? scope.name} onPress={() => setPostingToday(true)} />
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
              {VIEWS.map((item) => {
                const active = view === item.value;
                const count = item.value === 'queue' || item.value === 'calendar' ? undefined : counts?.[item.value];

                return (
                  <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setView(item.value)} style={[styles.tab, active && styles.tabActive]}>
                    <AppText style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</AppText>
                    {count !== undefined && <AppText style={[styles.count, active && styles.countActive]}>{count}</AppText>}
                  </Pressable>
                );
              })}
            </ScrollView>

            {setupNeeded && <Notice tone="warning">Your role needs two-factor sign-in. Set it up on the website (My account), then come back.</Notice>}
            {act.error instanceof ApiError && <Notice tone="danger">{act.error.body.message}</Notice>}
            {act.isSuccess && !act.isPending && <Notice tone="success">Done. The patient has been told.</Notice>}
          </View>
        }
        ListEmptyComponent={view === 'calendar' ? (
          <CalendarPanel scope={scope} busyId={act.isPending ? (act.variables?.id ?? null) : null} onAction={run} />
        ) : view === 'queue' ? (
          queueFacility ? (
            <View style={styles.header}>
              {queueOptions.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickRow}>
                  {queueOptions.map((facility) => <Chip key={facility.id} label={facility.name} active={facility.id === queueFacility} onPress={() => setQueuePick(facility.id)} />)}
                </ScrollView>
              )}
              <QueuePanel key={queueFacility} facilityId={queueFacility} />
            </View>
          ) : <Notice>Tap “Change” above and choose the facility whose queue you run.</Notice>
        ) : list.isPending ? <ActivityIndicator color={colors.brand} /> : setupNeeded ? undefined : (
          <View style={styles.empty}>
            <Ionicons name={view === 'requests' ? 'checkmark-done-outline' : 'calendar-clear-outline'} size={30} color="#a1a1aa" />
            <AppText variant="muted" style={styles.center}>{view === 'requests' ? 'No requests waiting. New ones also arrive as notifications.' : view === 'upcoming' ? 'No confirmed appointments coming up.' : 'Nothing here yet.'}</AppText>
          </View>
        )}
        renderItem={({ item }) => (
          <StaffAppointmentCard appointment={item} busy={act.isPending && act.variables?.id === item.id} onAction={(action, needsReason) => run(item, action, needsReason)} />
        )}
      />

      {queueFacility && postingToday && (
        <TodaySheetLoader facilityId={queueFacility} facilityName={assigned.find((facility) => facility.id === queueFacility)?.name ?? scope.name} onClose={() => setPostingToday(false)} />
      )}
      <FacilityScopeSheet key={picking ? 'scope-open' : 'scope-closed'} visible={picking} user={user} scope={scope} onClose={() => setPicking(false)} onApply={(next) => { setScope(next); setPicking(false); }} />
      <ReasonSheet
        key={pending ? `${pending.appointment.id}-${pending.action}` : 'reason-closed'}
        visible={pending !== null}
        title={pending?.action === 'decline' ? 'Decline request' : 'Cancel appointment'}
        busy={act.isPending}
        onClose={() => setPending(null)}
        onSubmit={(reason) => pending && act.mutate({ id: pending.appointment.id, action: pending.action, reason }, { onSuccess: () => setPending(null) })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  spinner: { marginTop: space.xl },
  header: { gap: space.md },
  pickRow: { gap: space.sm },
  today: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.brandSoft, borderRadius: radius.card, padding: space.md },
  todayTitle: { fontWeight: '700' },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scope: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.md },
  scopeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  scopeName: { fontSize: 16, fontWeight: '700' },
  tabsScroll: { flexGrow: 0, backgroundColor: '#f4f4f5', borderRadius: radius.control },
  tabs: { padding: 4, gap: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 40, paddingHorizontal: 14, borderRadius: 9 },
  tabActive: { backgroundColor: colors.surface, ...shadow },
  tabText: { fontWeight: '600', fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.text },
  count: { fontSize: 10, fontWeight: '700', color: colors.textMuted, backgroundColor: '#e4e4e7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  countActive: { color: '#ffffff', backgroundColor: colors.brandDark },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', backgroundColor: colors.surface },
});

/** "Today at …: Post / Edit", with a one-line summary of what is posted. */
function TodayButton({ facilityId, facilityName, onPress }: { facilityId: string; facilityName: string; onPress: () => void }) {
  const today = useTodayStatus(facilityId);
  const posted = today.data;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Today's status for ${facilityName}`} onPress={onPress} style={styles.today}>
      <Ionicons name={posted ? 'radio-button-on' : 'sunny-outline'} size={20} color={colors.brandDark} />
      <View style={styles.flex}>
        <AppText style={styles.todayTitle} numberOfLines={1}>Today at {facilityName}</AppText>
        <AppText variant="small" numberOfLines={1}>{posted ? `Posted ${clockTime(posted.updated_at)} · tap to update` : 'Doctor in? Out of stock? Tell the public'}</AppText>
      </View>
      <AppText variant="link">{posted ? 'Edit' : 'Post'}</AppText>
    </Pressable>
  );
}

/** Opens the sheet once today's saved values are loaded. */
function TodaySheetLoader({ facilityId, facilityName, onClose }: { facilityId: string; facilityName: string; onClose: () => void }) {
  const today = useTodayStatus(facilityId);

  return today.isPending ? null : <TodaySheet visible facilityId={facilityId} facilityName={facilityName} current={today.data ?? null} onClose={onClose} />;
}
