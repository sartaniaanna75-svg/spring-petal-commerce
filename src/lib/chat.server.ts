import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function loadCatalogForBot(): Promise<string> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient<Database>(url, key, {
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

  const { data, error } = await client
    .from("products")
    .select("title, description, composition, stems, color, price, category, slug")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);

  const categories: Record<string, string> = {
    single: "штучно",
    bouquet: "букет",
    composition: "композиция",
  };

  return ((data ?? []) as any[])
    .map(
      (p) =>
        `- ${p.title} (${categories[p.category] ?? p.category}) — ${p.price} ₽, ${p.stems} шт., цвет: ${p.color}. ${p.composition || p.description || ""}`.trim(),
    )
    .join("\n");
}
