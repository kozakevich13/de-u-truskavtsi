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
  const OSMMap = dynamic(() => import("./components/OSMMap"), { ssr: false });

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [mapPoint, setMapPoint] = useState<SelectedPoint | undefined>(
    undefined
  );

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
      const byQuery =
        !ql ||
        p.name.toLowerCase().includes(ql) ||
        p.address.toLowerCase().includes(ql);

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
    } else {
      console.warn("Для цього місця немає координат.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Знайди місця у Трускавці
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Кавʼярні, ресторани, магазини, парки, готелі та інші корисні локації.
        </p>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <SearchBar value={q} onChange={setQ} />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
          />
          Лише відкриті зараз
        </label>
      </section>

      <section className="mb-6">
        <CategoryFilter
          items={categories}
          selected={selected}
          onToggle={toggleCat}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
              Завантаження місць...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <PlaceCard key={p.id} place={p} onShow={handleShowOnMap} />
              ))}

              {filtered.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
                  Нічого не знайдено. Спробуй змінити запит або категорії.
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <OSMMap selected={mapPoint} />
        </aside>
      </section>
    </main>
  );
}