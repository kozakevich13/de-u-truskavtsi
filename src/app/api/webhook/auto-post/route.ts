import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Функція для відправки текстових повідомлень назад у Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
  });
}

export async function POST(req: Request) {
  let chatId = 0;
  try {
    const body = await req.json();

    // Перевіряємо, чи це стандартне текстове повідомлення від Telegram
    if (!body?.message?.text) {
      return NextResponse.json({ status: "ignored" });
    }

    chatId = body.message.chat.id;
    const incomingText = body.message.text.trim();
    const allowedChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);

    // Захист: реагуємо тільки на твої повідомлення
    if (chatId !== allowedChatId) {
      await sendTelegramMessage(chatId, "🛑 Доступ обмежено. Ви не є власником цього бота.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Якщо це просто старт бота
    if (incomingText === "/start") {
      await sendTelegramMessage(chatId, "🦆 Вітаю, Шеф! Надішліть мені посилання на будь-яку статтю чи новину про Трускавець, і я автоматично додам її рерайт на сайт.");
      return NextResponse.json({ status: "success" });
    }

    // Перевіряємо, чи текст схожий на URL
    if (!incomingText.startsWith("http://") && !incomingText.startsWith("https://")) {
      await sendTelegramMessage(chatId, "⚠️ Будь ласка, надішліть коректне посилання, що починається з `https://` або `http://`.");
      return NextResponse.json({ status: "bad_request" });
    }

    await sendTelegramMessage(chatId, "⏳ Посилання отримано! Починаю збір тексту та рерайтинг через Gemini...");

    // 1. ПАРСИНГ ЗОВНІШНЬОГО САЙТУ
    const response = await axios.get(incomingText, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 10000 // 10 секунд ліміт на завантаження
    });
    
    const $ = cheerio.load(response.data);
    $("script, style, nav, footer, header, aside, .comments, .ads").remove();
    
    const rawText = $("article, main, .content, .post-content, .entry-content").text().trim() || $("body").text().trim();
    const cleanText = rawText.replace(/\s+/g, " ").slice(0, 3500); // Оптимальний розмір тексту

    if (cleanText.length < 200) {
      await sendTelegramMessage(chatId, "❌ Не вдалося витягнути достатньо тексту з цього сайту. Можливо, він захищений від парсингу.");
      return NextResponse.json({ status: "parsing_failed" });
    }

    // 2. РЕРАЙТИНГ ЧЕРЕЗ GEMINI API (БЕЗКОШТОВНО)
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

    // Заміни старий блок fetch до Gemini на цей оновлений варіант:
    const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API помилка: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    let aiTextOutput = geminiData.candidates[0].content.parts[0].text.trim();
    
    // Страховка на випадок, якщо Gemini все ж оберне відповідь у маркдаун блок ```json
    if (aiTextOutput.startsWith("```")) {
      aiTextOutput = aiTextOutput.replace(/^```json|```$/g, "").trim();
    }

    const parsedArticle = JSON.parse(aiTextOutput);

    // 3. ЗБЕРЕЖЕННЯ В SUPABASE
    const { error: dbError } = await supabase
      .from("posts")
      .insert([
        {
          title: parsedArticle.title,
          slug: parsedArticle.slug + "-" + Date.now().toString().slice(-4), // Унікальний хвіст для уникнення дублів слага
          excerpt: parsedArticle.excerpt,
          content: parsedArticle.content,
          keywords: parsedArticle.keywords,
          category: "Новини",
          author_name: "ШІ-Гід",
          author_image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
          is_published: false, // Зберігаємо як чернетку, щоб ти міг перевірити перед публікацією
          image_url: "/images/posts/default-truskavets.jpg"
        }
      ]);

    if (dbError) throw dbError;

    await sendTelegramMessage(chatId, `🎉 *Успіх!* Статтю "${parsedArticle.title}" успішно згенеровано та додано в чернетки Supabase. Зайдіть в адмінку, щоб підтвердити публікацію!`);
    return NextResponse.json({ status: "success" });

} catch (error: unknown) {
    // Безпечно витягуємо повідомлення про помилку
    const errorMessage = error instanceof Error ? error.message : "Невідома помилка сервера";
    
    console.error("🚨 Помилка:", errorMessage);
    
    if (chatId !== 0) {
      await sendTelegramMessage(
        chatId, 
        `❌ Сталася помилка під час обробки: ${errorMessage}`
      );
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}