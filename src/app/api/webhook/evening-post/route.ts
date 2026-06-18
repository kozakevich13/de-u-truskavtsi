import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

interface ExistingPostLink {
  title: string;
  slug: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Наш стратегічний нішевий масив для генерації та пошуку ідей
const NICHE_KEYWORDS = [
  "Трускавець (санаторії, бювет, ціни, відпочинок)",
  "Східниця (джерела, спа-готелі, релакс, приватний сектор)",
  "Моршин (оздоровлення, мінеральні води, лікування шлунку)",
  "Здоров'я та Бальнеологія (лікувальна вода Нафтуся, Марія, реабілітація)",
  "Масаж та SPA (лікувальний масаж, термальні басейни, детокс-програми)",
  "Походи, екскурсії та подорожі (природа Карпат, Скелі Довбуша, Тустань, водоспади)"
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
  if (!accessKey) return "/images/posts/default-truskavets.jpg";

  try {
    const refinedQuery = `Carpathians Ukraine ${keyword}`;
    console.log(`[Unsplash] Пошук фото за запитом: "${refinedQuery}"...`);
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
    console.error("[Unsplash] ❌ Помилка підбору фото:", err);
    return "/images/posts/default-truskavets.jpg";
  }
}

async function triggerGoogleIndexing(targetUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error("Змінна GOOGLE_SERVICE_ACCOUNT_JSON відсутня");
    }
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    const response = await auth.request({
      url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
      method: "POST",
      data: { url: targetUrl, type: "URL_UPDATED" },
    });

    console.log("[Google Indexing] ✅ URL успішно надіслано!", response.data);
    return { success: true, message: "✅ Успішно надіслано в Google Search Console!" };
  } catch (error: unknown) {
    let errMsg = "Помилка індексації";
    if (error instanceof Error) {
      errMsg = error.message;
      const apiError = error as GoogleApiErrorResponse;
      if (apiError.response?.data?.error?.message) {
        errMsg = apiError.response.data.error.message;
      }
    }
    return { success: false, message: `❌ Помилка API: \`${errMsg}\`` };
  }
}

async function runEveningAutoGeneration() {
  console.log("[Evening-Bot] ⏳ Крок 1: Вибір випадкового нішевого вектору аналізу...");
  
  // Обираємо випадковий напрямок з нашого цільового масиву для цієї генерації
  const selectedNicheVector = NICHE_KEYWORDS[Math.floor(Math.random() * NICHE_KEYWORDS.length)];
  console.log(`[Evening-Bot] 🎯 Обрано вектор аналізу: "${selectedNicheVector}"`);

  // ⛓️ Крок 1.5: Отримуємо попередні статті для внутрішньої перелінковки
  console.log("[Evening-Bot] ⏳ Крок 1.5: Отримання лінків для внутрішньої перелінковки...");
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
    "Практичний гайд / інструкція для туристів",
    "Локальний топ-добірка з аналізом цін та умов",
    "Аналітичний репортаж на основі свіжих даних",
    "Експертний розбір бальнеологічних або SPA трендів"
  ];
  const currentFormat = formats[Math.floor(Math.random() * formats.length)];

  // Формуємо глибокий промпт, де Gemini сам аналізує актуальність у червні 2026 року
  const prompt = `Ти — авторитетний локальний журналіст, аналітик туристичного порталу "Гід Трускавця" та провідний експерт із копірайтингу за стандартами Google E-E-A-T.
  Зараз червень 2026 року (сезон літніх відпусток, висока завантаженість поїздів, спека, потреба людей у психологічному та фізичному відновленні в Україні).
  
  Твоє завдання — змоделювати актуальний пошуковий тренд та написати корисну, фактологічну статтю українською мовою у форматі: **${currentFormat}**.
  
  Стаття має базуватися НАЙПЕРШЕ на аналізі актуальних потреб українців у межах цього нішевого напрямку: "${selectedNicheVector}".
  Подумай, що саме люди шукають у Google за цим напрямком прямо зараз (ціни 2026 року, як дістатися, як уникнути шахраїв, протипоказання мінеральних вод, де знайти професійного масажиста, куди піти в гори без важких рюкзаків) і побудуй навколо цього експертний матеріал.

  ⛓️ СУВОРЕ ПРАВИЛО ВНУТРІШНЬОЇ ПЕРЕЛІНКОВКИ (SEO INTERNAL LINKING):
  Ось список останніх опублікованих статей на нашому сайті:
  ${linksPromptString}
  
  Тобі потрібно ОБОВ'ЯЗКОВО обрати з цього списку мінімум 1 (або максимум 2) найбільш релевантні за змістом статті та органічно вбудувати посилання на них всередину HTML тексту поля "content". 
  Посилання має мати вигляд: <a href="/blog/тут-slug-з-списку">природний текст анкору українською мовою</a>. 
  Анкор (текст посилання) повинен ідеально підходити за змістом речення, бути читабельним і не виглядати як спам. Заборонено використовувати слова "читайте тут", "посилання".

  СУВОРІ ПРАВИЛА ДЛЯ ОБХОДУ ФІЛЬТРІВ GOOGLE (АНТИ-ШІ):
  1. КАТЕГОРИЧНО ЗАБОРОНЕНІ ШІ-КЛІШЕ ТА ПАФОС: Жодних "шалений тренд", "бум запитів", "Доброго вечора, друзі!", "магічний релакс", "пристібніть паски". Починай статтю одразу з аналітики чи фактів відповідно до формату "${currentFormat}".
  2. СУВОРЕ ТАБУ НА ОДНОТИПНІ ЗАГОЛОВКИ ТА МЕТА-ОПИСИ: КАТЕГОРИЧНО ЗАБОРОНЕНО будувати заголовки за схемою "Тема: Підтема" (без двокрапок). Заборонено починати опис (excerpt) зі слів: "Аналіз", "Огляд", "У цій статті", "Дослідження".
  3. ЛОКАЛЬНА КОНКРЕТИКА (Матчастина): Інтегруй у текст мінімум 3-4 реальні локації чи факти (Mirotel, Rixos, Шале Грааль, джерела Східниці №2с чи №18, пити через куманці, втрата властивостей Нафтусі за 15-20 хв на повітрі через окиснення органіки).

  Поверни відповідь СУВОРO у форматі JSON об'єкта:
  {
    "title": "Унікальний журналістський SEO-заголовок (до 60 символів) БЕЗ ДВОКРАПОК, адаптований під формат ${currentFormat}",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "Живий, нешаблонний анонс для картки (до 150 символів). Почни одразу з дії, інтриги або конкретного факту, без слів 'огляд' чи 'аналіз'.",
    "keywords": "Трускавець, відпочинок Трускавець, санаторії Західної України, Карпати, масаж, спа, подорожі",
    "image_keyword": "одне слово англійською для Unsplash (наприклад: 'spa', 'massage', 'hiking', 'resort')",
    "content": "Повний текст статті виключно в HTML форматі (<p>, <h3>, <ul><li>, <strong>, <a href='...'>). Текст повинен містити вбудовані внутрішні посилання на попередні статті, як вказано в інструкції перелінковки. Без знаків переносу рядків \\n."
  }`;

  console.log("[Evening-Bot] ⏳ Крок 2: Ініціалізація Gemini моделі зі структурованою схемою...");
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
      console.log(`[Evening-Gemini] 🤖 Запит до ШІ. Спроба №${attempt}/${maxRetries}...`);
      responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      if (aiTextOutput) break; 
    } catch (geminiErr: unknown) {
      if (attempt === maxRetries) throw geminiErr;
      await new Promise((resolve) => setTimeout(resolve, fixedWaitTime));
    }
  }

  console.log("[Evening-Bot] ⏳ Крок 3: Парсинг JSON тексту...");
  if (aiTextOutput.startsWith("```")) {
    aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
  }
  const firstCurly = aiTextOutput.indexOf("{");
  const lastCurly = aiTextOutput.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1) {
    aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);
  }

  const parsedArticle = JSON.parse(aiTextOutput);
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

  if (dbError) throw dbError;
  console.log("[Supabase] ✅ Стаття успішно збережена.");

  const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
  const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `🌆 *Вечірній автопостинг виконано!*\n\n🎯 *Вектор аналітики:* \`${selectedNicheVector}\`\n📌 *Назва статті:* ${parsedArticle.title}\n🔗 [Читати статтю](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runEveningAutoGeneration();
    return NextResponse.json({ success: true, message: "Успішно опубліковано!" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка роботи скрипта";
    console.error("🚨 Критична помилка:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}