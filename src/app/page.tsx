export const revalidate = 86400;

import { Metadata } from "next";
import Image from "next/image"; 
import { supabase } from "./lib/supabase";
import HomeClient from "./components/HomeClient";

export const metadata: Metadata = {
  title: "Трускавець: Карта закладів, кав'ярень та відпочинку",
  description: "Знайдіть найкращі кав'ярні, ресторани та готелі у Трускавці. Актуальна карта міста з графіком роботи.",
  keywords: ["Трускавець", "карта", "заклади", "відпочинок", "кав'ярні", "ресторани"],
};

export default async function HomePage() {
  const { data: places } = await supabase
    .from("places")
    .select("*")
    .order("id", { ascending: true });

  const initialPlaces = places ?? [];

  // Мікророзмітка для головної сторінки
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Відкривай Трускавець",
        "url": "https://detruckavtsi.info",
        "description": "Найповніший путівник Трускавцем: від бюветів до ресторанів."
      },
      {
        "@type": "ItemList",
        "name": "Популярні заклади Трускавця",
        "itemListElement": initialPlaces.slice(0, 15).map((place, index) => {
          const item: any = {
            "@type": "LocalBusiness",
            "name": place.name,
            "url": `https://detruckavtsi.info/${place.category}/${place.slug}`,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": place.address,
              "addressLocality": "Truskavets",
              "addressRegion": "Lviv Oblast",
              "addressCountry": "UA"
            }
          };

          if (place.main_image) item.image = place.main_image;

          // Додаємо рейтинг безпечно, щоб не було <parent_node> помилок
          if (typeof place.rating === "number" && place.rating > 0) {
            item.aggregateRating = {
              "@type": "AggregateRating",
              "ratingValue": place.rating.toFixed(1),
              "bestRating": "5",
              "worstRating": "1",
              "ratingCount": "10"
            };
          }

          return {
            "@type": "ListItem",
            "position": index + 1,
            "item": item
          };
        })
      }
    ]
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12 text-black dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 flex flex-col items-center gap-4 text-center md:items-start md:text-left">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden md:h-20 md:w-20">
            <Image
              src="/icon.png"
              alt="Логотип Відкривай Трускавець"
              fill
              className="object-contain" 
              priority 
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">
            Відкривай <span className="text-blue-600 dark:text-blue-400">Трускавець</span>
          </h1>
        </div>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Найповніший путівник Трускавцем: від бюветів та парків до сучасних кав&apos;ярень та ресторанів. Актуальні ціни та локації на карті.
        </p>
      </header>

      <HomeClient initialPlaces={initialPlaces} />
    </main>
  );
}