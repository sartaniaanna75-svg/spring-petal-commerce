import { createFileRoute } from "@tanstack/react-router";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const telegramKey = process.env["TELEGRAM_API_KEY"];
        if (!telegramKey) return new Response("Not configured", { status: 500 });

        const { telegramWebhookSecret, sendTelegramMessage } = await import("@/lib/telegram.server");
        const expected = await telegramWebhookSecret(telegramKey);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        const update = (await request.json()) as any;
        const message = update?.message ?? update?.edited_message;
        const chat = message?.chat;
        if (!chat?.id) return Response.json({ ok: true, ignored: true });

        const text: string = (message.text ?? "").trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (text.startsWith("/start")) {
          await supabaseAdmin.from("telegram_subscribers").upsert(
            {
              chat_id: chat.id,
              title: [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || "",
              username: chat.username ?? "",
              active: true,
            },
            { onConflict: "chat_id" },
          );
          await sendTelegramMessage(
            chat.id,
            "🌷 Готово! Буду присылать сюда новые заявки с сайта «Тюльпаны Москва».\n/stop — отключить уведомления.",
          );
          return Response.json({ ok: true });
        }

        if (text.startsWith("/stop")) {
          await supabaseAdmin
            .from("telegram_subscribers")
            .update({ active: false })
            .eq("chat_id", chat.id);
          await sendTelegramMessage(chat.id, "Уведомления отключены. /start — включить снова.");
          return Response.json({ ok: true });
        }

        await sendTelegramMessage(
          chat.id,
          "Я бот уведомлений магазина. /start — получать заявки, /stop — отключить.",
        );
        return Response.json({ ok: true });
      },
    },
  },
});
