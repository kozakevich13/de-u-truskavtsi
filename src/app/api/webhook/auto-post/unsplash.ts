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
 * Шукає ТІЛЬКИ за першими 2 тегами, а в разі невдачі — за останніми 2 тегами.
 */
export async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  if (!accessKey) return DEFAULT_FALLBACK_IMAGE;

  const rawKeyword = keyword.trim();
  if (!rawKeyword) return DEFAULT_FALLBACK_IMAGE;

  // Розбиваємо всі теги у масив
  const allTags = rawKeyword.includes(",") 
    ? rawKeyword.split(",").map(t => t.trim()).filter(Boolean)
    : [rawKeyword];

  // 1. ПЕРШІ 2 ТЕГИ
  const firstTwoTags = allTags.slice(0, 2).join(", ");
  console.log(`[Unsplash Tags] 🎯 Спроба 1 (Перші 2 теги): "${firstTwoTags}"`);

  try {
    const translatedFirstQuery = await translateToEnglish(firstTwoTags);
    console.log(`[Unsplash Search] 🔍 Основний запит після перекладу: "${translatedFirstQuery}"`);
    
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedFirstQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );

    if (res.ok) {
      const data = (await res.json()) as { urls?: { regular?: string } };
      const rawUrl = data?.urls?.regular;
      if (rawUrl) return optimizeUnsplashUrl(rawUrl);
    }

    console.warn(`[Unsplash] ⚠️ За першими тегами "${translatedFirstQuery}" нічого не знайдено.`);

    // 2. ОСТАННІ 2 ТЕГИ (якщо тегів усього більше ніж 2)
    if (allTags.length > 2) {
      const lastTwoTags = allTags.slice(-2).join(", ");
      console.log(`[Unsplash Tags] 🔄 Спроба 2 (Останні 2 теги): "${lastTwoTags}"`);

      const translatedLastQuery = await translateToEnglish(lastTwoTags);
      console.log(`[Unsplash Search] 🔄 Резервний запит після перекладу: "${translatedLastQuery}"`);

      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedLastQuery)}&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );

      if (fallbackRes.ok) {
        const fallbackData = (await fallbackRes.json()) as { urls?: { regular?: string } };
        const rawUrl = fallbackData?.urls?.regular;
        if (rawUrl) return optimizeUnsplashUrl(rawUrl);
      }

      console.warn(`[Unsplash] ⚠️ За останніми тегами "${translatedLastQuery}" теж нічого не знайдено.`);
    }

    // Якщо нічого не знайшлося — віддаємо локальний дефолт
    return DEFAULT_FALLBACK_IMAGE;

  } catch (err) {
    console.error("[Unsplash Service] ❌ Критична помилка підбору фото:", err);
    return DEFAULT_FALLBACK_IMAGE;
  }
}