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
  // Зберігаємо індекс вибраного фото замість URL, щоб легше було гортати
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // Створюємо загальний масив усіх фото (головне + галерея)
  const allImages = [mainImage, ...gallery].filter(Boolean);

  const openModal = (index: number) => setCurrentIndex(index);
  const closeModal = () => setCurrentIndex(null);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // щоб не закрити модалку
    if (currentIndex !== null) {
      setCurrentIndex((currentIndex + 1) % allImages.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex !== null) {
      setCurrentIndex((currentIndex - 1 + allImages.length) % allImages.length);
    }
  };

  return (
    <>
      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Головне фото */}
        <div 
          className="cursor-pointer overflow-hidden rounded-2xl border border-transparent shadow-sm transition hover:opacity-95"
          onClick={() => openModal(0)}
        >
          {mainImage ? (
            <Image
              src={mainImage.trim()}
              alt={`Головне фото закладу ${placeName} у Трускавці`}
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

        {/* Плитка галереї */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          {gallery.length > 0 ? (
            gallery.slice(0, 4).map((url: string, i: number) => {
              const isLastVisible = i === 3 && gallery.length > 4;
              return (
                <div
                  key={i}
                  onClick={() => openModal(i + 1)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-transparent shadow-sm transition hover:opacity-95"
                >
                  <Image
                    src={url.trim()}
                    alt={`Фото ${i + 1} закладу ${placeName}`}
                    width={800}
                    height={600}
                    className="h-[155px] w-full object-cover md:h-[255px]"
                  />
                  
                  {/* Оверлей "Ще фото", якщо їх більше 4 */}
                  {isLastVisible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white transition group-hover:bg-black/40">
                      <span className="text-lg font-bold md:text-2xl">
                        + {gallery.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 row-span-2 flex items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
              Галерея відсутня
            </div>
          )}
        </div>
      </section>

      {/* Модальне вікно (Lightbox) */}
      {currentIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          <button 
            className="absolute top-6 right-6 z-50 text-white text-4xl hover:text-zinc-300"
            onClick={closeModal}
          >
            ×
          </button>

          {/* Кнопка Назад */}
          {allImages.length > 1 && (
            <button 
              className="absolute left-4 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:left-10"
              onClick={prevImage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}

          <div className="relative h-full w-full max-w-6xl">
            <Image
              src={allImages[currentIndex].trim()}
              alt={`${placeName} - повний розмір`}
              fill
              className="object-contain"
              quality={100}
            />
          </div>

          {/* Кнопка Вперед */}
          {allImages.length > 1 && (
            <button 
              className="absolute right-4 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 md:right-10"
              onClick={nextImage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}

          {/* Лічильник фото */}
          <div className="absolute bottom-8 text-sm font-medium text-white/70">
            {currentIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </>
  );
}