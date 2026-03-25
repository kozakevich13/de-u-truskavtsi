import { Metadata } from "next";
import { supabase } from "./lib/supabase";
import HomeClient from "./components/HomeClient";

export const metadata: Metadata = {
  title: "Трускавець: Карта закладів, кав'ярень та відпочинку",
  description: "Знайдіть найкращі кав'ярні, ресторани та готелі у Трускавці. Актуальна карта міста з графіком роботи та рейтингами закладів.",
  keywords: ["Трускавець", "карта", "заклади", "відпочинок", "кав'ярні", "ресторани"],
};

export default async function HomePage() {
  const { data: places } = await supabase
    .from("places")
    .select("*")
    .order("id", { ascending: true });

  const initialPlaces = places ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": initialPlaces.map((place, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": place.name,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": place.address,
          "addressLocality": "Truskavets",
          "addressRegion": "Lviv Oblast",
          "addressCountry": "UA"
        },
        "image": place.main_image,
        "url": `https://detruckavtsi.info/${place.category}/${place.slug}`,
        "aggregateRating": place.rating ? {
          "@type": "AggregateRating",
          "ratingValue": place.rating,
          "reviewCount": "10" 
        } : undefined
      }
    }))
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 flex flex-col items-center text-center md:items-start md:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">
          Відкривай <span className="text-blue-600 dark:text-blue-400">Трускавець</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Твій гід найкращими локаціями міста: від затишних кав&apos;ярень до мальовничих парків.
        </p>
      </header>

      <HomeClient initialPlaces={initialPlaces} />
    </main>
  );
}