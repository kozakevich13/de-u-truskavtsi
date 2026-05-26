'use client';

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Map as MapIcon, Newspaper, HelpCircle } from "lucide-react";

export default function Header() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-20">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-3 transition-transform active:scale-95">
          <div className="relative h-10 w-10 overflow-hidden md:h-12 md:w-12">
            <Image
              src="/icon.png"
              alt="Логотип"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white md:text-2xl">
            Трускавець
          </span>
        </Link>

        {/* Навігація */}
        <div className="flex items-center gap-0.5 md:gap-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 px-2 py-2 text-sm font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            {/* Трішки зменшили іконку для мобільних */}
            <MapIcon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            <span className="hidden lg:inline">Карта</span>
          </Link>

          <Link 
            href="/news" 
            className="flex items-center gap-2 px-2 py-2 text-sm font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <NewsheetIcon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            <span className="hidden lg:inline">Новини</span>
          </Link>

          {/* РОЗДІЛ: FAQ */}
          <Link 
            href="/faq" 
            className="flex items-center gap-2 px-2 py-2 text-sm font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <HelpCircle className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            <span className="hidden lg:inline">Питання</span>
          </Link>
          
          <Link 
            href="/blog" 
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 md:px-4 text-sm font-bold uppercase tracking-tight text-white hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-zinc-200 dark:shadow-none cursor-pointer"
          >
            <BookOpen className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            {/* Слово Гід тепер ховається на мобільних пристроях */}
            <span className="hidden sm:inline">Гід</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// Допоміжний внутрішній компонент, щоб не ламався Newspaper імпорт
function NewsheetIcon({ className }: { className?: string }) {
  return <Newspaper className={className} />;
}