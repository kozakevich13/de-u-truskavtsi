'use client';

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Map as MapIcon } from "lucide-react";

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
        <div className="flex items-center gap-2 md:gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <MapIcon size={18} />
            <span className="hidden md:inline">Карта</span>
          </Link>
          
          <Link 
            href="/blog" 
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold uppercase tracking-tight text-white hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-zinc-200 dark:shadow-none"
          >
            <BookOpen size={18} />
            <span>Гід</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}