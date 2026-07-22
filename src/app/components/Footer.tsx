import Image from "next/image";
import Link from "next/link";
import { BookOpen, Map as MapIcon, Newspaper, HelpCircle } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:py-10">
        
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-3 transition-transform active:scale-95">
          <div className="relative h-8 w-8 overflow-hidden md:h-10 md:w-10">
            <Image
              src="/icon.png"
              alt="Логотип"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-lg font-black uppercase tracking-tighter text-zinc-900 dark:text-white md:text-xl">
            Трускавець
          </span>
        </Link>

        {/* Навігація з іконками */}
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <MapIcon className="h-4 w-4" />
            <span>Карта</span>
          </Link>

          <Link 
            href="/news" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <Newspaper className="h-4 w-4" />
            <span>Новини</span>
          </Link>

          <Link 
            href="/faq" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Питання</span>
          </Link>

          <Link 
            href="/blog" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Гід</span>
          </Link>
        </nav>

        {/* Копірайт */}
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 text-center md:text-right">
          © {currentYear} Відкривай Трускавець
        </p>

      </div>
    </footer>
  );
}