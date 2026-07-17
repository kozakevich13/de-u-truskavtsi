const accessKey = process.env.UNSPLASH_ACCESS_KEY;
const DEFAULT_FALLBACK_IMAGE = "/images/posts/default-truskavets.jpg";

/**
 * Оптимізація URL Unsplash
 */
function optimizeUnsplashUrl(url: string): string {
  if (!url || !url.includes("images.unsplash.com")) return url;
  
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("w", "1200");
    parsedUrl.searchParams.set("q", "80");
    parsedUrl.searchParams.set("auto", "format");
    return parsedUrl.href;
  } catch {
    return url;
  }
}

/**
 * Швидкий безкоштовний переклад тексту англійською мовою через API
 */
async function translateToEnglish(text: string): Promise<string> {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!response.ok) return text;
    
    const data = (await response.json()) as [Array<[string, string, ...unknown[]]>, ...unknown[]];
    
    if (data && data[0]) {
      const translatedText = data[0].map((item) => item[0]).join("");
      return translatedText || text;
    }
    
    return text;
  } catch (err) {
    console.error("[Translate] ❌ Помилка перекладу:", err);
    return text; 
  }
}

/**
 * Шукає випадкове релевантне photo на Unsplash за ключовими словами статті.
 * Автоматично перекладає кирилицю англійською мовою.
 */
export async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  if (!accessKey) return DEFAULT_FALLBACK_IMAGE;

  const rawKeyword = keyword.trim();
  if (!rawKeyword) return DEFAULT_FALLBACK_IMAGE;

  // Розбиваємо всі теги у масив
  const allTags = rawKeyword.includes(",") 
    ? rawKeyword.split(",").map(t => t.trim()).filter(Boolean)
    : [rawKeyword];

  // 1. Беремо перші 2 теги для основного пошуку
  const primaryTags = allTags.slice(0, 2).join(", ");
  
  // ЛОГ: Виводимо оригінальні слова для основного пошуку
  console.log(`[Unsplash Tags] 🎯 Для ОСНОВНОГО пошуку обрано теги: "${primaryTags}"`);

  try {
    const translatedQuery = await translateToEnglish(primaryTags);
    console.log(`[Unsplash Search] 🔍 Основний запит після перекладу: "${translatedQuery}"`);

    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );

    if (!res.ok) {
      console.warn(`[Unsplash] ⚠️ За основним запитом "${translatedQuery}" нічого не знайдено.`);
      
      // 2. РЕЗЕРВНИЙ ПОШУК: Намагаємося взяти НАСТУПНІ 3 теги з оригінального списку
      const fallbackTags = allTags.slice(2, 5).join(", ");

      if (fallbackTags) {
        // ЛОГ: Виводимо оригінальні слова для резервного пошуку
        console.log(`[Unsplash Tags] 🔄 ОСНОВНИЙ пошук впав. Для РЕЗЕРВНОГО пошуку беру теги: "${fallbackTags}"`);

        const translatedFallback = await translateToEnglish(fallbackTags);
        console.log(`[Unsplash Search] 🔄 Резервний запит після перекладу: "${translatedFallback}"`);

        const fallbackRes = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedFallback)}&orientation=landscape&client_id=${accessKey}`,
          { method: "GET" }
        );

        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as { urls?: { regular?: string } };
          const rawUrl = fallbackData?.urls?.regular;
          return rawUrl ? optimizeUnsplashUrl(rawUrl) : DEFAULT_FALLBACK_IMAGE;
        }
      }

      // 3. ОСТАТОЧНИЙ ФОЛБЕК: якщо тегів більше немає або другий пошук теж впав
      console.warn(`[Unsplash] ⚠️ Резервний пошук за тегами теж не дав результату. Беру загальний тревел-пейзаж.`);
      const finalRes = await fetch(
        `https://api.unsplash.com/photos/random?query=nature,travel,scenery&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      
      if (finalRes.ok) {
        const finalData = (await finalRes.json()) as { urls?: { regular?: string } };
        const rawUrl = finalData?.urls?.regular;
        return rawUrl ? optimizeUnsplashUrl(rawUrl) : DEFAULT_FALLBACK_IMAGE;
      }

      return DEFAULT_FALLBACK_IMAGE;
    }

    const data = (await res.json()) as { urls?: { regular?: string } };
    const rawUrl = data?.urls?.regular;
    return rawUrl ? optimizeUnsplashUrl(rawUrl) : DEFAULT_FALLBACK_IMAGE;
  } catch (err) {
    console.error("[Unsplash Service] ❌ Критична помилка підбору фото:", err);
    return DEFAULT_FALLBACK_IMAGE;
  }
}