import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";
export const runtime = "nodejs"; // 👈 Змушує Vercel використовувати повне серверне залізо Node.js
import { JWT } from "google-auth-library";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface GoogleApiErrorResponse {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface ExistingPostLink {
  title: string;
  slug: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ініціалізація Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Стратегічний нішевий масив для генерації та пошуку ідей
const NICHE_KEYWORDS = [
  "Трускавець (санаторії, бювет, ціни, відпочинок)",
  "Східниця (джерела, спа-готелі, релакс, приватний сектор)",
  "Моршин (оздоровлення, мінеральні води, лікування шлунку)",
  "Здоров'я та Бальнеологія (лікувальна вода Нафтуся, Марія, реабілітація)",
  "Масаж та SPA (лікувальний масаж, термальні басейни, детокс-програми)",
  "Походи, екскурсії та подорожі (природа Карпат, Скелі Довбуша, Тустань, водоспади)"
];

// 1. Функція відправки повідомлень у Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    console.log(`[Telegram] Надсилання сповіщення для чату ${chatId}...`);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    });
    console.log("[Telegram] ✅ Сповіщення успішно надіслано.");
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відправки:", err);
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
    console.log(`[Google Indexing] Завантаження конфігурації з JSON змінної...`);
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error("Змінна GOOGLE_SERVICE_ACCOUNT_JSON відсутня в Environment Variables");
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    console.log(`[Google Indexing] Надсилання лінку на індексацію: ${targetUrl}...`);

    const response = await auth.request({
      url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
      method: "POST",
      data: {
        url: targetUrl,
        type: "URL_UPDATED",
      },
    });

    console.log("[Google Indexing] ✅ URL успішно надіслано в Google Search Console!", response.data);
    return { success: true, message: "✅ Успішно надіслано в Google Search Console!" };
  } catch (error: unknown) {
    let errMsg = "Помилка індексації";
    
    if (error instanceof Error) {
      errMsg = error.message;
      
      const apiError = error as GoogleApiErrorResponse;
      if (apiError.response?.data) {
        console.error(
          "[Google Indexing] Деталі помилки від API Google:", 
          JSON.stringify(apiError.response.data)
        );
        
        const googleErrorMessage = apiError.response.data.error?.message;
        if (googleErrorMessage) {
          errMsg = googleErrorMessage;
        }
      }
    }
    
    console.error("[Google Indexing] ❌ Критична помилка:", errMsg);
    return { success: false, message: `❌ Помилка API: \`${errMsg}\`` };
  }
}

// 4. ФУНКЦІЯ АНАЛІЗУ ТА ГЕНЕРАЦІЇ РАНКОВОЇ СТАТТІ
async function runDailyAutoGeneration() {
  console.log("[Auto-Bot] ⏳ Крок 1: Вибір нішевого напрямку для аналізу...");
  const selectedNicheVector = NICHE_KEYWORDS[Math.floor(Math.random() * NICHE_KEYWORDS.length)];
  console.log(`[Auto-Bot] 🎯 Ранковий вектор аналізу: "${selectedNicheVector}"`);

  // ⛓️ Крок 1.5: Отримуємо попередні статті з Supabase для внутрішньої перелінковки
  console.log("[Auto-Bot] ⏳ Крок 1.5: Отримання лінків для внутрішньої перелінковки...");
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("title, slug")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const existingLinks: ExistingPostLink[] = recentPosts || [];
  const linksPromptString = existingLinks.length > 0
    ? existingLinks.map(p => `- Стаття: [${p.title}](https://detruckavtsi.info/blog/${p.slug})`).join("\n")
    : "Попередні статті відсутні.";

  const formats = [
    "Практичний гайд або інструкція для туристів",
    "Локальна добірка з аналізом умов та сервісу",
    "Аналітичний репортаж на основі свіжих пошукових даних",
    "Експертний розбір бальнеологічних або SPA трендів"
  ];
  const currentFormat = formats[Math.floor(Math.random() * formats.length)];

  const prompt = `Ти — авторитетний локальний журналіст, аналітик туристичного порталу "Гід Трускавця" та провідний експерт із копірайтингу за стандартами Google E-E-A-T.
  Зараз червень 2026 року (активний сезон літніх подорожей, високий попит на квитки, спека, потреба людей у фізичному оздоровленні та знятті стресу в Україні).

  Твоє завдання — змоделювати актуальний пошуковий тренд та написати корисну, фактологічну статтю українською мовою у форматі: **${currentFormat}**.
  Стаття має базуватися НАЙПЕРШЕ на аналізі актуальних потреб українців у межах цього нішевого напрямку: "${selectedNicheVector}".
  Подумай, які практичні нюанси люди шукають у Google за цим напрямком прямо зараз (ціни 2026 року, реальні умови, як підібрати джерело, протипоказання Нафтусі, де знайти професійний масаж, безпечні маршрути в горах) і побудуй навколо цього експертний матеріал.

  ⛓️ СУВОРЕ ПРАВИЛО ВНУТРІШНЬОЇ ПЕРЕЛІНКОВКИ (SEO INTERNAL LINKING):
  Ось список останніх опублікованих статей на нашому сайті:
  ${linksPromptString}
  
  Тобі потрібно ОБОВ'ЯЗКОВО обрати з цього списку мінімум 1 (або максимум 2) найбільш релевантні за змістом статті та органічно вбудувати посилання на них всередину HTML тексту поля "content". 
  Посилання має мати вигляд: <a href="/blog/тут-slug-з-списку">природний текст анкору українською мовою</a>. 
  Анкор повинен ідеально підходити за змістом речення, бути читабельним і не виглядати як спам. Заборонено використовувати слова "читайте тут", "посилання".

  СУВОРІ ПРАВИЛА ДЛЯ ОБХОДУ ФІЛЬТРІВ GOOGLE:
  1. КАТЕГОРИЧНО ЗАБОРОНЕНІ ШІ-КЛІШЕ ТА ГІПЕРБОЛІЗАЦІЯ: Жодних "шалений тренд", "бум запитів", "Доброго ранку, друзі!", "магічна вода", "пристібніть паски". Починай статтю одразу з контексту чи аналітики відповідно до стилю "${currentFormat}".
  2. СУВОРЕ ТАБУ НА ОДНОТИПНІ ЗАГОЛОВКИ ТА МЕТА-ОПИСИ (АНТИ-ШАБЛОН): КАТЕГОРИЧНО ЗАБОРОНЕНО будувати заголовки за схемою "Тема: Підтема" (без двокрапок). Заборонено починати опис (excerpt) зі слів: "Аналіз", "Огляд", "У цій статті", "Дослідження".
  3. СУХИЙ МЕДИКО-ТУРИСТИЧНИЙ ТОН: Описуй процеси з погляду бальнеології, доведеної медицини та реального сервісу, а не "магії".
  4. ЛОКАЛЬНА КОНКРЕТИКА: Інтегруй у текст мінімум 3-4 реальні локації чи факти (Mirotel, Rixos, Шале Грааль, джерела Східниці №2с чи №18, пити через куманці, втрата властивостей Нафтусі за 15-20 хвилин на повітрі через окиснення органіки).

  Поверни відповідь СУВОРO у форматі JSON об'єкта:
  {
    "title": "Унікальний журналістський SEO-заголовок (до 60 символів) БЕЗ ДВОКРАПОК, повністю адаптований під формат ${currentFormat}",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "Живий, нешаблонний анонс для картки (до 150 символів). Жодних слів 'аналіз' або 'огляд'. Почни одразу з дії чи конкретного факту.",
    "keywords": "Трускавець, відпочинок Трускавець, санаторії Західної України, Карпати, масаж, спа, подорожі",
    "image_keyword": "одне слово англійською для Unsplash (наприклад: 'spa', 'massage', 'hiking', 'resort')",
    "content": "Повний текст статті виключно в HTML форматі (<p>, <h3>, <ul><li>, <strong>, <a href='...'>). Текст повинен містити вбудовані внутрішні посилання на попередні статті. Без знаків переносу рядків \\n."
  }`;

  console.log("[Auto-Bot] ⏳ Крок 2: Ініціалізація Gemini моделі зі структурованою схемою...");
  const model = ai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING },
          excerpt: { type: SchemaType.STRING },
          keywords: { type: SchemaType.STRING },
          image_keyword: { type: SchemaType.STRING },
          content: { type: SchemaType.STRING }
        },
        required: ["title", "slug", "excerpt", "keywords", "image_keyword", "content"]
      }
    }
  });

  let responseFromGemini;
  let aiTextOutput = "";
  const maxRetries = 5;
  const fixedWaitTime = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Надсилання запиту до ШІ. Спроба №${attempt}...`);
      responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      if (aiTextOutput) break; 
    } catch (geminiErr: unknown) {
      if (attempt === maxRetries) throw geminiErr;
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

  const { error: dbError } = await supabase.from("posts").insert([
    {
      title: parsedArticle.title,
      slug: uniqueSlug,
      excerpt: parsedArticle.excerpt,
      content: parsedArticle.content,
      keywords: parsedArticle.keywords,
      category: "Блог",
      author_name: "Локальний експерт",
      author_image: "[https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png](https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png)",
      is_published: true,
      image_url: autoImageUrl
    }
  ]);

  if (dbError) throw dbError;

  const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
  const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `🌅 *Ранковий автопостинг виконано!*\n\n🎯 *Вектор аналітики:* \`${selectedNicheVector}\`\n📌 *Нова стаття:* ${parsedArticle.title}\n🔗 [Читати статтю на сайті](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`
    );
  }
}

// 5. ОБРОБНИК GET ЗАПИТІВ (ДЛЯ CRON-JOB ЗРАНКУ)
export async function GET(req: Request) {
  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runDailyAutoGeneration();
    return NextResponse.json({ success: true, message: "Ранкова стаття згенерована успішно!" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка крону";
    console.error("🚨 Помилка автогенерації:", msg);
    if (adminChatId) {
      await sendTelegramMessage(adminChatId, `🚨 *Критичний збій ранкового автопостингу:* \`${msg}\``);
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 6. ОБРОБНИК POST ЗАПИТІВ (ДЛЯ ТЕЛЕГРАМ-БОТА)
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

    await sendTelegramMessage(chatId, "⏳ Посилання отримано! Починаю збір тексту, лінків перелінковки та рерайтинг...");

    // ⛓️ Витягуємо посилання для внутрішньої перелінковки перед рерайтом
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("title, slug")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(3);

    const existingLinks: ExistingPostLink[] = recentPosts || [];
    const linksPromptString = existingLinks.length > 0
      ? existingLinks.map(p => `- Стаття: [${p.title}](https://detruckavtsi.info/blog/${p.slug})`).join("\n")
      : "Попередні статті відсутні.";

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

    const prompt = `Ти — експерт із преміального SEO-копірайтингу по Трускавцю та Західній Україні. Твоє завдання — зробити глибокий авторський рерайт цього тексту українською мовою: ${cleanText}

    ⛓️ СУВОРЕ ПРАВИЛО ВНУТРІШНЬОЇ ПЕРЕЛІНКОВКИ (SEO INTERNAL LINKING):
    Ось список останніх опублікованих статей на нашому сайті:
    ${linksPromptString}
    
    ОБОВ'ЯЗКОВО вибери з цього списку мінімум 1 статтю та органічно інтегруй посилання на неї в HTML-код поля "content": <a href="/blog/slug">природний анкор українською</a>.

    Поверни відповідь СУВОРO у форматі JSON об'єкта через конфігурацію моделі з полями title, slug, excerpt, keywords, image_keyword, content (HTML-формат).`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            slug: { type: SchemaType.STRING },
            excerpt: { type: SchemaType.STRING },
            keywords: { type: SchemaType.STRING },
            image_keyword: { type: SchemaType.STRING },
            content: { type: SchemaType.STRING }
          },
          required: ["title", "slug", "excerpt", "keywords", "image_keyword", "content"]
        }
      }
    });

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
    const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

    await sendTelegramMessage(chatId, `🎉 *Рерайт готовий!* Статтю опубліковано.\n\n📌 *Заголовок:* ${parsedArticle.title}\n🔗 [Читати](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`);
    return NextResponse.json({ status: "success" });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Невідома помилка";
    if (chatId !== 0) await sendTelegramMessage(chatId, `❌ Сталася помилка: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}