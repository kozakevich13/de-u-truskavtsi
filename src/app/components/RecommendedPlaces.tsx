import Link from "next/link";
import Image from "next/image";
import { Place } from "../types/place";

interface RecommendedPlacesProps {
  places: Place[]; 
  currentCategory: string;
}

export default function RecommendedPlaces({ places }: RecommendedPlacesProps) {
  if (places.length === 0) return null;

  return (
    // Використовуємо <aside> для SEO: це сигнал боту, що тут другорядний контент
    <aside className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800" aria-label="Рекомендовані місця">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Також рекомендуємо відвідати
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <Link
            key={place.id}
            href={`/${place.category}/${place.slug}`}
            // rel="nofollow" каже Google не асоціювати цю сторінку з ключовими словами посилання
            rel="nofollow"
            className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-48 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={place.main_image?.trim() || "/placeholder.jpg"}
                alt={place.name}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              {/* Змінили h3 на div, щоб не розмивати SEO-структуру сторінки */}
              <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                {place.name}
              </div>
              {place.address && (
                <p className="mt-1 text-sm text-zinc-500 line-clamp-1">
                  {place.address}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {place.category}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}