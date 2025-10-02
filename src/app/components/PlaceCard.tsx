// src/components/PlaceCard.tsx
"use client";
import type { Place } from "../types/place";

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="group rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {place.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {place.address}
          </p>
        </div>
        {typeof place.rating === "number" && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
            ★ {place.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={
            "text-xs font-medium " +
            (place.openNow ? "text-emerald-600" : "text-zinc-500")
          }
        >
          {place.openNow ? "Відкрито зараз" : "Зачинено"}
        </span>
        {place.lat && place.lng && (
          <a
            className="text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            На мапі →
          </a>
        )}
      </div>
    </article>
  );
}
