"use client";

import dynamic from "next/dynamic";

// Динамічний імпорт самої карти
const OSMMap = dynamic(() => import("./OSMMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse dark:bg-zinc-800 rounded-3xl" />
});

// Додаємо інтерфейс для пропсів
interface CategoryMapProps {
  selected?: {
    lat: number;
    lng: number;
    label: string;
  };
}

export default function CategoryMap({ selected }: CategoryMapProps) {
  return (
    <div className="h-full w-full">
      {/* Передаємо selected далі в OSMMap */}
      <OSMMap selected={selected} />
    </div>
  );
}