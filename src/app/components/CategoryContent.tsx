"use client";

import { useState } from "react";
import PlaceCard from "../components/PlaceCard";
import CategoryMap from "../components/CategoryMap";
import { Place } from "../types/place";

// Визначаємо інтерфейс для вибраної точки
interface SelectedMapPoint {
  lat: number;
  lng: number;
  label: string;
}

export default function CategoryContent({ initialPlaces }: { initialPlaces: Place[] }) {
  // Вказуємо тип для useState: SelectedMapPoint або undefined
  const [selectedPoint, setSelectedPoint] = useState<SelectedMapPoint | undefined>(undefined);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleShowOnMap = (place: Place) => {
    if (place.lat && place.lng) {
      setSelectedPoint({
        lat: Number(place.lat),
        lng: Number(place.lng),
        label: place.name
      });
      setIsMapOpen(true);
    }
  };

  return (
    <>
      <section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialPlaces.map((place) => (
            <PlaceCard 
              key={place.id} 
              place={place} 
              onShow={handleShowOnMap} 
            />
          ))}
        </div>
      </section>

      {/* Попап з картою */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10">
          <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            
            {/* Кнопка закриття */}
            <button 
              onClick={() => setIsMapOpen(false)}
              className="absolute right-5 top-5 z-[2100] flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition-transform hover:scale-110 dark:bg-zinc-800 dark:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>

            {/* Сама карта */}
            <div className="h-full w-full">
              <CategoryMap selected={selectedPoint} />
            </div>

            {/* Назва закладу знизу */}
            {selectedPoint && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2100] rounded-full bg-white/90 px-6 py-2 font-bold shadow-lg dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                {selectedPoint.label}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}