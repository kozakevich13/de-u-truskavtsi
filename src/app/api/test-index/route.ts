import { NextResponse } from "next/server";
import { google } from "googleapis";

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
    const response = await verification.webResource.insert({
      verificationMethod: "DNS_TXT", // Використовуємо метод, яким ти вже підтвердив домен
      requestBody: {
        site: {
          identifier: "sc-domain:detruckavtsi.info", // Твій домен у Search Console
          type: "INET_DOMAIN"
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Сервісний акаунт успішно підтвердив свої права на сайт в базі Google!",
      data: response.data 
    });

  } catch (error: any) {
    console.error("Помилка верифікації:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || "Немає деталей"
    }, { status: 500 });
  }
}