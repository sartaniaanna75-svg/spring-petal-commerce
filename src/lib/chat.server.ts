import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type BotProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stems: number;
  color: string;
  category: string;
  composition: string;
  description: string;
  image_url: string;
  images: string[];
};

/** Карточка товара для показа в чате. */
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

export function toChatCards(products: BotProduct[], slugs: string[]): ChatCard[] {
  const seen = new Set<string>();
  const cards: ChatCard[] = [];
  for (const slug of slugs) {
    const product = products.find((item) => item.slug === slug);
    if (!product || seen.has(slug)) continue;
    seen.add(slug);
    cards.push({
      slug: product.slug,
      title: product.title,
      price: product.price,
      stems: product.stems,
      color: product.color,
      category: product.category,
      image_url: product.image_url,
      images: product.images,
    });
  }
  return cards.slice(0, 6);
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function loadBotProducts(): Promise<BotProduct[]> {
  const { data, error } = await publicClient()
    .from("products")
    .select("id, slug, title, description, composition, stems, color, price, category, image_url, images")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    stems: row.stems,
    color: row.color,
    category: row.category,
    composition: row.composition ?? "",
    description: row.description ?? "",
    image_url: row.image_url ?? "",
    images: Array.isArray(row.images) ? (row.images as string[]).filter(Boolean) : [],
  }));
}

const CATEGORY_LABELS: Record<string, string> = {
  single: "штучно",
  bouquet: "букет",
  composition: "композиция",
};

export function catalogToText(products: BotProduct[]): string {
  return products
    .map(
      (p) =>
        `- slug: ${p.slug} | ${p.title} (${CATEGORY_LABELS[p.category] ?? p.category}) — ${p.price} ₽, ${p.stems} шт., цвет: ${p.color}. ${p.composition || p.description || ""}`.trim(),
    )
    .join("\n");
}

/** Сообщения переписки для передачи модели и для оператора. */
export async function loadChatHistory(sessionId: string, limit = 40) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; role: string; content: string; created_at: string }>;
}
