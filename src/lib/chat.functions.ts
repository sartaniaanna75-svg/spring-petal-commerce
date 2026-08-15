import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ChatCard = {
  slug: string;
  title: string;
  price: number;
  stems: number;
  color: string;
  category: string;
  image_url: string;
  images: string[];
};

export type ChatTurn = {
  role: "user" | "assistant" | "operator";
  content: string;
  cards?: ChatCard[];
};

const CARDS_RE = /\[\[CARDS\]\]\s*(\{[\s\S]*?\})/;

/** Отделяет служебный блок с карточками от видимого текста. */
export function splitCards(content: string): { text: string; slugs: string[] } {
  const match = content.match(CARDS_RE);
  let slugs: string[] = [];
  if (match) {
    try {
      const payload = JSON.parse(match[1]!) as { slugs?: unknown };
      if (Array.isArray(payload.slugs)) {
        slugs = payload.slugs.filter((item): item is string => typeof item === "string").slice(0, 6);
      }
    } catch {
      /* ignore */
    }
  }
  return { text: content.replace(CARDS_RE, "").trim(), slugs };
}

const startSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
});

const askSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

/** Создаёт чат в админке и возвращает его идентификатор. */
export const startChatSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }): Promise<{ sessionId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sessionId, error } = await supabaseAdmin.rpc("chat_start", {
      _name: data.name,
      _phone: data.phone,
    });
    if (error) throw new Error(error.message);
    return { sessionId: sessionId as unknown as string };
  });

/** Ответ ИИ-флориста: считает сумму, оформляет заявку, зовёт оператора. */
export const askFlowerBot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ reply: string; orderNo?: number; total?: number; operator?: boolean }> => {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) throw new Error("AI не настроен");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { loadBotProducts, catalogToText, loadChatHistory } = await import("@/lib/chat.server");

      const { data: sessionRows, error: sessionError } = await supabaseAdmin
        .from("chat_sessions")
        .select("id, customer_name, phone, needs_operator")
        .eq("id", data.sessionId)
        .limit(1);
      if (sessionError) throw new Error(sessionError.message);
      const session = (sessionRows ?? [])[0];
      if (!session) throw new Error("Чат не найден");

      await supabaseAdmin.rpc("chat_append", {
        _session_id: data.sessionId,
        _role: "user",
        _content: data.message,
      });

      const products = await loadBotProducts();
      const history = await loadChatHistory(data.sessionId, 40);

      const system = [
        "Ты — Тюльпа, консультант интернет-магазина «Тюльпаны Москва».",
        `Клиента зовут ${session.customer_name}, телефон ${session.phone}.`,
        "Общайся по-русски, тепло и коротко (до 6 предложений).",
        "Помогай подобрать готовый букет или собрать свой ТОЛЬКО из позиций каталога ниже.",
        "Всегда считай итог: позиции с ценой и количеством, сумма букета, доставка (490 ₽, бесплатно от 7000 ₽), итог к оплате.",
        "Перед оформлением уточни адрес доставки в Москве и желаемую дату/время.",
        "",
        "ОФОРМЛЕНИЕ ЗАКАЗА: когда клиент подтвердил состав и назвал адрес — сначала напиши обычный текст с подтверждением,",
        "затем ПОСЛЕДНЕЙ строкой добавь служебный блок ровно в формате:",
        '[[ORDER]]{"items":[{"slug":"tulip-slug","qty":2}],"address":"...","date":"YYYY-MM-DD","slot":"...","comment":"..."}',
        "Служебный блок пиши один раз и только после явного согласия клиента.",
        "",
        "ЖИВОЙ ОПЕРАТОР: если вопрос вне твоей компетенции, клиент просит человека, нужна нестандартная работа,",
        "или ты не можешь помочь — напиши, что подключаешь флориста, и последней строкой добавь ровно:",
        '[[OPERATOR]]{"reason":"кратко причина"}',
        "",
        "КАТАЛОГ:",
        catalogToText(products),
      ].join("\n");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: system },
            ...history.map((item) => ({
              role: item.role === "user" ? "user" : "assistant",
              content: item.role === "operator" ? `Флорист-оператор: ${item.content}` : item.content,
            })),
          ],
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
      let reply = json.choices?.[0]?.message?.content?.trim() ?? "";

      let orderNo: number | undefined;
      let total: number | undefined;
      let operator = false;

      const orderMatch = reply.match(/\[\[ORDER\]\]\s*(\{[\s\S]*\})/);
      const operatorMatch = reply.match(/\[\[OPERATOR\]\]\s*(\{[\s\S]*?\})?/);
      reply = reply
        .replace(/\[\[ORDER\]\][\s\S]*$/, "")
        .replace(/\[\[OPERATOR\]\][\s\S]*$/, "")
        .trim();

      if (orderMatch) {
        try {
          const payload = JSON.parse(orderMatch[1]!) as {
            items?: Array<{ slug?: string; qty?: number }>;
            address?: string;
            date?: string;
            slot?: string;
            comment?: string;
          };
          const items = (payload.items ?? [])
            .map((item) => {
              const product = products.find((candidate) => candidate.slug === item.slug);
              if (!product) return null;
              return { product_id: product.id, qty: Math.min(Math.max(Number(item.qty) || 1, 1), 50) };
            })
            .filter(Boolean) as Array<{ product_id: string; qty: number }>;

          if (items.length > 0) {
            const { data: result, error } = await supabaseAdmin.rpc("place_order", {
              _kind: "order",
              _customer_name: session.customer_name,
              _phone: session.phone,
              _address: (payload.address ?? "").slice(0, 300),
              _delivery_date: /^\d{4}-\d{2}-\d{2}$/.test(payload.date ?? "") ? payload.date! : "",
              _delivery_slot: (payload.slot ?? "").slice(0, 60),
              _comment: `Заказ оформлен через чат-бота. ${(payload.comment ?? "").slice(0, 800)}`.trim(),
              _items: items,
            });
            if (error) throw new Error(error.message);
            const row = ((result ?? []) as any[])[0];
            if (row) {
              orderNo = Number(row.order_no);
              total = Number(row.total);
              await supabaseAdmin.rpc("chat_set_order", {
                _session_id: data.sessionId,
                _order_no: orderNo,
              });
              const { notifyNewOrder } = await import("@/lib/telegram.server");
              await notifyNewOrder({
                orderNo,
                total,
                kind: "order",
                customerName: session.customer_name,
                phone: session.phone,
                address: payload.address ?? "",
                deliveryDate: payload.date ?? "",
                deliverySlot: payload.slot ?? "",
                comment: payload.comment ?? "",
                source: "Чат-бот на сайте",
                items: items.map((item) => {
                  const product = products.find((candidate) => candidate.id === item.product_id)!;
                  return { title: product.title, qty: item.qty, price: product.price };
                }),
              });
              reply = `${reply}\n\nЗаявка №${orderNo} оформлена, к оплате ${total.toLocaleString("ru-RU")} ₽. Флорист перезвонит на ${session.phone} для подтверждения.`.trim();
            }
          }
        } catch (error) {
          console.error("chat order failed", error);
          operator = true;
        }
      }

      if (operatorMatch || operator) {
        operator = true;
        await supabaseAdmin.rpc("chat_escalate", { _session_id: data.sessionId });
        if (!reply) reply = "Подключаю живого флориста — он ответит здесь в ближайшее время.";
        else reply = `${reply}\n\nПодключаю живого флориста — он ответит прямо в этом чате.`;
      }

      if (!reply) reply = "Извините, не удалось ответить. Повторите вопрос, пожалуйста.";

      await supabaseAdmin.rpc("chat_append", {
        _session_id: data.sessionId,
        _role: "assistant",
        _content: reply,
      });

      return { reply, ...(orderNo !== undefined && total !== undefined ? { orderNo, total } : {}), operator };
    },
  );

/** Клиент подтягивает ответы живого оператора. */
export const pollChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ messages: ChatTurn[]; needsOperator: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadChatHistory } = await import("@/lib/chat.server");
    const [{ data: rows }, history] = await Promise.all([
      supabaseAdmin.from("chat_sessions").select("needs_operator").eq("id", data.sessionId).limit(1),
      loadChatHistory(data.sessionId, 60),
    ]);
    return {
      messages: history.map((item) => ({ role: item.role as ChatTurn["role"], content: item.content })),
      needsOperator: Boolean((rows ?? [])[0]?.needs_operator),
    };
  });

/** Клиент сам может позвать оператора кнопкой. */
export const requestOperator = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("chat_escalate", { _session_id: data.sessionId });
    await supabaseAdmin.rpc("chat_append", {
      _session_id: data.sessionId,
      _role: "assistant",
      _content: "Клиент попросил живого флориста — тикет передан оператору.",
    });
    return { ok: true };
  });
