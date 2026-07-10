// route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import axios from "axios";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getDraftArticlePrompt, getRewriteArticlePrompt } from "./prompts";
import { fetchUnsplashPhoto } from "./unsplash";
import { 
  sendTelegramMessage, 
  sendTelegramWithButtons, 
  answerCallbackQuery, 
  editTelegramMessageText 
} from "./telegram";

export const runtime = "nodejs"; // Змушує Vercel використовувати повне серверне залізо Node.js

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

// Функція для створення чернетки
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
    "Практичний гайд або інструкція для туристів",
    "Локальна добірка з аналізом умов та сервісу",
    "Аналітичний репортаж на основі свіжих пошукових даних",
    "Експертний розбір бальнеологічних або SPA трендів"
  ];
  const currentFormat = formats[Math.floor(Math.random() * formats.length)];

  const prompt = getDraftArticlePrompt(currentFormat, selectedNicheVector, linksPromptString);

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
      is_published: false, // 👈 Створюємо як приховану чернетку
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

// ОБРОБНИК POST ЗАПИТІВ (Єдиний центр Telegram)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const allowedChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);

    // --- 🅰️ ОБРОБКА КЛІКІВ ПО КНОПКАХ (Inline callback_query) ---
    if (body?.callback_query) {
      const callbackQuery = body.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data as string;

      await answerCallbackQuery(callbackQuery.id);

      // Логіка кліку "Опублікувати"
      if (data.startsWith("pub_")) {
        const postId = data.replace("pub_", "");

        const { data: updatedPost, error: fetchErr } = await supabase
          .from("posts")
          .update({ is_published: true, created_at: new Date().toISOString() }) 
          .eq("id", postId)
          .select("title, slug")
          .single();

        if (fetchErr || !updatedPost) throw new Error("Статтю не знайдено в базі даних.");

        const deployedArticleUrl = `https://detruckavtsi.info/blog/${updatedPost.slug}`;

        await editTelegramMessageText(chatId, messageId, `📥 *Чернетка опрацьована:* Надіслано команду на публікацію.`);

        const gscLink = `https://search.google.com/search-console/inspect?resource_id=sc-domain:detruckavtsi.info`;

        const successKeyboard = {
          inline_keyboard: [
            [
              { text: "🔍 Відкрити Search Console", url: gscLink }
            ]
          ]
        };

        await sendTelegramWithButtons(
          chatId,
          `🎉 *Статтю успішно опубліковано на сайті!*\n\n📌 *Назва:* ${updatedPost.title}\n🔗 [Читати статтю на detruckavtsi.info](${deployedArticleUrl})\n\n⚡ *Google Indexing:* Клацніть по URL нижче, щоб скопіювати його, відкрийте Search Console та вставте в рядок пошуку вгорі:\n\n\`${deployedArticleUrl}\``,
          successKeyboard
        );
      } 
      
      // Логіка кліку "Перегенерувати"
      if (data.startsWith("regen_")) {
        const postId = data.replace("regen_", "");

        await supabase.from("posts").delete().eq("id", postId);

        await editTelegramMessageText(chatId, messageId, "🔄 Чернетку видалено. Запускаю повторну генерацію нового варіанту...");

        await generateDraftArticle();
      }

      return NextResponse.json({ status: "success" });
    }

    // --- 🅱️ ОБРОБКА ТЕКСТОВИХ ПОВІДОМЛЕНЬ (Ручний рерайт посилань) ---
    if (body?.message?.text) {
      const chatId = body.message.chat.id;
      const incomingText = body.message.text.trim();

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

      const prompt = getRewriteArticlePrompt(cleanText, linksPromptString);

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
      
      const gscLink = `https://search.google.com/search-console/inspect?resource_id=sc-domain:detruckavtsi.info`;

      const rewriteSuccessKeyboard = {
        inline_keyboard: [
          [
            { text: "🔍 Відкрити Search Console", url: gscLink }
          ]
        ]
      };

      await sendTelegramWithButtons(
        chatId, 
        `🎉 *Рерайт готовий!* Статтю опубліковано.\n\n📌 *Заголовок:* ${parsedArticle.title}\n🔗 [Читати](${deployedArticleUrl})\n\n⚡ *Google Indexing:* Клацніть по URL нижче, щоб скопіювати його, перейдіть у Search Console та вставте для перевірки:\n\n\`${deployedArticleUrl}\``,
        rewriteSuccessKeyboard
      );
      
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Невідома помилка";
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}