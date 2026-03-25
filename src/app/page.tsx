"use client";

import { useEffect, useMemo, useState } from "react";
import SearchBar from "./components/SearchBar";
import CategoryFilter from "./components/CategoryFilter";
import PlaceCard from "./components/PlaceCard";
import type { Place } from "./types/place";
import { SelectedPoint } from "./components/OSMMap";
import dynamic from "next/dynamic";
import { supabase } from "./lib/supabase";

const categories = [
  { key: "cafe", label: "Кавʼярні" },
  { key: "restaurant", label: "Ресторани" },
  { key: "shop", label: "Магазини" },
  { key: "hotel", label: "Готелі" },
  { key: "park", label: "Парки" },
  { key: "mall", label: "ТЦ" },
];

export default function HomePage() {
  const OSMMap = useMemo(() => dynamic(() => import("./components/OSMMap"), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse rounded-3xl dark:bg-zinc-800" />
  }), []);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [mapPoint, setMapPoint] = useState<SelectedPoint | undefined>(undefined);

  useEffect(() => {
    async function fetchPlaces() {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Помилка завантаження місць:", error.message);
        setPlaces([]);
      } else {
        setPlaces(data ?? []);
      }
      setLoading(false);
    }
    fetchPlaces();
  }, []);

  const filtered: Place[] = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return places.filter((p) => {
      const byQuery = !ql || p.name.toLowerCase().includes(ql) || p.address.toLowerCase().includes(ql);
      const byCat = selected.length === 0 || selected.includes(p.category);
      const byOpen = !openOnly || p.is_open_now;
      return byQuery && byCat && byOpen;
    });
  }, [places, q, selected, openOnly]);

  const toggleCat = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  function handleShowOnMap(p: Place) {
    if (p.lat && p.lng) {
      setMapPoint({ lat: p.lat, lng: p.lng, label: p.name });
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Скрол до карти на мобілках
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Hero-секція */}
      <header className="mb-10 flex flex-col items-center text-center md:items-start md:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">
          Відкривай <span className="text-blue-600 dark:text-blue-400">Трускавець</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Твій гід найкращими локаціями міста: від затишних кав'ярень до мальовничих парків.
        </p>
      </header>

      {/* Панель керування: Пошук + Чекбокс */}
      <div className="sticky top-4 z-30 mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/70 p-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70 shadow-sm">
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
            <label htmlFor="open-only" className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Тільки відкрито
            </label>
          </div>
        </div>

        <CategoryFilter
          items={categories}
          selected={selected}
          onToggle={toggleCat}
        />
      </div>

      {/* Основний контент */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Список карток */}
        <section className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Знайдено: {filtered.length}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {filtered.map((p) => (
                  <PlaceCard key={p.id} place={p} onShow={handleShowOnMap} />
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 py-20 dark:border-zinc-800">
                   <p className="text-zinc-500">Нічого не знайдено за вашим запитом 😢</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Карта */}
        <aside className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-40 h-fit">
          <div className="h-[400px] lg:h-[600px] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <OSMMap selected={mapPoint} />
          </div>
        </aside>
      </div>
    </main>
  );
}