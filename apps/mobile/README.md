# CommunityCare mobile (React Native + Expo)

The public CommunityCare app for Android and iOS, with the same features as the public website:

- **Search:** facility name as you type, region, then any city/municipality and barangay (all Philippine places, searchable), or **Near me**. Results as a **list or a map** (OpenStreetMap, no API key).
- **Facility page:** map, call, directions, opening hours, services, verification and source, current health programs, **Request an appointment** (participating facilities) and **Save for offline use**.
- **Health programs:** current campaigns by category, with participating facilities.
- **Ask:** the assistant (shown when switched on in admin Settings; answers only from approved records, free "grounded" mode by default).
- **Account:** create an account or sign in (two-factor codes supported), **My appointments** (reference code, status, cancel), notifications, saved facilities, sign out.
- **Notifications:** live while the app is open (Laravel Reverb), and push notifications when it is closed (see below).
- The **911 bar** is always visible at the bottom.

## Run

```sh
cd apps/mobile
npm install
cp .env.example .env        # API address and Reverb settings
npx expo start --ios        # or press i (iOS Simulator) / a (Android emulator)
```

| Where the app runs | `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_REVERB_HOST` |
|---|---|---|
| iOS Simulator on this Mac | `http://communitycare-api.test` | `localhost` |
| Android emulator or a real phone | your Mac's LAN address (Herd) or a tunnel such as `herd share` | your Mac's LAN address |

Live notifications need the API's `php artisan reverb:start` and `php artisan queue:listen` running.

## Push notifications (app closed)

Push needs a **development or store build**. Expo Go on Android cannot receive remote pushes (since SDK 53), and every build needs an EAS project id. Until then the app skips push registration and still gets notifications live while open.

1. `npx eas-cli@latest login` then `npx eas-cli@latest init` (adds `extra.eas.projectId` to the app config).
2. Build: `npx eas-cli@latest build --profile development --platform android` (or `ios`), and install it on a real phone.
3. Sign in on the phone and allow notifications. The app registers its Expo push token with `POST /api/v1/me/push-tokens`.
4. From then on, appointment updates arrive as push notifications. Tapping one opens the right screen. Signing out unregisters the phone.

The API sends through Expo's push service (`EXPO_PUSH_URL`). For production, upload your APNs and FCM credentials to EAS.

## Structure

```
src/
├── app/
│   ├── (tabs)/             # index (search), programs, ask, account
│   ├── facilities/[id]     # facility page with map, booking, programs
│   ├── programs/[id]
│   ├── sign-in, register   # modals; sign-in handles two-factor codes
│   ├── notifications, saved
│   └── _layout.tsx         # stack, 911 bar, live notification banner, push taps
├── components/ui/          # AppText, Button, Card, Chip, Notice, PickerSheet, TextField
├── components/facility/    # FacilityCard, FacilityMap (Leaflet/OSM WebView), BookingPanel, …
├── components/search/      # PlaceFilters (region → city → barangay)
├── components/account/     # AppointmentCard, LiveBanner
└── lib/                    # api (token in SecureStore), auth, directory, places, programs, booking,
                            # assistant, notifications, live (Reverb client), push, saved, theme
```

## Checks

```sh
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform ios --platform android
```
