import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceMap from "../../components/PlaceMap";
import { supabase } from "../../lib/supabase";

type Params = {
  params: Promise<{ category: string; slug: string }>;
};

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

  const mainImage =
    place.main_image ||
    (Array.isArray(place.image_url) ? place.image_url[0] : "");

  const gallery =
    Array.isArray(place.image_url) && place.image_url.length > 0
      ? place.image_url.filter((img: string) => img !== mainImage)
      : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 underline-offset-2 hover:underline"
      >
        ← На головну
      </Link>

      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-transparent shadow-sm">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={place.name}
              width={1600}
              height={1000}
              className="h-[320px] w-full object-cover md:h-[520px]"
              priority
            />
          ) : (
            <div className="flex h-[320px] w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 md:h-[520px]">
              Фото відсутнє
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          {gallery.slice(0, 4).map((url: string, i: number) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-transparent shadow-sm"
            >
              <Image
                src={url}
                alt={`${place.name} photo ${i + 1}`}
                width={800}
                height={600}
                className="h-[155px] w-full object-cover md:h-[255px]"
              />
            </div>
          ))}

          {gallery.length === 0 && (
            <div className="col-span-2 row-span-2 flex items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
              Галерея відсутня
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-semibold">{place.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">{place.address}</p>

          <div className="mt-4 grid gap-2 text-sm text-zinc-700">
            {typeof place.rating === "number" && (
              <div>
                Рейтинг: <b>★ {place.rating.toFixed(1)}</b>
              </div>
            )}
            <div>Статус: {place.is_open_now ? "Відкрито" : "Зачинено"}</div>
          </div>

          {place.description && (
            <p className="mt-4 text-sm leading-6 text-zinc-700">
              {place.description}
            </p>
          )}
        </div>

        <aside className="lg:col-span-1">
          {place.lat && place.lng ? (
            <PlaceMap
              point={{
                lat: place.lat,
                lng: place.lng,
                label: place.name,
              }}
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-2xl border text-sm text-zinc-500">
              Координати відсутні
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}