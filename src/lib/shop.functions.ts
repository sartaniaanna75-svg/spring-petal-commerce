import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Product } from "@/lib/shop";

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

const PRODUCT_COLUMNS = "id, slug, title, description, composition, stems, color, price, image_url, published";

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { data, error } = await publicClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("published", true)
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<Product | null> => {
    const { data: rows, error } = await publicClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("published", true)
      .limit(1);
    if (error) throw new Error(error.message);
    return ((rows ?? [])[0] as Product | undefined) ?? null;
  });

const orderSchema = z.object({
  kind: z.enum(["order", "callback"]).default("order"),
  customer_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(300).default(""),
  delivery_date: z.string().trim().max(20).default(""),
  delivery_slot: z.string().trim().max(60).default(""),
  comment: z.string().trim().max(1000).default(""),
  items: z
    .array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(50) }))
    .max(30)
    .default([]),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }): Promise<{ orderNo: number; total: number }> => {
    const supabase = publicClient();

    const { data: result, error } = await supabase.rpc("place_order", {
      _kind: data.kind,
      _customer_name: data.customer_name,
      _phone: data.phone,
      _address: data.address,
      _delivery_date: data.delivery_date,
      _delivery_slot: data.delivery_slot,
      _comment: data.comment,
      _items: data.items.map((item) => ({ product_id: item.productId, qty: item.qty })),
    });

    if (error) throw new Error(error.message);
    const row = (result ?? [])[0];
    if (!row) throw new Error("Не удалось создать заявку");
    return { orderNo: Number(row.order_no), total: Number(row.total) };
  });

