const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export function telegramWebhookSecret(apiKey: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(`telegram-webhook:${apiKey}`))
    .then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    });
}

/** Отправляет сообщение в конкретный чат Telegram через шлюз коннектора. */
export async function sendTelegramMessage(chatId: number | string, text: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  if (!lovableKey || !telegramKey) throw new Error("Telegram не настроен");

  const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram gateway failed [${response.status}]: ${body}`);
    throw new Error(`Telegram error [${response.status}]: ${body}`);
  }
  const json = (await response.json()) as { ok?: boolean; error_code?: number; description?: string };
  if (json.ok === false) {
    console.error(`Telegram API error: ${json.description ?? "unknown"}`);
    throw new Error(json.description ?? "Telegram error");
  }
  return json;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type OrderNotification = {
  orderNo: number;
  total: number;
  kind: string;
  customerName: string;
  phone: string;
  address?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  comment?: string;
  source?: string;
  items?: Array<{ title: string; qty: number; price: number }>;
};

/** Рассылает уведомление о новой заявке всем подписанным админам. Ошибки не ломают заказ. */
export async function notifyNewOrder(order: OrderNotification) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("telegram_subscribers")
      .select("chat_id")
      .eq("active", true);
    const chats = (data ?? []) as Array<{ chat_id: number }>;
    if (chats.length === 0) return;

    const lines = [
      `🌷 <b>Новая ${order.kind === "callback" ? "заявка на звонок" : "заявка"} №${order.orderNo}</b>`,
      `👤 ${escapeHtml(order.customerName)}`,
      `📞 ${escapeHtml(order.phone)}`,
    ];
    if (order.items?.length) {
      lines.push("🧺 Состав:");
      for (const item of order.items) {
        lines.push(`• ${escapeHtml(item.title)} — ${item.qty} шт × ${item.price} ₽`);
      }
    }
    if (order.address) lines.push(`📍 ${escapeHtml(order.address)}`);
    if (order.deliveryDate || order.deliverySlot) {
      lines.push(`🕒 ${escapeHtml([order.deliveryDate, order.deliverySlot].filter(Boolean).join(", "))}`);
    }
    if (order.comment) lines.push(`💬 ${escapeHtml(order.comment.slice(0, 600))}`);
    lines.push(`💰 Итого: <b>${order.total.toLocaleString("ru-RU")} ₽</b>`);
    if (order.source) lines.push(`Источник: ${escapeHtml(order.source)}`);

    const text = lines.join("\n");
    await Promise.allSettled(chats.map((chat) => sendTelegramMessage(chat.chat_id, text)));
  } catch (error) {
    console.error("telegram notify failed", error);
  }
}
