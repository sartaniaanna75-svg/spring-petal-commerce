import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(30),
});

export const askFlowerBot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI не настроен");

    const { loadCatalogForBot } = await import("@/lib/chat.server");
    const catalog = await loadCatalogForBot();

    const system = [
      "Ты — Тюльпа, дружелюбный консультант интернет-магазина «Тюльпаны Москва».",
      "Общайся по-русски, тепло, коротко (до 6 предложений), обращайся к клиенту по имени: " + data.name + ".",
      "Помогай подобрать готовый букет или собрать свой из позиций каталога.",
      "Используй ТОЛЬКО товары из каталога ниже, не выдумывай позиции и цены.",
      "Всегда считай итоговую сумму: перечисли позиции с ценой и количеством, выведи сумму букета,",
      "затем доставку (490 ₽, бесплатно от 7000 ₽) и итог к оплате.",
      "В конце предложи оформить заказ в корзине или что менеджер перезвонит на " + data.phone + ".",
      "",
      "КАТАЛОГ:",
      catalog,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`AI gateway failed [${response.status}]: ${body}`);
      if (response.status === 429) throw new Error("Слишком много сообщений, попробуйте через минуту");
      if (response.status === 402) throw new Error("Лимит ИИ исчерпан");
      throw new Error("Помощник временно недоступен");
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim();
    return { reply: reply || "Извините, не удалось ответить. Повторите вопрос, пожалуйста." };
  });
