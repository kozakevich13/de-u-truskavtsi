// src/app/places/[id]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaceById, places } from "../../lib/data/places";
import PlaceMap from "../../components/PlaceMap";

type Params = { params: { id: string } };

export function generateStaticParams() {
  return places.map((p) => ({ id: p.id }));
}

export default function PlacePage({ params }: Params) {
  const place = getPlaceById(params.id);
  if (!place) return notFound();

  const gallery =
    place.images && place.images.length > 0
      ? place.images
      : [place.mainImage, place.mainImage, place.mainImage, place.mainImage];

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
          <Image
            src={place.mainImage}
            alt={place.name}
            width={1600}
            height={1000}
            className="h-[320px] w-full object-cover md:h-[520px]"
            priority
          />
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          {gallery.slice(0, 4).map((url, i) => (
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
            <div>Статус: {place.openNow ? "Відкрито" : "Зачинено"}</div>
          </div>
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
