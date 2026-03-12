// src/components/PlaceCard.tsx
"use client";
import Link from "next/link";
import type { Place } from "../types/place";

export default function PlaceCard({
  place,
  onShow,
}: {
  place: Place;
  onShow?: (p: Place) => void;
}) {
  return (
    <article className="group rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <Link href={`/places/${place.id}`} className="block">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {place.name}
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {place.address}
        </p>
        {typeof place.rating === "number" && (
          <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
            ★ {place.rating.toFixed(1)}
          </span>
        )}
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={
            "text-xs font-medium " +
            (place.is_open_now ? "text-emerald-600" : "text-zinc-500")
          }
        >
          {place.is_open_now ? "Відкрито зараз" : "Зачинено"}
        </span>

        <button
          onClick={() => onShow?.(place)}
          className="text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          type="button"
        >
          Показати на мапі →
        </button>
      </div>
    </article>
  );
}
