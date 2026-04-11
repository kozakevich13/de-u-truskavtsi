"use client";

import { useMemo, useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import CategoryFilter from "./CategoryFilter";
import PlaceCard from "./PlaceCard";
import type { Place } from "../types/place";
import { SelectedPoint } from "./OSMMap";
import dynamic from "next/dynamic";
import Link from "next/link"; // 1. Додаємо імпорт Link

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
    if (viewMode === "map" && typeof window !== 'undefined' && window.innerWidth < 1024) {
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
    { key: "sanatorium", label: "Санаторії" },
    { key: "mall", label: "ТЦ" },
  ];

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return initialPlaces.filter((p) => {
      const byQuery = !ql || p.name.toLowerCase().includes(ql) || (p.address && p.address.toLowerCase().includes(ql));
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

  return (
    <div className="relative min-h-screen">
      {/* Секція фільтрів */}
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
          lg:static lg:col-span-5 xl:col-span-4 lg:sticky lg:top-40
        `}>
          <div className="relative h-[400px] w-full lg:overflow-hidden lg:rounded-3xl lg:border lg:border-zinc-200 lg:shadow-xl lg:dark:border-zinc-800">
            {isMounted && (
              <OSMMap selected={mapPoint} />
            )}
          </div>
        </aside>
      </div>

      {/* НОВИЙ БЛОК: Популярні категорії (SEO-перелінковка) */}
      <section className="mt-24 border-t border-zinc-200 pt-16 dark:border-zinc-800">
        <h2 className="mb-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100 lg:text-3xl text-center md:text-left">
          Досліджуйте Трускавець за категоріями
        </h2>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link // 2. Замінюємо <a> на <Link>
              key={cat.key}
              href={`/${cat.key === 'cafe' ? 'cafes' : 
                      cat.key === 'restaurant' ? 'restaurants' : 
                      cat.key === 'hotel' ? 'hotels' : 
                      cat.key === 'shop' ? 'shops' : 
                      cat.key === 'mall' ? 'malls' : 
                      cat.key === 'sanatorium' ? 'sanatoriums' : cat.key + 's'}`}
              className="group flex flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-white p-6 text-center transition-all hover:border-blue-500 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-blue-400"
            >
              <span className="text-base font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                {cat.label}
              </span>
            </Link>
          ))}
          
          {/* 3. Додаткові посилання теж через <Link> */}
          <Link href="/museums" className="group flex flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-white p-6 text-center transition-all hover:border-blue-500 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-blue-400">
            <span className="text-base font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">Музеї</span>
          </Link>
          
          <Link href="/byuvets" className="group flex flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-white p-6 text-center transition-all hover:border-blue-500 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-blue-400">
            <span className="text-base font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">Бювети</span>
          </Link>
        </div>
      </section>
    </div>
  );
}