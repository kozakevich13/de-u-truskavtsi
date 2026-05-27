import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Функція для відправки текстових повідомлень назад у Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log(`[Telegram] Надсилання повідомлення до chatId: ${chatId}`);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    });
    if (!res.ok) console.error(`[Telegram] Помилка відправки: ${res.statusText}`);
  } catch (err) {
    console.error("[Telegram] Критична помилка мережі:", err);
  }
}

// 2. Функція для автопідбору фото через Unsplash (ВИНЕСЕНО СЮДИ)
async function fetchUnsplashPhoto(keyword: string): Promise<string> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn("[Unsplash] Ключ UNSPLASH_ACCESS_KEY відсутній, використовуємо дефолтне фото");
      return "/images/posts/default-truskavets.jpg";
    }
  
    try {
      // Формуємо точний пошуковий запит із прив'язкою до нашого регіону.
      // Наприклад, якщо Gemini видав "hotel", запит буде: "Truskavets Carpathians hotel"
      const refinedQuery = `Truskavets Carpathians ${keyword}`;
      console.log(`[Unsplash] Точний пошук за запитом: "${refinedQuery}"`);
      
      // Додаємо refinedQuery у fetch
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
  
      if (!res.ok) {
        console.error(`[Unsplash] Помилка API: ${res.statusText}`);
        
        // СТРАХОВКА: Якщо за трьома словами нічого не знайшло (буває дуже рідкісне слово),
        // робимо запасний ширший запит суворо по місту
        console.log("[Unsplash] Спроба зробити більш широкий запасний запит...");
        const fallbackRes = await fetch(
          `https://api.unsplash.com/photos/random?query=Truskavets&orientation=landscape&client_id=${accessKey}`,
          { method: "GET" }
        );
        
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return fallbackData?.urls?.regular || "/images/posts/default-truskavets.jpg";
        }
  
        return "/images/posts/default-truskavets.jpg";
      }
  
      const data = await res.json();
      const imageUrl = data?.urls?.regular;
      
      if (imageUrl) {
        console.log(`[Unsplash] Знайдено точне фото успішно: ${imageUrl}`);
        return imageUrl;
      }
      
      return "/images/posts/default-truskavets.jpg";
    } catch (err) {
      console.error("[Unsplash] Критична помилка запиту:", err);
      return "/images/posts/default-truskavets.jpg";
    }
  }

// 3. ГОЛОВНИЙ ОБРОБНИК ВЕБХУКА
export async function POST(req: Request) {
  let chatId = 0;
  try {
    console.log("[Webhook] Отримано новий запит від Telegram");
    const body = await req.json();

    if (!body?.message?.text) {
      console.log("[Webhook] Запит проігноровано: немає текстового повідомлення");
      return NextResponse.json({ status: "ignored" });
    }

    chatId = body.message.chat.id;
    const incomingText = body.message.text.trim();
    const allowedChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);

    console.log(`[Webhook] Повідомлення від chatId: ${chatId}. Текст: "${incomingText}"`);

    if (chatId !== allowedChatId) {
      console.warn(`[Security] Спроба несанкціонованого доступу від chatId: ${chatId}`);
      await sendTelegramMessage(chatId, "🛑 Доступ обмежено. Ви не є власником цього бота.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (incomingText === "/start") {
      await sendTelegramMessage(chatId, "🦆 Вітаю, Шеф! Надішліть мені посилання на будь-яку статтю чи новину про Трускавець, і я автоматично додам її рерайт на сайт.");
      return NextResponse.json({ status: "success" });
    }

    if (!incomingText.startsWith("http://") && !incomingText.startsWith("https://")) {
      console.log("[Validation] Текст не є валідним URL");
      await sendTelegramMessage(chatId, "⚠️ Будь ласка, надішліть коректне посилання, що починається з `https://` або `http://`.");
      return NextResponse.json({ status: "bad_request" });
    }

    await sendTelegramMessage(chatId, "⏳ Посилання отримано! Починаю збір тексту та рерайтинг через Gemini...");

    // Парсинг сайту
    console.log(`[Parser] Запуск axios для: ${incomingText}`);
    let response;
    try {
      response = await axios.get(incomingText, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        },
        timeout: 10000 
      });
    } catch (axiosErr: unknown) {
      const msg = axiosErr instanceof Error ? axiosErr.message : "Помилка мережі Axios";
      console.error(`[Parser] Не вдалося завантажити сторінку: ${msg}`);
      throw new Error(`Не вдалося згенерувати сторінку джерела (можливе блокування або ліміт таймауту). Деталі: ${msg}`);
    }
    
    console.log("[Parser] HTML завантажено успішно. Запуск Cheerio очищення...");
    const $ = cheerio.load(response.data);
    $("script, style, nav, footer, header, aside, .comments, .ads").remove();
    
    const rawText = $("article, main, .content, .post-content, .entry-content").text().trim() || $("body").text().trim();
    const cleanText = rawText.replace(/\s+/g, " ").slice(0, 3500);

    console.log(`[Parser] Очищено тексту. Довжина символів: ${cleanText.length}`);

    if (cleanText.length < 200) {
      console.warn("[Parser] Занадто мало корисного тексту після очищення HTML");
      await sendTelegramMessage(chatId, "❌ Не вдалося витягнути достатньо тексту з цього сайту. Можливо, він захищений від парсингу.");
      return NextResponse.json({ status: "parsing_failed" });
    }

    // Рерайтинг через Gemini
    console.log("[Gemini] Підготовка промпту та запуск запиту через нову модель gemini-2.5-flash...");
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const prompt = `Ти — експерт із SEO-копірайтингу та локальний гід по Трускавцю. Твоє завдання: взяти цей текст новини та повністю перефразувати його українською мовою. Зроби статтю унікальною, з емоційними тригерами, клікбейтною, але збережи оригінальні факти.
    Текст для рерайту: ${cleanText}

    Поверни відповідь СУВОРO у форматі JSON об'єкта (БЕЗ маркдауну \`\`\`json, просто чистий текст об'єкта) з такими полями:
    {
      "title": "клікбейтний заголовок",
      "slug": "url-шлях-транслітом-через-дефіси",
      "excerpt": "короткий опис на 150 символів для мета-тегів",
      "keywords": "ключові слова через кому",
      "image_keyword": "одне-два слова англійською мовою для пошуку фото в базі Unsplash, що ідеально підходить за змістом статті (наприклад: 'spa', 'hotel', 'forest', 'mineral-water', 'concert', 'cafe')",
      "content": "текст статті виключно в HTML форматі. Кожен абзац загорни в <p>, підзаголовки в <h3>, списки в <ul><li>. Важливі акценти — <strong>. Без знаків переносу рядків \\n."
    }`;

    let aiTextOutput = "";
    try {
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      console.log("[Gemini] Нова модель gemini-2.5-flash успішно повернула відповідь.");
    } catch (geminiSdkErr: unknown) {
      const sdkErrMsg = geminiSdkErr instanceof Error ? geminiSdkErr.message : "Помилка SDK";
      console.error(`[Gemini SDK Error] Збій запиту: ${sdkErrMsg}`);
      throw new Error(`Google Gemini SDK не зміг згенерувати контент. Деталі: ${sdkErrMsg}`);
    }

    if (!aiTextOutput) {
      throw new Error("Google Gemini повернув порожній текст відповіді.");
    }
    
    if (aiTextOutput.startsWith("```")) {
      console.log("[Gemini] Виявлено маркдаун обгортку в тексті, очищаємо...");
      aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
    }

    const firstCurly = aiTextOutput.indexOf("{");
    const lastCurly = aiTextOutput.lastIndexOf("}");
    if (firstCurly !== -1 && lastCurly !== -1) {
      aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);
    }

    console.log("[Gemini] Спроба парсингу вихідного JSON об'єкта статті");
    let parsedArticle;
    try {
      parsedArticle = JSON.parse(aiTextOutput);
    } catch {
      console.error("[Gemini] Помилка парсингу тексту:", aiTextOutput);
      throw new Error("AI повернув невалідний формат тексту. Спробуйте ще раз.");
    }

    console.log(`[Gemini] Результат успішно розпарсено. Заголовок: "${parsedArticle.title}"`);

    // 2.5 ОДЕРЖАННЯ ФОТОГРАФІЇ
    const keywordForPhoto = parsedArticle.image_keyword || "ukraine-city";
    const autoImageUrl = await fetchUnsplashPhoto(keywordForPhoto);

    // 3. ЗБЕРЕЖЕННЯ В SUPABASE
    console.log("[Supabase] Спроба інсерту нового запису в таблицю posts...");
    const { error: dbError } = await supabase
      .from("posts")
      .insert([
        {
          title: parsedArticle.title,
          slug: parsedArticle.slug + "-" + Date.now().toString().slice(-4), 
          excerpt: parsedArticle.excerpt,
          content: parsedArticle.content,
          keywords: parsedArticle.keywords,
          category: "Новини",
          author_name: "Гід",
          author_image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
          is_published: false, 
          image_url: autoImageUrl 
        }
      ]);

    if (dbError) {
      console.error("[Supabase] Помилка бази даних під час вставки:", dbError);
      throw dbError;
    }

    console.log("[Supabase] Запис успішно створено. Відправляємо фінальний статус Шефу.");
    await sendTelegramMessage(chatId, `🎉 *Успіх!* Статтю "${parsedArticle.title}" успішно згенеровано та додано в чернетки Supabase. Зайдіть в адмінку, щоб підтвердити публікацію!`);
    
    return NextResponse.json({ status: "success" });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Невідома помилка сервера";
    console.error("🚨 [Критична помилка пайплайну]:", errorMessage);
    
    if (chatId !== 0) {
      await sendTelegramMessage(
        chatId, 
        `❌ Сталася помилка під час обробки: ${errorMessage}`
      );
    }
    
    return NextResponse.json({ error: errorMessage, handled: true }, { status: 200 });
  }
}