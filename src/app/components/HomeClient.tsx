"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import SearchBar from "./SearchBar";
import CategoryFilter from "./CategoryFilter";
import PlaceCard from "./PlaceCard";
import type { Place } from "../types/place";
import { SelectedPoint } from "./OSMMap";
import dynamic from "next/dynamic";
import Link from "next/link"; 

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

  // Реф для збереження позиції скролу
  const scrollPosRef = useRef(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Функція відкриття карти із записом скролу
  const openMapMode = () => {
    if (typeof window !== 'undefined') {
      scrollPosRef.current = window.scrollY;
    }
    setViewMode("map");
  };

  // Логіка блокування скролу та відновлення позиції
  useEffect(() => {
    if (viewMode === "map") {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        document.body.style.overflow = "hidden";
      }
    } else {
      document.body.style.overflow = "unset";
      
      // Повертаємо користувача на те саме місце
      if (scrollPosRef.current !== 0) {
        setTimeout(() => {
          window.scrollTo({
            top: scrollPosRef.current,
            behavior: 'instant'
          });
        }, 10);
      }
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
        openMapMode();
      } 
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* ПАНЕЛЬ ФІЛЬТРІВ: прилипає до самого верху (top-0) */}
      <div className={`
        ${viewMode === "map" ? "hidden" : "flex"} 
        sticky top-0 z-[1100] mb-8 w-full flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/80 p-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm lg:flex
      `}>
        <div className="w-full md:flex-grow md:w-auto">
          <SearchBar value={q} onChange={setQ} />
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto md:ml-auto">
          <div className="w-1/2 md:w-auto">
            <CategoryFilter items={categories} selected={selected} onToggle={toggleCat} />
          </div>

          <div className="flex w-1/2 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/50 py-2 dark:border-zinc-800 dark:bg-zinc-900/50 md:w-auto md:border-none md:bg-transparent md:py-0 md:justify-end">
            <div className="relative inline-flex h-6 w-11 items-center flex-shrink-0">
              <input
                id="open-only"
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-zinc-200 transition-colors checked:bg-blue-600 dark:bg-zinc-700"
              />
              <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
            <label htmlFor="open-only" className="cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap sm:text-sm">
              Відкрито
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start px-4">
        {/* СЕКЦІЯ СПИСКУ: не видаляється з DOM для збереження скролу */}
        <section className={`
          lg:block lg:col-span-7 xl:col-span-8
          ${viewMode === "map" ? "invisible h-0 overflow-hidden" : "block relative"}
        `}>
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

        {/* МАПА: fixed inset-0 на мобайлі для повного екрану */}
        <aside className={`
          ${viewMode === "list" ? "hidden lg:block" : "fixed inset-0 z-[1500] bg-white dark:bg-zinc-950"} 
          lg:static lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[100px] lg:h-[calc(100vh-120px)]
        `}>
          <div className="relative h-full w-full lg:overflow-hidden lg:rounded-3xl lg:border lg:border-zinc-200 lg:shadow-xl lg:dark:border-zinc-800">
            
            {/* Хрестик для виходу з мапи на мобайлі (праворуч вгорі) */}
            {viewMode === "map" && (
              <button 
                onClick={() => setViewMode("list")}
                className="absolute right-4 top-4 z-[2000] flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow-2xl text-zinc-900 backdrop-blur-md active:scale-90 transition-all lg:hidden"
                aria-label="Закрити карту"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            )}

            {isMounted && (
              <div className="h-full w-full">
                <OSMMap key={viewMode} selected={mapPoint} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* SEO СЕКЦІЯ */}
      <section className={`${viewMode === "map" ? "hidden lg:block" : "block"} mt-24 border-t border-zinc-200 pt-16 px-4 dark:border-zinc-800`}>
        <h2 className="mb-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100 lg:text-3xl text-center md:text-left">
          Досліджуйте Трускавець за категоріями
        </h2>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link 
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
        </div>
      </section>
    </div>
  );
}