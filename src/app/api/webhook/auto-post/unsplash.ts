// unsplash.ts

const accessKey = process.env.UNSPLASH_ACCESS_KEY;
const DEFAULT_FALLBACK_IMAGE = "/images/posts/default-truskavets.jpg";

/**
 * Додає параметри оптимізації Unsplash до URL, щоб зменшити вагу картинки
 */
function optimizeUnsplashUrl(url: string): string {
  if (!url || !url.includes("images.unsplash.com")) return url;
  
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("w", "1200");       // Максимальна ширина для блогу
    parsedUrl.searchParams.set("q", "80");         // Оптимальна якість
    parsedUrl.searchParams.set("auto", "format");  // Автоматичний вибір сучасного формату (WebP)
    return parsedUrl.href;
  } catch {
    return url;
  }
}

/**
 * Шукає випадкове релевантне фото на Unsplash за ключовим словом.
 * Повертає оптимізований URL або дефолтне локальне фото у разі помилки.
 */
export async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  if (!accessKey) return DEFAULT_FALLBACK_IMAGE;

  try {
    const refinedQuery = `Carpathians Ukraine ${keyword}`;
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );

    if (!res.ok) {
      // Резервний запит, якщо за специфічним ключем нічого не знайдено
      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=Carpathians&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const rawUrl = fallbackData?.urls?.raw;
        return rawUrl ? optimizeUnsplashUrl(rawUrl) : DEFAULT_FALLBACK_IMAGE;
      }
      return DEFAULT_FALLBACK_IMAGE;
    }

    const data = await res.json();
    const rawUrl = data?.urls?.regular;
    return rawUrl ? optimizeUnsplashUrl(rawUrl) : DEFAULT_FALLBACK_IMAGE;
  } catch (err) {
    console.error("[Unsplash Service] ❌ Помилка підбору фото:", err);
    return DEFAULT_FALLBACK_IMAGE;
  }
}