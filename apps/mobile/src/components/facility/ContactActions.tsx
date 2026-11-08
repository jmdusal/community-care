import { Linking, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { type FacilityDetail, recordEvent } from '@/lib/directory';
import { directionsUrl } from '@/lib/format';
import { space } from '@/lib/theme';

/** Tap to call, email, open website, or get directions in the maps app. */
export function ContactActions({ facility }: { facility: FacilityDetail }) {
  const phones = facility.contacts.filter((contact) => contact.type === 'phone');
  const others = facility.contacts.filter((contact) => contact.type !== 'phone');

  return (
    <View style={styles.list}>
      {facility.coordinates && (
        <Button
          label="Get directions"
          icon="navigate"
          accessibilityHint="Opens your maps app"
          onPress={() => {
            recordEvent(facility.id, 'directions_click');
            void Linking.openURL(directionsUrl(facility.coordinates!.lat, facility.coordinates!.lng));
          }}
        />
      )}
      {phones.map((phone) => (
        <Button
          key={phone.value}
          variant="secondary"
          icon="call-outline"
          label={`Call ${phone.value}`}
          onPress={() => {
            recordEvent(facility.id, 'call_click');
            void Linking.openURL(`tel:${phone.value.replace(/[^\d+]/g, '')}`);
          }}
        />
      ))}
      {others.map((contact) => (
        <AppText
          key={contact.value}
          variant="link"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(contact.type === 'email' ? `mailto:${contact.value}` : /^https?:/.test(contact.value) ? contact.value : `https://${contact.value}`)}
        >
          {contact.value}
        </AppText>
      ))}
      {facility.contacts.length === 0 && <AppText variant="muted">No public contact details listed.</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: space.sm } });
