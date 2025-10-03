"use client";

import { useMemo, useState } from "react";
import SearchBar from "./components/SearchBar";
import CategoryFilter from "./components/CategoryFilter";
import PlaceCard from "./components/PlaceCard";
import MapPlaceholder from "./components/MapPlaceholder";
import { places as mock, categories } from "./lib/data/places";
import type { Place } from "./types/place";
import OSMMap from "./components/OSMMap";

export default function HomePage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [mapPoint, setMapPoint] = useState<any | undefined>(undefined);

  const filtered: Place[] = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return mock.filter((p) => {
      const byQuery =
        !ql ||
        p.name.toLowerCase().includes(ql) ||
        p.address.toLowerCase().includes(ql);
      const byCat = selected.length === 0 || selected.includes(p.category);
      const byOpen = !openOnly || p.openNow;
      return byQuery && byCat && byOpen;
    });
  }, [q, selected, openOnly]);

  const toggleCat = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  function handleShowOnMap(p: Place) {
    if (p.lat && p.lng) {
      setMapPoint({ lat: p.lat, lng: p.lng, label: p.name });
    } else {
      console.warn(
        "Для цього місця немає координат (lat/lng). Додайте їх у places.ts"
      );
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
          items={categories as any}
          selected={selected}
          onToggle={toggleCat}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
        </div>
        <aside className="lg:col-span-1">
          <OSMMap selected={mapPoint} />
        </aside>
      </section>
    </main>
  );
}
