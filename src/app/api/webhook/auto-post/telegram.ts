// telegram.ts

const token = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Надсилає звичайне текстове повідомлення в Telegram чат.
 */
export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!token || !chatId) return;
  
  try {
    console.log(`[Telegram] Надсилання сповіщення для чату ${chatId}...`);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    
    if (!res.ok) {
      console.error(`[Telegram] ❌ Помилка API: ${res.status} ${res.statusText}`);
      return;
    }
    
    console.log("[Telegram] ✅ Сповіщення успішно надіслано.");
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відправки:", err);
  }
}

/**
 * Надсилає повідомлення з Inline-кнопками (reply_markup).
 */
export async function sendTelegramWithButtons(
  chatId: number, 
  text: string, 
  replyMarkup: object
): Promise<void> {
  if (!token || !chatId) return;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text, 
        parse_mode: "Markdown",
        reply_markup: replyMarkup
      }),
    });
    
    if (!res.ok) {
      console.error(`[Telegram] ❌ Помилка API при відправці кнопок: ${res.status}`);
    }
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відправки кнопок:", err);
  }
}

/**
 * Знімає завантаження (loading spinner) з кнопки після кліку користувача.
 */
export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  if (!token) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId })
    });
  } catch (err) {
    console.error("[Telegram] ❌ Помилка відповіді на callback_query:", err);
  }
}

/**
 * Оновлює текст існуючого повідомлення (використовується для зміни кнопок на статусний текст).
 */
export async function editTelegramMessageText(
  chatId: number, 
  messageId: number, 
  text: string
): Promise<void> {
  if (!token) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text
      })
    });
  } catch (err) {
    console.error("[Telegram] ❌ Помилка редагування повідомлення:", err);
  }
}