import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceMap from "../../components/PlaceMap";
import PlaceGallery from "../../components/PlaceGallery";
import { supabase } from "../../lib/supabase";
import PlaceMedia from "../../components/PlaceMedia";
import ExpandableDescription from "../../components/ExpandableDescription";
import RecommendedPlaces from "../../components/RecommendedPlaces";
import { Place } from "../../types/place"

type Params = {
  params: Promise<{ category: string; slug: string }>;
};

// Словник для перекладу категорій у хлібних крихтах
const categoryNames: Record<string, string> = {
  cafe: "Кав'ярні",
  restaurant: "Ресторани",
  hotel: "Готелі",
  shop: "Шопінг",
  sanatorium: "Санаторії",
  museums: "Музеї",
  cinema: "Кінотеатри",
  byuvet: "Бювети",
  mall: "ТЦ"
};

// Словник для мапінгу URL-категорій (множина -> однина для лінків)
const categoryUrlMapping: Record<string, string> = {
  cafe: "cafes",
  restaurant: "restaurants",
  hotel: "hotels",
  shop: "shops",
  sanatorium: "sanatoriums",
  museums: "museums",
  cinema: "cinemas",
  byuvet: "byuvets",
  mall: "malls"
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, slug } = await params;

  const { data: place } = await supabase
    .from("places")
    .select("name, description, main_image, category, slug, address, keywords") 
    .eq("category", category)
    .eq("slug", slug)
    .single();

  if (!place) return { title: "Місце не знайдено" };

  const title = `${place.name} | Трускавець — Ціни, фото, адреса`;
  const description = place.description?.slice(0, 160) || `Відвідайте ${place.name} у Трускавці.`;
  const imageUrl = place.main_image || "";
  const url = `https://detruckavtsi.info/${place.category}/${place.slug}`;

  const keywordsArray = place.keywords ? place.keywords.split(",").map((s: string) => s.trim()) : [];
  
  return {
    title,
    description,
    keywords: keywordsArray,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Відкривай Трускавець",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: place.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PlacePage({ params }: Params) {
  const { category, slug } = await params;

  const { data: place, error } = await supabase
    .from("places")
    .select("*")
    .eq("category", category)
    .eq("slug", slug)
    .single();

  if (error || !place) {
    return notFound();
  }

  const { data: recommended } = await supabase
    .from("places")
    .select("id, name, main_image, category, slug, address, rating")
    .eq("category", category)
    .neq("slug", slug) 
    .limit(3)
    .order("rating", { ascending: false });

    const initialRecommended = (recommended as Place[]) ?? [];
  const categoryLabel = categoryNames[category] || category;
  const categorySlug = categoryUrlMapping[category] || category;

  const mainImage =
    place.main_image ||
    (Array.isArray(place.image_url) ? place.image_url[0] : "");

  const gallery =
    Array.isArray(place.image_url) && place.image_url.length > 0
      ? place.image_url.filter((img: string) => img !== mainImage)
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": place.name,
    "description": place.description,
    "image": mainImage,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": place.address,
      "addressLocality": "Truskavets",
      "addressRegion": "Lviv Oblast",
      "addressCountry": "UA"
    },
    "geo": place.lat && place.lng ? {
      "@type": "GeoCoordinates",
      "latitude": place.lat,
      "longitude": place.lng
    } : undefined,
    "url": `https://detruckavtsi.info/${category}/${slug}`,
    "aggregateRating": place.rating ? {
      "@type": "AggregateRating",
      "ratingValue": place.rating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "12" 
    } : undefined
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Оновлена навігація (Хлібні крихти) */}
      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link 
          href="/" 
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Головна
        </Link>
        <span className="mx-2">/</span>
        <Link 
          href={`/${categorySlug}`} 
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {categoryLabel}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-200">
          {place.name}
        </span>
      </nav>

      <PlaceGallery 
        mainImage={mainImage} 
        gallery={gallery} 
        placeName={place.name} 
      />

      <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-4xl">
              {place.name}
            </h1>
            <p className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {place.address}, Трускавець
            </p>
          </header>

          <div className="mt-6 flex flex-wrap gap-4">
            {typeof place.rating === "number" && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-500">
                ★ {place.rating.toFixed(1)}
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
              place.is_open_now 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500" 
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${place.is_open_now ? "bg-emerald-500" : "bg-zinc-400"}`} />
              {place.is_open_now ? "Відкрито" : "Зачинено"}
            </div>
          </div>

          <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

          {place.description && (
            <ExpandableDescription 
              description={place.description} 
              title={place.name} 
            />
          )}

          <PlaceMedia media={place.places_media} />

          {place.keywords && (
            <div className="mt-10 flex flex-wrap gap-2">
              {place.keywords.split(",").map((word: string) => (
                <span 
                  key={word} 
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  #{word.trim()}
                </span>
              ))}
            </div>
          )}
        </article>

        <aside className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            <h2 className="text-lg font-semibold dark:text-zinc-100">Розташування на карті</h2>
            {place.lat && place.lng ? (
              <div className="h-80 overflow-hidden rounded-3xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                <PlaceMap
                  point={{
                    lat: place.lat,
                    lng: place.lng,
                    label: place.name,
                  }}
                />
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                Координати відсутні
              </div>
            )}
          </div>
        </aside>
      </section>

      <RecommendedPlaces 
        places={initialRecommended} 
        currentCategory={category} 
      />
    </main>
  );
}