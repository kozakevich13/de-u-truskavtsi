import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { google } from "googleapis";

// Налаштовуємо клієнт Google за допомогою даних із JSON-ключа
// Налаштовуємо клієнт Google через об'єкт конфігурації
const jwtClient = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Фікс для переносів рядків у Vercel
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-webhook-secret");
    if (authHeader !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Отримуємо дані про пост від Supabase Webhook
    const body = await request.json();
    const { record, type } = body; // record містить нові дані рядка, type — 'INSERT', 'UPDATE' або 'DELETE'

    // 1. Скидаємо кеш у Next.js (це працює для будь-яких дій: INSERT, UPDATE, DELETE)
    revalidatePath("/blog", "page");
    revalidatePath("/blog/[slug]", "page");

    // 2. Якщо пост створено АБО оновлено, стукаємо в Google Indexing API
    const shouldIndex = (type === "INSERT" || type === "UPDATE") && record && record.slug;

    if (shouldIndex) {
      // Вказуємо твій точний домен
      const targetUrl = `https://detruckavtsi.info/blog/${record.slug}`;

      // Авторизація в Google
      await jwtClient.authorize();

      // Відправка запиту на індексацію
      await google.indexing({ version: "v3", auth: jwtClient }).urlNotifications.publish({
        requestBody: {
          url: targetUrl,
          type: "URL_UPDATED", // Підходить як для нових, так і для змінених сторінок
        },
      });
      
      console.log(`[Google API] Запит на індексацію ${targetUrl} успішно надіслано!`);
    }

    return NextResponse.json({ 
      revalidated: true, 
      googleIndexed: shouldIndex 
    });
} catch (err: unknown) {
    console.error("Помилка:", err);

    // Перевіряємо, чи є err екземпляром класу Error
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";

    return NextResponse.json(
      { message: "Error", error: errorMessage }, 
      { status: 500 }
    );
  }
}