import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, radius } from '@/lib/theme';

export type MapPoint = { id: string; name: string; lat: number; lng: number };

/**
 * OpenStreetMap through Leaflet in a WebView: free, no API key (attribution shown, as
 * OpenStreetMap requires). One point is shown as a pin; several fit the view. Tapping a
 * point's label reports its id.
 */
export function FacilityMap({ points, height = 220, onOpen }: { points: MapPoint[]; height?: number; onOpen?: (id: string) => void }) {
  if (points.length === 0) {
    return null;
  }

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}.leaflet-popup-content{font:14px -apple-system,Roboto,sans-serif}.open{color:#0f766e;font-weight:600;text-decoration:underline}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var points = ${JSON.stringify(points)};
var map = L.map('map', { zoomControl: true, attributionControl: true });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
var bounds = [];
points.forEach(function (p) {
  var m = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#ffffff', weight: 2, fillColor: '#0f766e', fillOpacity: 1 }).addTo(map);
  var label = document.createElement('div');
  label.innerHTML = '<strong></strong><br><span class="open">Open</span>';
  label.querySelector('strong').textContent = p.name;
  label.querySelector('.open').onclick = function () { window.ReactNativeWebView.postMessage(p.id); };
  m.bindPopup(label);
  bounds.push([p.lat, p.lng]);
});
if (points.length === 1) { map.setView(bounds[0], 16); } else { map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 }); }
</script></body></html>`;

  return (
    <View style={[styles.frame, { height }]} accessibilityLabel={points.length === 1 ? `Map showing ${points[0].name}` : `Map of ${points.length} facilities`}>
      <WebView originWhitelist={['*']} source={{ html }} onMessage={(event: WebViewMessageEvent) => onOpen?.(event.nativeEvent.data)} scrollEnabled={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: '#e4e4e7' },
});
