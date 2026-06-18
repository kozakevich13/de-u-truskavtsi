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

const NICHE_KEYWORDS = [
  "Трускавець (санаторії, бювет, ціни, відпочинок)",
  "Східниця (джерела, спа-готелі, релакс, приватний сектор)",
  "Mоршин (оздоровлення, мінеральні води, лікування шлунку)",
  "Здоров'я та Бальнеологія (лікувальна вода Нафтуся, Марія, реабілітація)",
  "Масаж та SPA (лікувальний масаж, термальні басейни, детокс-програми)",
  "Походи, екскурсії та подорожі (природа Карпат, Скелі Довбуша, Тустань, водоспади)"
];

// Модифікована функція відправки повідомлень з підтримкою Inline-кнопок
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
    return { success: false, message: `❌ Помилка: \`${errMsg}\`` };
  }
}

// ОСНОВНА ФУНКЦІЯ ГЕНЕРАЦІЇ ЧЕРНЕТКИ
async function generateDraftArticle() {
  const selectedNicheVector = NICHE_KEYWORDS[Math.floor(Math.random() * NICHE_KEYWORDS.length)];


  // ⛓️ Крок 1.5: Отримуємо попередні статті для внутрішньої перелінковки
  console.log("[Evening-Bot] ⏳ Крок 1.5: Отримання лінків для внутрішньої перелінковки...");
  
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

  const formats = ["Практичний гайд / інструкція для туристів", "Локальний топ-добірка з аналізом цін та умов", "Аналітичний репортаж на основі свіжих даних"];
  const currentFormat = formats[Math.floor(Math.random() * formats.length)];

  const prompt = `Ти — експерт із преміального SEO-копірайтингу по Трускавцю та Західній Україні. Напиши статтю українською мовою у форматі: **${currentFormat}** за вектором: "${selectedNicheVector}".
  БЕЗ ШІ-кліше ("шалений тренд", "бум").
  ОБОВ'ЯЗКОВО інтегруй внутрішню перелінковку на основі списку: ${linksPromptString} використовуючи тег <a href="/blog/slug">анкор</a>.
  Поверни СУВОРO JSON об'єкт з полями: title, slug, excerpt, keywords, image_keyword, content.`;

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

  // 💾 ЗАПИСУЄМО ЯК НЕОПУБЛІКОВАНУ ЧЕРНЕТКУ
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
      is_published: true,
      image_url: autoImageUrl
    }
  ]).select("id").single();

  if (dbError) throw dbError;

  // 🔔 ВІДПРАВЛЯЄМО КНОПКИ В ТЕЛЕГРАМ
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
      `📝 *Згенеровано нову чернетку статті!*\n\n🎯 *Вектор:* \`${selectedNicheVector}\`\n📌 *Назва:* ${parsedArticle.title}\n✂️ *Анонс:* ${parsedArticle.excerpt}\n\nОберіть дію:`,
      inlineKeyboard
    );
  }
}

// 1. ОБРОБНИК КРОНУ (Тільки генерує чернетку і надсилає кнопки)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await generateDraftArticle();
    return NextResponse.json({ success: true, message: "Чернетка створена, кнопки відправлено!" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// 2. ОБРОБНИК КЛІКІВ ПО КНОПКАХ (Вхідний Webhook від Telegram)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Перевіряємо, чи це клік по Inline-кнопці (callback_query)
    if (body?.callback_query) {
      const callbackQuery = body.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data as string;
      const token = process.env.TELEGRAM_BOT_TOKEN;

      // Сповіщення Telegram, що запит прийнято (щоб кнопка не "зависала")
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });

      if (data.startsWith("pub_")) {
        const postId = data.replace("pub_", "");

        // 1. Робимо статтю публічною в базі
        const { data: updatedPost, error: fetchErr } = await supabase
          .from("posts")
          .update({ is_published: true, created_at: new Date().toISOString() }) // Оновлюємо дату на свіжу людську
          .eq("id", postId)
          .select("title, slug")
          .single();

        if (fetchErr || !updatedPost) throw new Error("Статтю не знайдено в базі.");

        // 2. Миттєво штовхаємо в індекс Google
        const deployedArticleUrl = `https://detruckavtsi.info/blog/${updatedPost.slug}`;
        const indexingResult = await triggerGoogleIndexing(deployedArticleUrl);

        // Оновлюємо повідомлення в ТГ, прибираючи кнопки
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `🚀 *Статтю успішно опубліковано!*\n\n📌 *Назва:* ${updatedPost.title}\n🔗 [Читати на сайті](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ${indexingResult.message}`
          })
        });
      } 
      
      if (data.startsWith("regen_")) {
        const postId = data.replace("regen_", "");

        // Видаляємо стару невдалу чернетку
        await supabase.from("posts").delete().eq("id", postId);

        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: "🔄 Видаляю стару чернетку та запускаю нову генерацію..." })
        });

        // Запускаємо створення нової статті
        await generateDraftArticle();
      }

      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Помилка";
    console.error("🚨 Помилка POST Webhook:", msg);
    return NextResponse.json({ error: msg }, { status: 200 });
  }
}