import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // 1. ПАРСИНГ ЗОВНІШНЬОГО САЙТУ
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

    // 2. РЕРАЙТИНГ ЧЕРЕЗ GEMINI API
    // 2. РЕРАЙТИНГ ЧЕРЕЗ GEMINI API
    console.log("[Gemini] Підготовка промпту та запуск запиту до Google AI Studio...");
    const prompt = `Ти — експерт із SEO-копірайтингу та локальний гід по Трускавцю. Твоє завдання: взяти цей текст новини та повністю перефразувати його українською мовою. Зроби статтю унікальною, з емоційними тригерами, клікбейтною, але збережи оригінальні факти.
    Текст для рерайту: ${cleanText}

    Поверни відповідь СУВОРO у форматі JSON об'єкта (БЕЗ маркдауну \`\`\`json, просто чистий текст об'єкта) з такими полями:
    {
      "title": "клікбейтний заголовок",
      "slug": "url-шлях-транслітом-через-дефіси",
      "excerpt": "короткий опис на 150 символів для мета-тегів",
      "keywords": "ключові слова через кому",
      "content": "текст статті виключно в HTML форматі. Кожен абзац загорни в <p>, підзаголовки в <h3>, списки в <ul><li>. Важливі акценти — <strong>. Без знаків переносу рядків \\n."
    }`;

    // Залізобетонний URL для безкоштовних ключів Gemini 1.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    console.log(`[Gemini] Надсилання запиту на стабільний ендпоінт: v1beta/models/gemini-1.5-flash`);
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        contents: [
          { 
            parts: [{ text: prompt }] 
          }
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`[Gemini] Статус помилки: ${geminiResponse.status}. Текст відповіді: ${errText}`);
      throw new Error(`Gemini API повернув статус ${geminiResponse.status}: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("[Gemini] Успішна відповідь від Google отримано.");
    
    if (!geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[Gemini] Неочікувана структура відповіді:", JSON.stringify(geminiData));
      throw new Error("Google Gemini повернув порожню відповідь або некоректну структуру даних.");
    }

    let aiTextOutput = geminiData.candidates[0].content.parts[0].text.trim();
    
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
    } catch (parseError) {
      console.error("[Gemini] Помилка парсингу тексту:", aiTextOutput);
      throw new Error("AI повернув текст замість структурованого JSON. Можливо, сервіс перевантажений. Спробуйте ще раз за хвилину.");
    }

    console.log(`[Gemini] Результат успішно розпарсено. Заголовок: "${parsedArticle.title}"`);

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
          author_name: "ШІ-Гід",
          author_image: "[https://api.dicebear.com/7.x/avataaars/svg?seed=Felix](https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)",
          is_published: false, 
          image_url: "/images/posts/default-truskavets.jpg"
        }
      ]);

    if (dbError) {
      console.error("[Supabase] Помилка бази даних під час вставки:", dbError);
      throw dbError;
    }

    console.log("[Supabase] Запис успішно створено. Відправляємо фінальний статус Шефу.");
    await sendTelegramMessage(chatId, `🎉 *Успіх!* Статтю "${parsedArticle.title}" успішно згенеровано та добано в чернетки Supabase. Зайдіть в адмінку, щоб підтвердити публікацію!`);
    
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
    
    // КРИТИЧНО ДЛЯ TELEGRAM: Повертаємо 200 статус, щоб Telegram зрозумів, 
    // що запит оброблено, і припинив надсилати його повторно.
    return NextResponse.json({ error: errorMessage, handled: true }, { status: 200 });
  }
}