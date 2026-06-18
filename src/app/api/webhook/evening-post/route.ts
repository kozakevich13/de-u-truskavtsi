import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { JWT } from "google-auth-library";
import axios from "axios";
import * as cheerio from "cheerio";
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
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відправки повідомлення:", err);
  }
}

async function sendTelegramWithButtons(chatId: number, text: string, replyMarkup: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text, 
        parse_mode: "Markdown",
        reply_markup: replyMarkup
      }),
    });
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відправки кнопок:", err);
  }
}

async function fetchUnsplashPhoto(keyword: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return "/images/posts/default-truskavets.jpg";
  try {
    const refinedQuery = `Carpathians Ukraine ${keyword}`;
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&client_id=${accessKey}`);
    if (!res.ok) return "/images/posts/default-truskavets.jpg";
    const data = await res.json();
    return data?.urls?.regular || "/images/posts/default-truskavets.jpg";
  } catch {
    return "/images/posts/default-truskavets.jpg";
  }
}

async function triggerGoogleIndexing(targetUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("Змінна відсутня");
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });
    await auth.request({
      url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
      method: "POST",
      data: { url: targetUrl, type: "URL_UPDATED" },
    });
    return { success: true, message: "✅ Успішно надіслано в Google Search Console!" };
  } catch (error: unknown) {
    let errMsg = "Помилка індексації";
    if (error instanceof Error) {
      errMsg = error.message;
      const apiError = error as GoogleApiErrorResponse;
      if (apiError.response?.data?.error?.message) errMsg = apiError.response.data.error.message;
    }
    return { success: false, message: `❌ Помилка API: \`${errMsg}\`` };
  }
}

async function generateDraftArticle() {
  const selectedNicheVector = NICHE_KEYWORDS[Math.floor(Math.random() * NICHE_KEYWORDS.length)];
  
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

  const prompt = `Ти — авторитетний локальний журналіст, αναлітик туристичного порталу "Гід Трускавця" та провідний експерт із копірайтингу за стандартами Google E-E-A-T.
  Зараз червень 2026 року (сезон літніх відпусток, висока завантаженість поїздів, спека, потреба людей у психологічному та фізичному відновленні в Україні).
  
  Твоє завдання — змоделювати актуальний пошуковий тренд та написати корисну, фактологічную статтю українською мовою у форматі: **${currentFormat}**.
  
  Стаття має базуватися НАЙПЕРШЕ на аналізі актуальних потребах українців у межах цього нішевого напрямку: "${selectedNicheVector}".
  Подумай, що саме люди шукають у Google за цим напрямком прямо зараз (ціни 2026 року, як дістатися, як уникнути шахраїв, протипоказання мінеральних вод, де знайти професійного масажиста, куди піти в гори без важких рюкзаків) і побудуй навколо цього експертний матеріал.

  ⛓️ СУВОРЕ ПРАВИЛО ВНУТРІШНЬОЇ ПЕРЕЛІНКОВКИ (SEO INTERNAL LINKING):
  Ось список останніх опублікованих статей на нашому сайті:
  ${linksPromptString}
  
  Тобі потрібно ОБОВ'ЯЗКОВО обрати з цього списку мінімум 1 (або максимум 2) найбільш релевантні за змістом статті та органічно вбудувати посилання на них всередину HTML тексту поля "content". 
  Посилання має мати вигляд: <a href="/blog/тут-slug-з-списку">природний текст анкору українською мовою</a>. 
  Анкор (текст посилання) повинен ідеально підходити за змістом речення, бути читабельним і не виглядати як спам. Заборонено використовувати слова "читайте тут", "посилання".

  СУВОРІ ПРАВИЛА ДЛЯ ОБХОДУ ФІЛЬТРІВ GOOGLE (АНТИ-ШІ) ТА УСУНЕННЯ ОДНОТИПНОСТІ СТРІЧКИ:
  1. КАТЕГОРИЧНО ЗАБОРОНЕНІ ШІ-КЛІШЕ ТА ПАФОС: 
  - Жодних перебільшень: "Google розривається від запитів", "мільйони українців шукають", "шалений тренд", "справжній бум". Пиши стримано: "За останніми даними пошукових трендів...", "Зараз спостерігається сезонне зростання інтересу до...".
  - Жодних дешевих закликів та езотерики: "Пристібніть паски", "вирушаємо в захопливу подорож", "дізнатися всі секрети", "магічна вода", "еліксир для душі та тіла", "неймовірні краєвиди".
  - Жодних підліткових привітань: "Доброго ранку/вечора, друзі!" або "Увага, друзі!". Починай статтю одразу з контексту, проблеми або аналітики відповідно до стилю "${currentFormat}".
  
  2. СУВОРЕ ТАБУ НА ОДНОТИПНІ ЗАГОЛОВКИ ТА МЕТА-ОПИСИ: 
  - КАТЕГОРИЧНО ЗАБОРОНЕНО будувати заголовки за схемою "Тема: Підтема" (забудь про двокрапки виду "Трускавець: Фокус на..."). Сформулюй живий, цілісний журналістський заголовок, адаптований під формат "${currentFormat}".
  - ЧОРНИЙ СПИСОК СЛІВ ДЛЯ EXCERPT (МЕТА-ОПИСУ): Категорично заборонено починати або використовувати в описі слова: "Аналіз", "Огляд", "У цій статті", "Дослідження", "Розгляд". Опис має бути живим, інтригуючим фактом, практичним лайфхаком або закликом до читання для людини, а не технічним звітом. Заборонено згадувати абревіатуру "Google E-E-A-T" у тексті, який бачить читач.
  
  3. СУХИЙ МЕДИКО-ТУРИСТИЧНИЙ ТОН (Expertise):
  Пиши впевнено, серйозно та аргументовано. Мінеральні води, джерела чи SPA-процедури мають описуватися з погляду бальнеології, доведеної медицини та реального сервісу, а не "магії". Текст має бути корисним для дорослої людини, яка планує поїздку.
  
  4. ГЛИБОКА ЛОКАЛЬНА КОНКРЕТИКА (Матчастина) ТА ДОСВІД (Experience):
  - Обов'язково інтегруй у текст мінімум 3-4 реальні локації, медичні застереження або бальнеологічні факти. Наприклад: мінеральні води (Нафтуся, Марія), їхній хімічний склад (органіка нафтового походження, гідрокарбонати), специфіка прийому (пити виключно через фарфорові куманці/поїлки в бюветі для захисту емалі зубів, втрата лікувальних властивостей на повітрі за 15-20 хвилин), або конкретні діючі комплекси (Mirotel, Rixos, Женева, Карпати, Шале Грааль, джерела Східниці №2с чи №18, спа-готель "Респект").
  - Органічно вплети у текст фрази: "наша редакція перевірила", "місцеві фахівці радять", "за спостереженнями наших гідів", "відгуки відпочивальників цього сезону підтверджують".

  Поверни відповідь СУВОРO у форматі JSON об'єктa:
  {
    "title": "Унікальний журналістський SEO-заголовок (до 60 символів) БЕЗ ДВОКРАПОК, адаптований під формат ${currentFormat}",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "Живий, нешаблонний анонс для картки (до 150 символів). Почни одразу з дії, інтриги або конкретного факту, без слів 'огляд' чи 'аналіз'.",
    "keywords": "Трускавець, відпочинок Трускавець, санаторії Західної України, Карпати, масаж, спа, подорожі",
    "image_keyword": "одне слово англійською для Unsplash (наприклад: 'spa', 'massage', 'hiking', 'resort')",
    "content": "Повний текст статті виключно в HTML форматі (<p>, <h3>, <ul><li>, <strong>, <a href='...'>). Текст повинен містити вбудовані внутрішні посилання на попередні статті, як вказано в інструкції перелінковки. Без знаків переносу рядків \\n."
  }`;

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
  
  if (aiTextOutput.startsWith("```")) aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
  const firstCurly = aiTextOutput.indexOf("{");
  const lastCurly = aiTextOutput.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1) aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);

  const parsedArticle = JSON.parse(aiTextOutput);
  const autoImageUrl = await fetchUnsplashPhoto(parsedArticle.image_keyword || "cozy");
  const uniqueSlug = parsedArticle.slug + "-" + Date.now().toString().slice(-4);

  const { data: newPost, error: dbError } = await supabase.from("posts").insert([
    {
      title: parsedArticle.title,
      slug: uniqueSlug,
      excerpt: parsedArticle.excerpt,
      content: parsedArticle.content,
      keywords: parsedArticle.keywords,
      category: "Блог",
      author_name: "Локальний експерт",
      author_image: "https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png",
      is_published: false, 
      image_url: autoImageUrl
    }
  ]).select("id").single();

  if (dbError) throw dbError;

  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId && newPost) {
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опублікувати", callback_data: `pub_${newPost.id}` },
          { text: "🔄 Перегенерувати", callback_data: `regen_${newPost.id}` }
        ]
      ]
    };

    await sendTelegramWithButtons(
      adminChatId,
      `📝 *Згенеровано нову нішеву чернетку!*\n\n🎯 *Вектор:* \`${selectedNicheVector}\`\n📌 *Назва:* ${parsedArticle.title}\n✂️ *Анонс:* ${parsedArticle.excerpt}\n\nОберіть дію:`,
      inlineKeyboard
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await generateDraftArticle();
    return NextResponse.json({ success: true, message: "Чернетка створена успішно!" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const allowedChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);

    // 1. ОБРОБКА КЛІКІВ ПО КНОПКАХ (Inline callback_query)
    if (body?.callback_query) {
      const callbackQuery = body.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data as string;

      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });

      if (data.startsWith("pub_")) {
        const postId = data.replace("pub_", "");
        const { data: updatedPost, error: fetchErr } = await supabase
          .from("posts")
          .update({ is_published: true, created_at: new Date().toISOString() }) 
          .eq("id", postId)
          .select("title, slug")
          .single();

        if (fetchErr || !updatedPost) throw new Error("Статтю не знайдено в базі.");

        const deployedArticleUrl = `https://detruckavtsi.info/blog/${updatedPost.slug}`;
        const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `📥 *Чернетка опрацьована:* Надіслано команду на публікацію.`
          })
        });

        await sendTelegramMessage(
          chatId,
          `🎉 *Статтю успішно опубліковано на сайті!*\n\n📌 *Назва:* ${updatedPost.title}\n🔗 [Читати статтю на detruckavtsi.info](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`
        );
      } 
      
      if (data.startsWith("regen_")) {
        const postId = data.replace("regen_", "");
        await supabase.from("posts").delete().eq("id", postId);
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: "🔄 Чернетку видалено. Генерую новий варіант..." })
        });
        await generateDraftArticle();
      }
      return NextResponse.json({ status: "success" });
    }

    // 2. ОБРОБКА ТЕКСТОВИХ ПОВІДОМЛЕНЬ (Твій ручний рерайт посилань)
    if (body?.message?.text) {
      const chatId = body.message.chat.id;
      const incomingText = body.message.text.trim();

      if (chatId !== allowedChatId) {
        await sendTelegramMessage(chatId, "🛑 Доступ обмежено.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (incomingText === "/start") {
        await sendTelegramMessage(chatId, "🦆 Вітаю, Шеф! Надішліть посилання для рерайту.");
        return NextResponse.json({ status: "success" });
      }

      if (!incomingText.startsWith("http://") && !incomingText.startsWith("https://")) {
        await sendTelegramMessage(chatId, "⚠️ Будь ласка, надішліть коректне посилання.");
        return NextResponse.json({ status: "bad_request" });
      }

      await sendTelegramMessage(chatId, "⏳ Посилання отримано! Робочий рерайт з урахуванням лінків...");

      const response = await axios.get(incomingText, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      $("script, style, nav, footer, header, aside, .comments, .ads").remove();
      const rawText = $("article, main, .content, .post-content, .entry-content").text().trim() || $("body").text().trim();
      const cleanText = rawText.replace(/\s+/g, " ").slice(0, 3500);

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

      const prompt = `Ти — експерт із преміального SEO-копірайтингу по Трускавцю. Зроби глибокий авторський рерайт тексту: ${cleanText}
      ⛓️ ІНТЕГРУЙ ЛІНК: ${linksPromptString} через <a href="/blog/slug">анкор</a>. Поверни JSON об'єкт з полями title, slug, excerpt, keywords, image_keyword, content.`;

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

      if (aiTextOutput.startsWith("```")) aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
      const firstCurly = aiTextOutput.indexOf("{");
      const lastCurly = aiTextOutput.lastIndexOf("}");
      if (firstCurly !== -1 && lastCurly !== -1) aiTextOutput = aiTextOutput.slice(firstCurly, lastCurly + 1);

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

      await sendTelegramMessage(chatId, `🎉 *Рерайт готовий!* Опубліковано.\n\n📌 *Заголовок:* ${parsedArticle.title}\n🔗 [Читати](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`);
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка";
    return NextResponse.json({ error: msg }, { status: 200 });
  }
}