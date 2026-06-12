import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { JWT } from "google-auth-library"; // 👈 Переходимо на легку бібліотеку авторизації

export const runtime = "nodejs"; // 👈 Критично важливо! Змушує Vercel використовувати повне серверне залізо Node.js

// Інтерфейс для безпечної типізації помилок від API Google
interface GoogleApiErrorResponse {
  response?: {
    data?: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-webhook-secret");
    if (authHeader !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Отримуємо дані про пост від Supabase Webhook
    const body = await request.json();
    const { record, type } = body; // record містить нові дані рядка, type — 'INSERT', 'UPDATE' або 'DELETE'

    console.log(`[Webhook] Отримано подію ${type} від Supabase для блогу.`);

    // 1. Скидаємо кеш у Next.js (працює для будь-яких дій)
    revalidatePath("/blog", "page");
    revalidatePath("/blog/[slug]", "page");

    // 2. Якщо пост створено АБО оновлено, стукаємо в Google Indexing API
    const shouldIndex = (type === "INSERT" || type === "UPDATE") && record && record.slug;

    if (shouldIndex) {
      const targetUrl = `https://detruckavtsi.info/blog/${record.slug}`;
      console.log(`[Google API] Початок автоматичної індексації для: ${targetUrl}`);

      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        throw new Error("Змінна GOOGLE_SERVICE_ACCOUNT_JSON відсутня в Environment Variables");
      }

      // Парсимо повний сервісний акаунт прямо з однієї JSON-змінної
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

      // Ініціалізуємо JWT клієнт
      const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/indexing"],
      });

      console.log(`[Google API] Надсилання прямого REST-запиту в Google Indexing API...`);
      
      // Робимо прямий, чистий REST-запит, який обходить баги збірки Webpack
      await auth.request({
        url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
        method: "POST",
        data: {
          url: targetUrl,
          type: "URL_UPDATED",
        },
      });
      
      console.log(`[Google API] ✅ Запит на індексацію ${targetUrl} успішно надіслано!`);
    }

    return NextResponse.json({ 
      revalidated: true, 
      googleIndexed: shouldIndex 
    });
  } catch (err: unknown) {
    console.error("🚨 Критична помилка у Webhook роуті:");

    let errorMessage = "An unknown error occurred";
    
    if (err instanceof Error) {
      errorMessage = err.message;
      
      // Безпечно виводимо лог детальної помилки від Google API, якщо вона є
      const apiError = err as GoogleApiErrorResponse;
      if (apiError.response?.data) {
        console.error(
          "[Google API] Деталі помилки від Google:", 
          JSON.stringify(apiError.response.data)
        );
      }
    }

    return NextResponse.json(
      { message: "Error", error: errorMessage }, 
      { status: 500 }
    );
  }
}