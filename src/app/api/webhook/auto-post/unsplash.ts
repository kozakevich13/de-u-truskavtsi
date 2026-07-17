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
    
    // Структура відповіді Google API: [[["перекладений_текст", "оригінал", ...]], ...]
    const data = (await response.json()) as [Array<[string, string, ...unknown[]]>, ...unknown[]];
    
    // Безпечно збираємо перекладені частини тексту
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

  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return DEFAULT_FALLBACK_IMAGE;

  try {
    const translatedQuery = await translateToEnglish(cleanKeyword);
    console.log(`[Unsplash Search] 🔍 Запит після перекладу: "${translatedQuery}"`);

    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );

    if (!res.ok) {
      console.warn(`[Unsplash] ⚠️ За запитом "${translatedQuery}" нічого не знайдено. Пробую нейтральний фолбек.`);
      
      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=restaurant,travel&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      
      if (fallbackRes.ok) {
        const fallbackData = (await fallbackRes.json()) as { urls?: { regular?: string } };
        const rawUrl = fallbackData?.urls?.regular;
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