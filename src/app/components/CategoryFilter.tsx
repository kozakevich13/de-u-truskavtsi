"use client";

import { useState } from "react";
import clsx from "clsx";

type Item = { key: string; label: string };

type Props = {
  items: readonly Item[];
  selected: string[];
  onToggle: (key: string) => void;
};

export default function CategoryFilter({ items, selected, onToggle }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const clearAll = () => {
    items.forEach((it) => {
      if (selected.includes(it.key)) onToggle(it.key);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={clsx("transition-transform duration-300", isOpen && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span>Фільтри</span>
        {selected.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {selected.length}
          </span>
        )}
      </button>

      <div
        className={clsx(
          "absolute left-0 z-20 mt-2 min-w-[300px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900 md:min-w-[450px]",
          isOpen 
            ? "visible opacity-100 translate-y-0" 
            : "invisible opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            const active = selected.includes(it.key);
            return (
              <button
                key={it.key}
                onClick={() => onToggle(it.key)}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm border transition shadow-sm whitespace-nowrap",
                  active
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                )}
              >
                {it.label}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              onClick={clearAll}
              className="text-sm font-medium text-zinc-500 transition hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400"
            >
              Очистити всі вибрані
            </button>
          </div>
        )}
      </div>
    </div>
  );
}