import translate from 'google-translate-api-next';

const accessKey = process.env.UNSPLASH_ACCESS_KEY;
const DEFAULT_FALLBACK_IMAGE = "/images/posts/default-truskavets.jpg";

/**
 * Додає параметри оптимізації Unsplash до URL
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
 * Перекладає текст англійською мовою. 
 * Якщо переклад не вдається, повертає оригінальний текст.
 */
async function translateToEnglish(text: string): Promise<string> {
  try {
    // Автоматично визначає мову (наприклад, українську) і перекладає на англійську (en)
    const res = await translate(text, { to: 'en' });
    return res.text || text;
  } catch (err) {
    console.error("[Translation Service] ❌ Помилка перекладу тайтлу:", err);
    return text; // fallback до оригіналу, якщо сервіс ліг
  }
}

/**
 * Шукає випадкове фото на Unsplash.
 * Автоматично перекладає назву статті англійською для кращого пошуку.
 */
export async function fetchUnsplashPhoto(articleTitle: string): Promise<string> {
  if (!accessKey) return DEFAULT_FALLBACK_IMAGE;

  const cleanTitle = articleTitle.trim();
  if (!cleanTitle) return DEFAULT_FALLBACK_IMAGE;

  try {
    // Перекладаємо назву статті англійською мовою
    const translatedQuery = await translateToEnglish(cleanTitle);
    console.log(`[Unsplash Search] 🔍 Шукаю фото за запитом: "${translatedQuery}" (оригінал: "${cleanTitle}")`);

    // 1. Основний пошук за англійським перекладом назви
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(translatedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );

    if (!res.ok) {
      // 2. Резервний пошук, якщо за специфічним тайтлом нічого не знайшлося
      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=nature&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const rawUrl = fallbackData?.urls?.regular;
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