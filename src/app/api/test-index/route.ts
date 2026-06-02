import { NextResponse } from "next/server";
import { google } from "googleapis";
interface GoogleApiError {
    message?: string;
    response?: {
      data?: Record<string, unknown>;
    };
  }
export async function GET() {
  try {
    // 1. Авторизація через твої нові ключі з Vercel Env
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/siteverification"]
      });

    const verification = google.siteVerification({ version: "v1", auth });

    // 2. Команда сервісному акаунту примусово підтвердити права на домен
    // 2. Команда сервісному акаунту примусово підтвердити права на домен
    // 2. Команда сервісному акаунту примусово підтвердити права на домен
    const response = await verification.webResource.insert({
        verificationMethod: "FILE", // Змінили на FILE — це змусить Google просто перевірити родинні зв'язки з твоїм головним акаунтом
        requestBody: {
          site: {
            identifier: "https://detruckavtsi.info/", // Вказуємо повну адресу сайту
            type: "SITE" // Тип ресурсу для цього методу має бути SITE
          }
        }
      });

    return NextResponse.json({ 
      success: true, 
      message: "Сервісний акаунт успішно підтвердив свої права на сайт в базі Google!",
      data: response.data 
    });

} catch (error: unknown) {
    console.error("Помилка верифікації:", error);
    
    // Кастимо до нашого безпечного інтерфейсу
    const err = error as GoogleApiError;

    return NextResponse.json({ 
      success: false, 
      error: err.message || "Невідома помилка",
      details: err.response?.data || "Немає деталей"
    }, { status: 500 });
  }
}