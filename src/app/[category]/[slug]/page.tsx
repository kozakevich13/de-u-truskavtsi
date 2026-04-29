import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceMap from "../../components/PlaceMap";
import PlaceGallery from "../../components/PlaceGallery";
import { supabase } from "../../lib/supabase";
import PlaceMedia from "../../components/PlaceMedia";
import ExpandableDescription from "../../components/ExpandableDescription";
import RecommendedPlaces from "../../components/RecommendedPlaces";
import PlaceMenu from "../../components/PlaceMenu"; // 1. Імпортуємо новий компонент
import { Place } from "../../types/place";
import PlaceReviews from "../../components/PlaceReviews";

type Params = {
  params: Promise<{ category: string; slug: string }>;
};

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

const getSchemaType = (category: string) => {
  switch (category) {
    case 'cafe': return 'Cafe';
    case 'restaurant': return 'Restaurant';
    case 'hotel': return 'Hotel';
    case 'sanatorium': return 'MedicalOrganization';
    default: return 'LocalBusiness';
  }
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, slug } = await params;

  const { data: place } = await supabase
    .from("places")
    .select("name, short_description, main_image, category, slug, address, keywords") 
    .eq("category", category)
    .eq("slug", slug)
    .single();

  if (!place) return { title: "Місце не знайдено" };

  const title = `${place.name} Трускавець 2026 — фото, ціни, адреса та відгуки`;
  const description = place.short_description || `Відвідайте ${place.name} у Трускавці. Актуальна інформація, карта та фото.`;
  
  const imageUrl = place.main_image?.trim() || "";
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

  if (error || !place) return notFound();

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

  const mainImage = place.main_image || (Array.isArray(place.image_url) ? place.image_url[0] : "");
  const gallery = Array.isArray(place.image_url) 
    ? place.image_url.filter((img: string) => img !== mainImage) 
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": getSchemaType(category),
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
    "telephone": place.phone || undefined, 
    "priceRange": "$$", 
    // Додаємо інформацію про меню в мікророзмітку
    "hasMenu": place.menu ? `https://detruckavtsi.info/${category}/${slug}#menu` : undefined,
    "aggregateRating": place.rating ? {
      "@type": "AggregateRating",
      "ratingValue": place.rating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "15" 
    } : undefined
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
          Головна
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${categorySlug}`} className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
          {categoryLabel}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-200 uppercase tracking-tight">
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
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-4xl">
              {place.name}
            </h1>
            <div className="flex flex-col gap-1 text-zinc-600 dark:text-zinc-400">
              <p className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {place.address}, Трускавець
              </p>
              <p className="text-sm opacity-80">
                Завітайте до {place.name} — ми працюємо для вас щодня.
              </p>
            </div>
          </header>

          <div className="mt-6 flex flex-wrap gap-4">
            {typeof place.rating === "number" && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-500 shadow-sm">
                ★ {place.rating.toFixed(1)}
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm ${
              place.is_open_now 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500" 
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${place.is_open_now ? "bg-emerald-500" : "bg-zinc-400"}`} />
              {place.is_open_now ? "Відкрито зараз" : "Зачинено"}
            </div>
          </div>

          <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

          {place.description && (
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <ExpandableDescription 
                description={place.description} 
                title={place.name} 
              />
            </div>
          )}

          <div id="menu">
            <PlaceMenu menu={place.menu} />
          </div>

          <PlaceMedia media={place.places_media} />

          {place.keywords && (
            <div className="mt-12">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Теги та категорії</h3>
              <div className="flex flex-wrap gap-2">
                {place.keywords.split(",").map((word: string) => (
                  <span key={word} className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {word.trim().toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
            <PlaceReviews reviews={place.reviews} />
        </article>

        <aside className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <h2 className="mb-4 text-lg font-bold dark:text-zinc-100">Локація</h2>
              {place.lat && place.lng ? (
                <div className="h-64 overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <PlaceMap point={{ lat: place.lat, lng: place.lng, label: place.name }} />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-zinc-400">
                  Карта недоступна
                </div>
              )}
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-transform active:scale-95"
              >
                Маршрут у Google Maps
              </a>
            </div>
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