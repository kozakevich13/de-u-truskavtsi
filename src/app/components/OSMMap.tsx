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

function MapController({ point }: { point?: SelectedPoint }) {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    if (point) {
      const lat = Number(point.lat);
      const lng = Number(point.lng);

      if (!isNaN(lat) && !isNaN(lng) && typeof lat === 'number' && typeof lng === 'number') {
        try {
          map.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });
        } catch (e) {
          console.error("Leaflet flyTo error:", e);
        }
      }
    }

    return () => clearTimeout(timer);
  }, [point, map]);
  
  return null;
}

export default function OSMMap({ selected }: { selected?: SelectedPoint }) {
  const defaultCenter: [number, number] = [49.279, 23.505];
  
  const hasValidCoords = selected && !isNaN(selected.lat) && !isNaN(selected.lng);
  const center = hasValidCoords ? [selected.lat, selected.lng] : defaultCenter;

  return (
    <div className="h-full w-full bg-zinc-200 dark:bg-zinc-800">
      <MapContainer
        center={center as [number, number]}
        zoom={hasValidCoords ? 17 : 14}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController point={selected} />

        {hasValidCoords && (
          <Marker position={[selected.lat, selected.lng]}>
            <Popup autoPan>{selected.label}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}