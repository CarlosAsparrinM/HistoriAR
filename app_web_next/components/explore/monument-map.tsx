'use client';

import 'leaflet/dist/leaflet.css';
import { divIcon } from 'leaflet';
import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet';

import type { Monument } from '@/lib/api/schemas';
import { hasCoordinates } from '@/lib/format';

export function MonumentMap({ monuments }: { monuments: Monument[] }) {
  const markers = monuments.filter(
    (monument): monument is Monument & { location: { lat: number; lng: number } } => hasCoordinates(monument.location),
  );
  const center = markers[0] ? [markers[0].location.lat, markers[0].location.lng] as [number, number] : [-12.0464, -77.0428] as [number, number];
  const markerIcon = divIcon({
    className: 'flutter-map-marker',
    html: renderToStaticMarkup(<MapPin size={36} color="#8c3b1f" fill="#8c3b1f" />),
    iconSize: [44, 44],
    iconAnchor: [22, 40],
  });
  return (
    <MapContainer className="map" center={center} zoom={12} scrollWheelZoom>
      <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {markers.map((monument) => (
        <Marker key={monument._id} position={[monument.location.lat, monument.location.lng]} icon={markerIcon}>
          <Tooltip>{monument.name}</Tooltip>
          <Popup><Link href={`/monumentos/${monument._id}`}>{monument.name}</Link></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
