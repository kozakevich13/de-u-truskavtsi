// src/components/MapPlaceholder.tsx
"use client";

export default function MapPlaceholder() {
  return (
    <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="text-center">
        <p className="text-sm font-medium">Мапа зʼявиться тут</p>
        <p className="text-xs text-zinc-500">
          Пізніше інтегруємо Leaflet / Mapbox / Google Maps
        </p>
      </div>
    </div>
  );
}
