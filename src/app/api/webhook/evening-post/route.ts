import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { JWT } from "google-auth-library";
export const runtime = "nodejs"; 

interface GoogleApiErrorResponse {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FALLBACK_EVENING_TOPICS = [
  "найкращі спа готелі трускавця та східниці для релаксу",
  "де смачно поїсти в трускавці ресторації та кафе",
  "що подивитися в трускавці за три дні самостійно",
  "лікувальна вода нафтуся трускавець як пити правильно",
  "ціни на відпочинок у трускавці поради туристу",
  "куди поїхати на вихідні зі львова в карпати"
];

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

async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("[Unsplash] Ключ відсутній, беремо дефолтне фото.");
    return "/images/posts/default-truskavets.jpg";
  }

  try {
    const refinedQuery = `Carpathians Ukraine ${keyword}`;
    console.log(`[Unsplash] Пошук фото за запитом: "${refinedQuery}"...`);
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&client_id=${accessKey}`,
      { method: "GET" }
    );
    if (!res.ok) {
      console.warn("[Unsplash] Перший запит невдалий, пробуємо дефолтний запит 'Carpathians'...");
      const fallbackRes = await fetch(
        `https://api.unsplash.com/photos/random?query=Carpathians&orientation=landscape&client_id=${accessKey}`,
        { method: "GET" }
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        console.log("[Unsplash] ✅ Знайдено запасне фото Карпат.");
        return fallbackData?.urls?.regular || "/images/posts/default-truskavets.jpg";
      }
      return "/images/posts/default-truskavets.jpg";
    }
    const data = await res.json();
    console.log("[Unsplash] ✅ Фото успішно підібрано.");
    return data?.urls?.regular || "/images/posts/default-truskavets.jpg";
  } catch (err) {
    console.error("[Unsplash] ❌ Помилка підбору фото:", err);
    return "/images/posts/default-truskavets.jpg";
  }
}

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
        
        // TypeScript тепер сам бачить поле error?.message завдяки інтерфейсу
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

async function runEveningAutoGeneration() {
  console.log("[Evening-Bot] ⏳ Крок 1: Збір вечірніх трендів через RSS Google...");
  let currentTrendKeyword = "";

  try {
    const googleTrendsRssUrl = "https://trends.google.com/trending/rss?geo=UA";
    const rssResponse = await axios.get(googleTrendsRssUrl, { timeout: 8000 });
    const $ = cheerio.load(rssResponse.data, { xmlMode: true });
    
    const trends: string[] = [];
    $("item title").each((_, el) => {
      trends.push($(el).text().trim());
    });

    if (trends.length > 0) {
      currentTrendKeyword = trends[Math.floor(Math.random() * Math.min(5, trends.length))];
      console.log(`[Evening-Bot] 🔥 Знайдено тренд в Google UA: "${currentTrendKeyword}"`);
    } else {
      throw new Error("Стрічка трендів порожня");
    }
  } catch (err) {
    console.warn("[Evening-Bot] ⚠️ Не вдалося спарсити Google Trends, беремо тему з масиву FALLBACK...");
    currentTrendKeyword = FALLBACK_EVENING_TOPICS[Math.floor(Math.random() * FALLBACK_EVENING_TOPICS.length)];
    console.log(`[Evening-Bot] 🔥 Обрано запасну тему: "${currentTrendKeyword}"`);
  }

  const formats = [
    "Практичний гайд / інструкція для туристів",
    "Локальний топ-добірка з аналізом цін та умов",
    "Аналітичний репортаж на основі свіжих даних",
    "Журналістське розслідування або експертний розбір"
  ];
  const currentFormat = formats[Math.floor(Math.random() * formats.length)];

  const prompt = `Ти — авторитетний локальний журналіст, аналітик туристичного порталу "Гід Трускавця" та експерт із копірайтингу за суворими стандартами Google E-E-A-T.
  Твоє завдання — написати корисну, фактологічну статтю українською мовою, яка інтегрує актуальний пошуковий тренд "${currentTrendKeyword}" у контекст відпочинку, оздоровлення, SPA або гастрономії на Західній Україні (Трускавець, Східниця, Моршин, Карпати).

  Сьогодні ти пишеш матеріал СУВОРO у форматі: **${currentFormat}**.

  СУВОРІ ПРАВИЛА ДЛЯ ОБХОДУ ФІЛЬТРІВ GOOGLE ТА БОРОТЬБИ З ШАБЛОНАМИ СТРІЧКИ:
  1. КАТЕГОРИЧНО ЗАБОРОНЕНІ ШІ-КЛІШЕ ТА ПАФОС: Жодних "шалений тренд", "бум запитів", "Доброго вечора, друзі!". Починай статтю одразу з контексту, проблеми або аналітики відповідно до формату "${currentFormat}".
  2. СУВОРЕ ТАБУ НА ОДНОТИПНІ ЗАГОЛОВКИ Й АНОНСИ (АНТИ-ШАБЛОН): КАТЕГОРИЧНО ЗАБОРОНЕНО будувати заголовки за схемою "Тема: Підтема" (без двокрапок). Заборонено починати опис (excerpt) зі слів: "Аналіз", "Огляд", "У цій статті", "Дослідження", "Розгляд".
  3. СУХИЙ МЕДИКО-ТУРИСТИЧНИЙ ТОН: Мінеральні води, джерела чи SPA-процедури мають описуватися з погляду бальнеології, доведеної медицини та реального сервісу.
  4. ГЛИБОКА ЛОКАЛЬНА КОНКРЕТИКА ТА ДОСВІД: Інтегруй у текст мінімум 3-4 реальні локації чи факти (Mirotel, Rixos, Шале Грааль, джерела Східниці №2с чи №18, пити через куманці, втрата властивостей Нафтусі за 15-20 хв).

  Поверни відповідь СУВОРO у форматі JSON об'єкта (БЕЗ маркдауну \`\`\`json, просто чистий текст об'єкта):
  {
    "title": "Унікальний журналістський SEO-заголовок (до 60 символів) БЕЗ ДВОКРАПОК, адаптований під формат ${currentFormat}",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "Живий, нешаблонний анонс для картки (до 150 символів). Жодних слів 'аналіз' чи 'огляд'. Почни одразу з фактологічної інтриги.",
    "keywords": "Трускавець, відпочинок Трускавець, санаторії Західної України, Карпати, плюс 2-3 теги тренду",
    "image_keyword": "одне слово англійською для Unsplash (наприклад: 'spa', 'resort', 'hotel', 'nature')",
    "content": "Повний текст статті виключно в HTML форматі (<p>, <h3>, <ul><li>, <strong>). Без знаків переносу рядків \\n."
  }`;

  console.log("[Evening-Bot] ⏳ Крок 2: Ініціалізація Gemini моделі...");

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT, // 👈 Рідний Enum конфігурації Google
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
      console.log(`[Evening-Gemini] 🤖 Запит до ШІ. Спроба №${attempt}/${maxRetries}...`);
      responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      
      if (aiTextOutput) {
        console.log(`[Evening-Gemini] 🎉 Відповідь від ШІ успішно отримана на спробі №${attempt}. Довжина відповіді: ${aiTextOutput.length} симв.`);
        break; 
      }
    } catch (geminiErr: unknown) {
      const errorMsg = geminiErr instanceof Error ? geminiErr.message : "Невідома помилка ШІ";
      console.warn(`[Evening-Gemini] ⚠️ Спроба №${attempt} провалилася. Помилка: ${errorMsg}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Вечірній бот здався після ${maxRetries} спроб через перевантаження API Google.`);
      }
      
      console.log(`[Evening-Gemini] ⏳ Очікування 5 секунд перед наступною спробою...`);
      await new Promise((resolve) => setTimeout(resolve, fixedWaitTime));
    }
  }

  console.log("[Evening-Bot] ⏳ Крок 3: Очищення та валідація отриманого JSON тексту...");
  if (aiTextOutput.startsWith("```")) {
    aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
  }
  const firstCurly = aiTextOutput.indexOf("{");
  const lastCurly = aiTextOutput.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1) {
    aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);
  }

  const parsedArticle = JSON.parse(aiTextOutput);
  console.log(`[Evening-Bot] 📦 JSON успішно розпарсено. Заголовок статті: "${parsedArticle.title}"`);

  console.log("[Evening-Bot] ⏳ Крок 4: Запит зображення з Unsplash...");
  const autoImageUrl = await fetchUnsplashPhoto(parsedArticle.image_keyword || "cozy");
  const uniqueSlug = parsedArticle.slug + "-" + Date.now().toString().slice(-4);

  console.log("[Evening-Bot] ⏳ Крок 5: Запис нової статті в базу даних Supabase...");
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

  if (dbError) {
    console.error("[Supabase] ❌ Помилка запису в базу:", dbError.message);
    throw dbError;
  }
  console.log("[Supabase] ✅ Стаття успішно збережена в таблицю posts.");

  const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
  
  console.log("[Evening-Bot] ⏳ Крок 6: Запуск індексації URL у Google Search Console...");
  // 🔥 Перехоплюємо живий результат виконання запиту на індексацію
  const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId) {
    console.log("[Evening-Bot] ⏳ Крок 7: Надсилання фінального звіту в Telegram...");
    await sendTelegramMessage(
      adminChatId,
      `🌆 *Вечірній автопостинг виконано!*\n\n🔥 *Свіжий тренд вечора:* \`${currentTrendKeyword}\`\n📌 *Назва статті:* ${parsedArticle.title}\n🔗 [Читати статтю на сайті](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`
    );
  }
}

// ОБРОБНИК GET ЗАПИТІВ (ЧИСТИЙ ПРЯМИЙ AWAIT ДЛЯ CRON)
export async function GET(req: Request) {
  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  console.log("[Cron GET] 🔔 Отримано новий запит на вечірній автопостинг.");

  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("[Cron GET] 🛑 Спроба неавторизованого доступу (невірний секрет).");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron GET] 🚀 Авторизація успішна. Початок лінійної генерації статті...");
    await runEveningAutoGeneration();

    console.log("[Cron GET] 🎉 Процес автопостингу повністю завершено.");
    return NextResponse.json({ success: true, message: "Вечірня стаття успішно згенерована та опублікована!" });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка роботи скрипта";
    console.error("🚨 Критична помилка у методі GET:", msg);
    
    if (adminChatId) {
      await sendTelegramMessage(
        adminChatId, 
        `🚨 *Критичний збій вечірнього автопостингу!*\n\n⚠️ *Що зламалося:* \`${msg}\``
      );
    }
    
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}