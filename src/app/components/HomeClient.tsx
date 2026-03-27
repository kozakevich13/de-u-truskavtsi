"use client";

import { useMemo, useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import CategoryFilter from "./CategoryFilter";
import PlaceCard from "./PlaceCard";
import type { Place } from "../types/place";
import { SelectedPoint } from "./OSMMap";
import dynamic from "next/dynamic";

const OSMMap = dynamic(() => import("./OSMMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse dark:bg-zinc-800" />
});

export default function HomeClient({ initialPlaces }: { initialPlaces: Place[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [mapPoint, setMapPoint] = useState<SelectedPoint | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (viewMode === "map" && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [viewMode]);

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

  const handleShowOnMap = (place: Place) => {
    if (place.lat !== null && place.lng !== null) {
      setMapPoint({ 
        lat: Number(place.lat), 
        lng: Number(place.lng), 
        label: place.name 
      });
      
      if (window.innerWidth < 1024) {
        setViewMode("map");
      } 
    }
  };

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen">

      <div className={`${viewMode === "map" ? "hidden" : "flex"} sticky top-4 z-[1100] mb-8 flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/70 p-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70 shadow-sm lg:flex`}>
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
        <section className={`${viewMode === "map" ? "hidden" : "block"} lg:block lg:col-span-7 xl:col-span-8`}>
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Знайдено: {filtered.length}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filtered.map((p) => (
              <PlaceCard 
                key={p.id} 
                place={p} 
                onShow={handleShowOnMap} 
              />
            ))}
          </div>
        </section>

        <aside className={`
          ${viewMode === "list" ? "hidden lg:block" : "fixed inset-0 z-[1500] bg-white dark:bg-zinc-950"} 
          lg:static lg:col-span-5 xl:col-span-4 lg:sticky lg:top-40 lg:h-[400px]
        `}>
          <div className="relative h-full w-full lg:overflow-hidden lg:rounded-3xl lg:border lg:border-zinc-200 lg:shadow-xl lg:dark:border-zinc-800">
            
            {viewMode === "map" && (
              <button 
                onClick={() => setViewMode("list")}
                className="absolute right-5 top-5 z-[1600] flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-2xl dark:bg-zinc-800 dark:text-white lg:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            )}

            {isMounted && (
              <OSMMap selected={mapPoint} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}