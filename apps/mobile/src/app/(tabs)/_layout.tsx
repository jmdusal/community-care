import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useAssistantStatus } from '@/lib/assistant';
import { isClinicStaff, useMe } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { EmergencyButton } from '@/components/facility/EmergencyButton';
import { colors } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} size={size} color={typeof color === 'string' ? color : undefined} />;
}

function icon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon name={name} color={color} size={size} />;
  };
}

/** Search · Programs · Ask (when switched on) · Account (with the unread count). */
export default function TabsLayout() {
  const assistant = useAssistantStatus();
  const me = useMe();
  const notifications = useNotifications(Boolean(me.data));
  const unread = notifications.data?.meta.unread ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerRight: EmergencyButton,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.text },
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerTitle: 'CommunityCare', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="programs" options={{ title: 'Programs', headerTitle: 'Health programs', tabBarIcon: icon('megaphone-outline') }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask', headerTitle: 'Ask CommunityCare', tabBarIcon: icon('chatbubbles-outline'), href: assistant.data?.enabled ? undefined : null }} />
      <Tabs.Screen name="clinic" options={{ title: 'Clinic', headerTitle: 'Clinic appointments', tabBarIcon: icon('medkit-outline'), href: isClinicStaff(me.data) ? undefined : null }} />
      <Tabs.Screen name="account" options={{ title: 'Account', headerTitle: me.data ? 'My account' : 'Account', tabBarIcon: icon('person-circle-outline'), tabBarBadge: unread > 0 ? unread : undefined }} />
    </Tabs>
  );
}
