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

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Запасні теми суто про Західну Україну, якщо RSS-стрічка Google Трендов впаде вечірньої пори
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
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("[Telegram] Помилка відправки:", err);
  }
}

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

// Функція збору вечірніх трендів та генерації лонгріду
async function runEveningAutoGeneration() {
  console.log("[Evening-Bot] Запуск вечірньої генерації через Google Trends...");
  let currentTrendKeyword = "";

  try {
    // Парсимо свіжі вечірні тренди Google України
    const googleTrendsRssUrl = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=UA";
    const rssResponse = await axios.get(googleTrendsRssUrl, { timeout: 8000 });
    const $ = cheerio.load(rssResponse.data, { xmlMode: true });
    
    const trends: string[] = [];
    $("item title").each((_, el) => {
      trends.push($(el).text().trim());
    });

    if (trends.length > 0) {
      // Вечірні тренди часто оновлюються, беремо свіжий гарячий запит
      currentTrendKeyword = trends[Math.floor(Math.random() * Math.min(5, trends.length))];
      console.log(`[Evening-Bot] Знайдено активний вечірній тренд в Google UA: "${currentTrendKeyword}"`);
    } else {
      throw new Error("Стрічка трендів порожня");
    }
  } catch (err) {
    console.warn("[Evening-Bot] Не вдалося спарсити Google Trends, використовуємо запасну тему...");
    currentTrendKeyword = FALLBACK_EVENING_TOPICS[Math.floor(Math.random() * FALLBACK_EVENING_TOPICS.length)];
  }

  const prompt = `Ти — авторитетний локальний гід, головний редактор туристичного порталу "Гід Трускавця" та експерт із преміального копірайтингу за стандартами Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).
  
  Сьогодні ввечері в Україні активний тренд у пошуку Google: "${currentTrendKeyword}".
  Твоє завдання — написати велику, глибоку статтю українською мовою у стилі "вечірнього затишного лонгріду", пов'язавши цей тренд із відпочинком, релаксом, оздоровленням чи гастрономією на Західній Україні (Трускавець, Східниця, Моршин, Карпати).

  СУВОРІ ПРАВИЛА ДЛЯ ОБХОДУ ФІЛЬТРІВ GOOGLE ТА ПІДНЯТТЯ CTR:
  1. ЗАБОРОНА НА ШІ-ШАБЛОНИ: Жодних фраз на кшталт "Сьогоднішній вечір приніс новий тренд...", "Як відомо...", "У цій статті ми розглянемо...". Замість цього пиши як живий експерт: "Коли вечірній Трускавець занурюється у спокій, саме час подумати про релакс. Останні запити в мережі показують, що українці активно шукають... Ми в 'Гід Трускавця' підготували практичний розбір...".
  2. МАТЧАСТИНА ТА КОНКРЕТИКА ЗАМІСТЬ ПОВТОРІВ: Жодних загальних роздумів про "кришталеве повітря" та "мальовничі краєвиди". Додай мінімум 3-4 реальні об'єкти з деталями. Наприклад: якщо пишеш про релакс — згадай спа-комплекс готелю 'Женева' чи 'Карпати', якщо про лікування — мінеральні води 'Нафтуся' чи 'Марія' з конкретними порадами (наприклад: "...воду варто пити виключно через фарфорові куманці з бювету, щоб захистити емаль зубів").
  3. МАРКЕРИ РЕАЛЬНОГО ДОСВІДУ (Experience): Обов'язково використовуй у тексті фрази: "наша команда перевірила на практиці", "ми рекомендуємо з власного досвіду", "за спостереженнями наших гідів", "відгуки відпочивальників цього тижня підтверджують". Текст має виглядати як повноцінне самостійне локальне дослідження.
  4. СТРУКТУРА: Текст має бути розбитий на абзаци (<p>), мати чіткі підзаголовки (<h3>), марковані списки (<ul><li>) для лайфхаків або чек-лістів, та виділення важливих назв чи цифр через <strong>.

  Поверни відповідь СУВОРO у форматі JSON об'єкта (БЕЗ маркдауну \`\`\`json, просто чистий текст об'єкта):
  {
    "title": "атмосферний, глибокий вечірній заголовок, що містить тренд або близьку тему",
    "slug": "url-шлях-транслітом-виключно-через-дефіси",
    "excerpt": "короткий, захоплюючий опис на 150 символів для мета-тегу Description з фокусом на експертність",
    "keywords": "Трускавець, відпочинок в карпатах, східниця, вечірній релакс, спа трускавець",
    "image_keyword": "одне слово англійською для Unsplash (наприклад: 'cozy', 'spa', 'dinner', 'sunset')",
    "content": "повний текст статті виключно в HTML форматі. Кожен абзац загорни в <p>, підзаголовки структурних блоків в <h3>, списки в <ul><li>. Важливі місця — <strong>. Без знаків переносу рядків \\n."
  }`;

  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  let responseFromGemini;
  let aiTextOutput = "";
  
  // 5 спроб з інтервалом в 5 секунд за твоїм планом
  const maxRetries = 5;
  const fixedWaitTime = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Evening-Gemini] Відправка запиту до ШІ. Спроба №${attempt}...`);
      responseFromGemini = await model.generateContent(prompt);
      aiTextOutput = responseFromGemini.response.text().trim();
      
      if (aiTextOutput) {
        console.log(`[Evening-Gemini] 🎉 Відповідь успішно отримано на спробі №${attempt}!`);
        break; 
      }
    } catch (geminiErr: unknown) {
      const errorMsg = geminiErr instanceof Error ? geminiErr.message : "Невідома помилка ШІ";
      console.warn(`[Evening-Gemini] Спроба №${attempt} провалилася. Помилка: ${errorMsg}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Вечірній бот здався після ${maxRetries} спроб через навантаження API Google.`);
      }
      
      console.log(`[Evening-Gemini] Очікування 5 секунд перед спробою №${attempt + 1}...`);
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
  const autoImageUrl = await fetchUnsplashPhoto(parsedArticle.image_keyword || "cozy");
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
      author_image: "https://hygafhwozykocomdbadm.supabase.co/storage/v1/object/public/images/places/rgr95i891c.png",
      is_published: true,
      image_url: autoImageUrl
    }
  ]);

  if (dbError) throw dbError;

  const deployedArticleUrl = `https://detruckavtsi.info/blog/${uniqueSlug}`;
  await triggerGoogleIndexing(deployedArticleUrl);

  const adminChatId = Number(process.env.MY_TELEGRAM_CHAT_ID);
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `🌆 *Вечірній автопостинг виконано!*\n\n🔥 *Свіжий тренд вечора:* \`${currentTrendKeyword}\`\n📌 *Назва статті:* ${parsedArticle.title}\n🔗 [Читати статтю на сайті](${deployedArticleUrl})\n\n⚡ *Google Indexing:* ✅ Надіслано автоматично у фоні.`
    );
  }
}

// ОБРОБНИК ВЕЧІРНІХ GET ЗАПИТІВ
// ОБРОБНИК GET ЗАПИТІВ
export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const secret = searchParams.get("secret");
  
      if (secret !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      // Запускаємо важку генерацію у фоні через макрозадачу Node.js, 
      // не змушуючи Cron-Job.org чекати ні секунди
      setTimeout(() => {
        runEveningAutoGeneration()
          .then(() => console.log("[Background Evening] Вечірня генерація завершена успішно."))
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : "Помилка фонового процесу";
            console.error("[Background Evening] Помилка фонового виконання:", msg);
          });
      }, 0);
  
      // Миттєво віддаємо відповідь за 10-20 мілісекунд
      return NextResponse.json({ success: true, message: "Завдання вечірнього автопостингу прийнято у фоні!" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Помилка крону";
      console.error("🚨 Помилка вечірньої автогенерації:", msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }