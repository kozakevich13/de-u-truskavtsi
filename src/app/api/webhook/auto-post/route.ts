import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ініціалізація Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// --- ВСЕУКРАЇНСЬКІ ТА ЛОКАЛЬНІ ТРЕНДОВІ ТЕМИ (Запасні, якщо Google Trends лежить) ---
const FALLBACK_TOPICS = [
  "відпочинок в карпатах літо ціни",
  "куди поїхати на вихідні біля льовова",
  "лікувальна вода нафтуся трускавець як пити",
  "найкращі санаторії західної україни",
  "що подивитися в трускавці за три дні",
  "ціни на відпочинок у трускавці 2026"
];

// 1. Функція відправки повідомлень у Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("[Telegram] Помилка відправки:", err);
  }
}

// 2. Автопідбір фото через Unsplash
async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return "/images/posts/default-truskavets.jpg";

  try {
    const refinedQuery = `Carpathians Ukraine ${keyword}`;
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=Carpathians&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return fallbackData?.urls?.regular || "/images/posts/default-truskavets.jpg";
      }
      return "/images/posts/default-truskavets.jpg";
    }
    const data = await res.json();
    return data?.urls?.regular || "/images/posts/default-truskavets.jpg";
  } catch (err) {
    return "/images/posts/default-truskavets.jpg";
  }
}

// 3. Відправка URL в Google Indexing API
async function triggerGoogleIndexing(targetUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/indexing"]
    });
    const indexing = google.indexing({ version: "v3", auth: auth });
    await indexing.urlNotifications.publish({
      requestBody: { url: targetUrl, type: "URL_UPDATED" },
    });
    return { success: true, message: "Успішно надіслано в Google Indexing!" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Помилка індексації";
    return { success: false, message: errMsg };
  }
}

// 4. ФУНКЦІЯ ПАРСИНГУ GOOGLE TRENDS ТА ГЕНЕРАЦІЇ СТАТТІ
async function runDailyAutoGeneration() {
  console.log("[Auto-Bot] Запуск ранкової генерації через Google Trends...");
  let currentTrendKeyword = "";

  try {
    // Парсимо офіційну RSS стрічку щоденних трендів Google для України (UA)
    const googleTrendsRssUrl = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=UA";
    const rssResponse = await axios.get(googleTrendsRssUrl, { timeout: 8000 });
    const $ = cheerio.load(rssResponse.data, { xmlMode: true });
    
    const trends: string[] = [];
    $("item title").each((_, el) => {
      trends.push($(el).text().trim());
    });

    if (trends.length > 0) {
      // Беремо випадковий гарячий тренд із топ-5 сьогоднішніх запитів в Україні
      currentTrendKeyword = trends[Math.floor(Math.random() * Math.min(5, trends.length))];
      console.log(`[Auto-Bot] Знайдено активний тренд в Google UA: "${currentTrendKeyword}"`);
    } else {
      throw new Error("Стрічка трендів порожня");
    }
  } catch (err) {
    console.warn("[Auto-Bot] Не вдалося спарсити Google Trends, беремо запасний тренд регіону...");
    currentTrendKeyword = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
  }

  // Складаємо промпт для Gemini з фокусом на знайдений тренд та туризм Західної України
  const prompt = `Ти — експерт із преміального SEO-копірайтингу та головний редактор туристичного порталу "Гід Трускавця". 
  Сьогодні вранці в Україні шалений тренд і люди активно шукають у Google інформацію, пов'язану з: "${currentTrendKeyword}".
  
  Твоє завдання — написати велику, мега-унікальну, корисну статтю українською мовою. 
  Ти маєш віртуозно пов'язати цей пошуковий тренд "${currentTrendKeyword}" із тематикою туризму, подорожей, відпочинку в Україні (зокрема в Карпатах, Трускавці, Східниці чи на Західній Україні), щоб стаття зібрала тисячі переглядів.
  
  Пиши жваво, журналістським стилем, додавай практичні поради, локальний експертний досвід.

  Поверни відповідь СУВОРO у форматі JSON об'єкта (БЕЗ маркдауну \`\`\`json, просто чистий текст об'єкта):
  {
    "title": "потужний, клікбейтний SEO-заголовок, який включає тренд або близьку тему",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "короткий, мега-цікавий опис на 150 символів для мета-тегу Description з ключовими словами",
    "keywords": "Трускавець, новини Трускавця, туризм в україні, відпочинок в карпатах, плюс теги тренду",
    "image_keyword": "одне слово англійською для пошуку головного фото в Unsplash (наприклад: 'mountains', 'travel', 'hotel', 'resort')",
    "content": "повний текст статті виключно в HTML форматі. Кожен абзац загорни в <p>, підзаголовки структурних блоків в <h3>, списки порад в <ul><li>. Важливі місця — <strong>. Без знаків переносу рядків \\n."
  }`;

  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  let responseFromGemini;
  let aiTextOutput = "";
  
  const maxRetries = 5;
  const fixedWaitTime = 5000; // 5 секунд у мілісекундах

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Надсилання запиту до ШІ. Спроба №${attempt}...`);
      responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      
      if (aiTextOutput) {
        console.log(`[Gemini] 🎉 Успішно отримано відповідь на спробі №${attempt}!`);
        break; 
      }
    } catch (geminiErr: unknown) {
      const errorMsg = geminiErr instanceof Error ? geminiErr.message : "Невідома помилка ШІ";
      console.warn(`[Gemini] Спроба №${attempt} провалилася. Помилка: ${errorMsg}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Бот здався після ${maxRetries} спроб достукатися до Gemini із інтервалом у 5 секунд.`);
      }
      
      console.log(`[Gemini] Очікування 5 секунд перед наступною спробою №${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, fixedWaitTime));
    }
  }

  if (aiTextOutput.startsWith("```")) {
    aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
  }
  const firstCurly = aiTextOutput.indexOf("{");
  const lastCurly = aiTextOutput.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1) {
    aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);
  }

  const parsedArticle = JSON.parse(aiTextOutput);
  const autoImageUrl = await fetchUnsplashPhoto(parsedArticle.image_keyword || "travel");
  const uniqueSlug = parsedArticle.slug + "-" + Date.now().toString().slice(-4);

  // Кладемо в базу Supabase
  const { error: dbError } = await supabase.from("posts").insert([
    {
      title: parsedArticle.title,
      slug: uniqueSlug,
      excerpt: parsedArticle.excerpt,
      content: parsedArticle.content,
      keywords: parsedArticle.keywords,
      category: "Блог",
      author_name: "Локальний експерт",
      author_image: "https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png",
      is_published: true,
      image_url: autoImageUrl
    }
  ]);

  if (dbError) throw dbError;

  const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
  await triggerGoogleIndexing(deployedArticleUrl);

  // Сповіщаємо власника в Telegram про успішний автопостинг
  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `🌅 *Ранковий автопостинг виконано!*\n\n🔥 *Тренд ранку:* \`${currentTrendKeyword}\`\n📌 *Нова стаття:* ${parsedArticle.title}\n🔗 [Читати статтю на сайті](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ✅ Надіслано автоматично! Бот працює, поки ви відпочиваєте.`
    );
  }
}

// 5. ОБРОБНИК GET ЗАПИТІВ (ДЛЯ CRON-JOB ЗРАНКУ)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Захист роуту, щоб сторонні люди не спамили генерацію статей
    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runDailyAutoGeneration();
    return NextResponse.json({ success: true, message: "Ранкова стаття згенерована успішно!" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка крону";
    console.error("🚨 Помилка автогенерації:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 6. ОБРОБНИК POST ЗАПИТІВ (ДЛЯ ТЕЛЕГРАМ-БОТА ЯК І РАНІШЕ)
export async function POST(req: Request) {
  let chatId = 0;
  try {
    const body = await req.json();
    if (!body?.message?.text) return NextResponse.json({ status: "ignored" });

    chatId = body.message.chat.id;
    const incomingText = body.message.text.trim();
    const allowedChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);

    if (chatId !== allowedChatId) {
      await sendTelegramMessage(chatId, "🛑 Доступ обмежено.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (incomingText === "/start") {
      await sendTelegramMessage(chatId, "🦆 Вітаю, Шеф! Надішліть посилання для рерайту, або зачекайте — зранку я згенерую статтю сам.");
      return NextResponse.json({ status: "success" });
    }

    if (!incomingText.startsWith("http://") && !incomingText.startsWith("https://")) {
      await sendTelegramMessage(chatId, "⚠️ Будь ласка, надішліть коректне посилання.");
      return NextResponse.json({ status: "bad_request" });
    }

    await sendTelegramMessage(chatId, "⏳ Посилання отримано! Починаю збір тексту та рерайтинг через Gemini...");

    const response = await axios.get(incomingText, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    $("script, style, nav, footer, header, aside, .comments, .ads").remove();
    const rawText = $("article, main, .content, .post-content, .entry-content").text().trim() || $("body").text().trim();
    const cleanText = rawText.replace(/\s+/g, " ").slice(0, 3500);

    if (cleanText.length < 200) {
      await sendTelegramMessage(chatId, "❌ Занадто мало тексту для рерайту.");
      return NextResponse.json({ status: "parsing_failed" });
    }

    const prompt = `Ти — експерт із преміального SEO-копірайтингу по Трускавцю. Зроби глибокий авторський рерайт цього тексту українською мовою: ${cleanText}
    Поверни JSON об'єкт з полями title, slug, excerpt, keywords, image_keyword, content (HTML-формат).`;

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const responseFromGemini = await model.generateContent(prompt);
    let aiTextOutput = responseFromGemini.response.text().trim();

    if (aiTextOutput.startsWith("```")) {
      aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
    }
    const firstCurly = aiTextOutput.indexOf("{");
    const lastCurly = aiTextOutput.lastIndexOf("}");
    if (firstCurly !== -1 && lastCurly !== -1) {
      aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);
    }

    const parsedArticle = JSON.parse(aiTextOutput);
    const autoImageUrl = await fetchUnsplashPhoto(parsedArticle.image_keyword || "ukraine");
    const uniqueSlug = parsedArticle.slug + "-" + Date.now().toString().slice(-4);

    const { error: dbError } = await supabase.from("posts").insert([
      {
        title: parsedArticle.title,
        slug: uniqueSlug,
        excerpt: parsedArticle.excerpt,
        content: parsedArticle.content,
        keywords: parsedArticle.keywords,
        category: "Блог",
        author_name: "Гід",
        author_image: "https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png",
        is_published: true,
        image_url: autoImageUrl
      }
    ]);

    if (dbError) throw dbError;

    const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
    await triggerGoogleIndexing(deployedArticleUrl);

    await sendTelegramMessage(chatId, `🎉 *Рерайт готовий!* Статтю опубліковано.\n\n📌 *Заголовок:* ${parsedArticle.title}\n🔗 [Читати](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ✅ Успішно надіслано!`);
    return NextResponse.json({ status: "success" });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Невідома помилка";
    if (chatId !== 0) await sendTelegramMessage(chatId, `❌ Сталася помилка: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}