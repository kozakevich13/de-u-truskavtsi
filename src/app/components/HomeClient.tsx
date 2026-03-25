"use client";

import { useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CategoryFilter from "./CategoryFilter";
import PlaceCard from "./PlaceCard";
import type { Place } from "../types/place";
import { SelectedPoint } from "./OSMMap";
import dynamic from "next/dynamic";

const OSMMap = dynamic(() => import("./OSMMap"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-zinc-100 animate-pulse rounded-3xl dark:bg-zinc-800" />
});

export default function HomeClient({ initialPlaces }: { initialPlaces: Place[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [mapPoint, setMapPoint] = useState<SelectedPoint | undefined>(undefined);

  const categories = [
    { key: "cafe", label: "Кавʼярні" },
    { key: "restaurant", label: "Ресторани" },
    { key: "shop", label: "Магазини" },
    { key: "hotel", label: "Готелі" },
    { key: "park", label: "Парки" },
    { key: "mall", label: "ТЦ" },
  ];

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return initialPlaces.filter((p) => {
      const byQuery = !ql || p.name.toLowerCase().includes(ql) || p.address.toLowerCase().includes(ql);
      const byCat = selected.length === 0 || selected.includes(p.category);
      const byOpen = !openOnly || p.is_open_now;
      return byQuery && byCat && byOpen;
    });
  }, [initialPlaces, q, selected, openOnly]);

  const toggleCat = (key: string) =>
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  return (
    <>
      <div className="sticky top-4 z-[1100] mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/70 p-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SearchBar value={q} onChange={setQ} />
          <div className="flex items-center gap-3 px-2">
            <div className="relative inline-flex h-6 w-11 items-center">
              <input
                id="open-only"
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-zinc-200 transition-colors checked:bg-blue-600 dark:bg-zinc-700"
              />
              <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
            <label htmlFor="open-only" className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">Тільки відкрито</label>
          </div>
        </div>
        <CategoryFilter items={categories} selected={selected} onToggle={toggleCat} />
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8">
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Знайдено: {filtered.length}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filtered.map((p) => (
            <PlaceCard 
                key={p.id} 
                place={p} 
                onShow={(place) => {
                if (place.lat !== null && place.lng !== null) {
                    setMapPoint({ 
                    lat: place.lat, 
                    lng: place.lng, 
                    label: place.name 
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    console.warn("Ця локація не має координат");
                }
                }} 
            />
            ))}
          </div>
        </section>
        <aside className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-40 h-fit">
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <OSMMap selected={mapPoint} />
          </div>
        </aside>
      </div>
    </>
  );
}