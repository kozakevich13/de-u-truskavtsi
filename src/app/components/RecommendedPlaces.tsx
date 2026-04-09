import Link from "next/link";
import Image from "next/image";

interface Place {
  id: number | string;
  name: string;
  category: string;
  slug: string;
  main_image?: string | null;
  address?: string | null;
  rating?: number | null;
  // Інші поля нам тут не критичні для рендеру картки, 
  // тому ми їх не прописуємо як обов'язкові
}

interface RecommendedPlacesProps {
  places: Place[]; 
  currentCategory: string;
}

export default function RecommendedPlaces({ places }: RecommendedPlacesProps) {
  if (places.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Також рекомендуємо відвідати
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <Link
            key={place.id}
            href={`/${place.category}/${place.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-48 w-full overflow-hidden">
              <Image
                src={place.main_image?.trim() || "/placeholder.jpg"}
                alt={place.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                {place.name}
              </h3>
              {place.address && (
                <p className="mt-1 text-sm text-zinc-500 line-clamp-1">
                  {place.address}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {place.category}
                </span>
                {/* {place.rating !== null && (
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    ★ {place.rating.toFixed(1)}
                  </span>
                )} */}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}