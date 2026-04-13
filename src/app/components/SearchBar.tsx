"use client";
import { useId } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};
export default function SearchBar({ value, onChange, placeholder }: Props) {
  const id = useId();
  return (
    <div className="w-full">
      <label htmlFor={id} className="sr-only">
        Пошук
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Пошук по назві чи адресі…"}
        className="w-full rounded-2xl border border-zinc-300 bg-white/70 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
      />
    </div>
  );
}
