import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // 1. Отримуємо секретний токен з заголовків для безпеки
    const authHeader = request.headers.get("x-webhook-secret");
    
    if (authHeader !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Скидаємо кеш для сторінки блогу
    // Оскільки у вас динамічні блоги, скидаємо і головну сторінку, і сторінки самих статей
    revalidatePath("/blog", "page");
    revalidatePath("/blog/[slug]", "page"); 

    console.log("[Webhook] Кеш блогу успішно скинуто!");
    
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: "Error revalidating", error: err }, { status: 500 });
  }
}