// src/components/CategoryFilter.tsx
"use client";
import clsx from "clsx";

type Item = { key: string; label: string };

type Props = {
  items: readonly Item[];
  selected: string[];
  onToggle: (key: string) => void;
};

export default function CategoryFilter({ items, selected, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = selected.includes(it.key);
        return (
          <button
            key={it.key}
            onClick={() => onToggle(it.key)}
            className={clsx(
              "rounded-full px-4 py-2 text-sm border transition shadow-sm",
              active
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                : "bg-white/70 text-zinc-700 border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900/70 dark:text-zinc-200 dark:border-zinc-700"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
