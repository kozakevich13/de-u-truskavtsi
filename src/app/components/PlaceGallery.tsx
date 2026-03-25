"use client";

import { useState } from "react";
import Image from "next/image";

export default function PlaceGallery({ 
  mainImage, 
  gallery, 
  placeName 
}: { 
  mainImage: string; 
  gallery: string[]; 
  placeName: string; 
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div 
          className="cursor-pointer overflow-hidden rounded-2xl border border-transparent shadow-sm transition hover:opacity-90"
          onClick={() => setSelectedImage(mainImage)}
        >
          {mainImage ? (
            <Image
              src={mainImage}
              alt={placeName}
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
          {gallery.length > 0 ? (
            gallery.slice(0, 4).map((url: string, i: number) => (
              <div
                key={i}
                onClick={() => setSelectedImage(url)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-transparent shadow-sm transition hover:opacity-90"
              >
                <Image
                  src={url}
                  alt={`${placeName} photo ${i + 1}`}
                  width={800}
                  height={600}
                  className="h-[155px] w-full object-cover md:h-[255px]"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 row-span-2 flex items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
              Галерея відсутня
            </div>
          )}
        </div>
      </section>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white text-3xl hover:text-zinc-300"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
          <div className="relative h-full w-full max-w-5xl">
            <Image
              src={selectedImage}
              alt="Full size"
              fill
              className="object-contain"
              quality={100}
            />
          </div>
        </div>
      )}
    </>
  );
}