"use client";
import Link from "next/link";
import Image from "next/image";
import type { Place } from "../types/place";

const categoryLabels: Record<string, string> = {
  cafe: "Кав'ярня",
  restaurant: "Ресторан",
  shop: "Магазин",
  hotel: "Готель",
  park: "Парк",
  mall: "ТЦ",
  sanatorium: "Санаторій",
  cinema: "Кінотеатр",
  byuvet: "Бювет",
  museums: "Музей",
  entertainment: "Розваги"
};

export default function PlaceCard({
  place,
  onShow,
}: {
  place: Place;
  onShow?: (p: Place) => void;
}) {
  // Виносимо URL в константу для зручності
  const placeUrl = `/${place.category}/${place.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      
      {/* 1. Посилання на зображенні */}
      <Link 
        href={placeUrl}
        className="relative h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
      >
        <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900 shadow-sm backdrop-blur-sm dark:bg-zinc-900/90 dark:text-zinc-100">
          {categoryLabels[place.category] || place.category}
        </div>

        {place.main_image ? (
          <Image
            src={place.main_image.trim()}
            // Додаємо назву закладу в alt — це важливо для SEO внутрішньої сторінки
            alt={`${categoryLabels[place.category] || ''} ${place.name} Трускавець`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400 uppercase tracking-widest">
            No photo
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
      </Link>

      {/* 2. Контентна частина */}
      <div className="flex-grow p-4">
        <div className="flex items-start justify-between gap-2">
          {/* РОБИМО НАЗВУ ПОСИЛАННЯМ (Найважливіша зміна для SEO) */}
          <Link href={placeUrl} className="flex-grow group/title">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
              {place.name}
            </h3>
          </Link>

          {typeof place.rating === "number" && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
              ★{place.rating.toFixed(1)}
            </span>
          )}
        </div>
        
        {/* Адреса залишається просто текстом */}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {place.address}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-50 p-3 dark:border-zinc-800/50">
        <div className="flex flex-col">
          <span className={`text-[10px] font-bold uppercase tracking-tight ${place.is_open_now ? "text-emerald-600" : "text-zinc-400"}`}>
            {place.is_open_now ? "Відкрито" : "Зачинено"}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            onShow?.(place);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-95 cursor-pointer dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          type="button"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          На мапі
        </button>
      </div>
    </article>
  );
}