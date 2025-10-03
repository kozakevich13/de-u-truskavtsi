// src/components/OSMMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type SelectedPoint = {
  lat: number;
  lng: number;
  label?: string;
};

function FlyTo({ point }: { point?: SelectedPoint }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], 17, { duration: 0.6 });
  }, [point, map]);
  return null;
}

export default function OSMMap({ selected }: { selected?: SelectedPoint }) {
  return (
    <MapContainer
      center={[49.279, 23.505]}
      zoom={14}
      style={{ width: "100%", height: "400px", borderRadius: "16px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyTo point={selected} />

      {selected && (
        <Marker position={[selected.lat, selected.lng]}>
          <Popup autoPan>{selected.label ?? "Обрана локація"}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
