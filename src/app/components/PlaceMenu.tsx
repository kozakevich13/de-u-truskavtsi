"use client";

import { useState } from "react";
import { MenuSection } from "../types/place";

export default function PlaceMenu({ menu }: { menu: MenuSection[] | null | undefined }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!menu || menu.length === 0) return null;

  // Визначаємо, скільки категорій показувати відразу
  const initialDisplayCount = 2;
  const hasMore = menu.length > initialDisplayCount;
  const displayedMenu = isExpanded ? menu : menu.slice(0, initialDisplayCount);

  return (
    <section className="mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-800" id="menu">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Меню та ціни
        </h2>
        {hasMore && !isExpanded && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {menu.length} категорії
          </span>
        )}
      </div>
      
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {displayedMenu.map((section, idx) => (
          <div key={idx} className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-500">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {section.category}
            </h3>
            <div className="space-y-4">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="group flex items-baseline justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                      {item.name}
                    </span>
                    {item.weight && (
                      <span className="text-xs text-zinc-500">
                        {item.weight}
                      </span>
                    )}
                  </div>
                  <div className="h-[1px] flex-grow border-b border-dotted border-zinc-300 dark:border-zinc-700" />
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {item.price} <span className="text-xs font-normal">грн</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-3 text-sm font-bold text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {isExpanded ? (
              <>
                <span>Згорнути меню</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </>
            ) : (
              <>
                <span>Показати все меню</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}