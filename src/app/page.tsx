export const revalidate = 86400;

import { Metadata } from "next";
import { supabase } from "./lib/supabase";
import HomeClient from "./components/HomeClient";
import HomeHeader from "./components/HomeHeader";
import { Graph, LocalBusiness, ListItem } from "schema-dts"; 

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

  const jsonLd: Graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "Відкривай Трускавець",
        "url": "https://detruckavtsi.info",
        "description": "Найповніший путівник Трускавцем."
      },
      {
        "@type": "ItemList",
        "name": "Популярні заклади Трускавця",
        "itemListElement": initialPlaces.slice(0, 15).map((place, index): ListItem => {
          const businessItem: LocalBusiness = {
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

          if (place.main_image) businessItem.image = place.main_image;
          if (typeof place.rating === "number" && place.rating > 0) {
            businessItem.aggregateRating = {
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
            "item": businessItem
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

      <HomeHeader />

      <HomeClient initialPlaces={initialPlaces} />
    </main>
  );
}