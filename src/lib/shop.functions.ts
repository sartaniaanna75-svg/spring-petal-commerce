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

    let total = 0;
    let rows: Array<{ id: string; title: string; price: number; qty: number }> = [];

    if (data.items.length > 0) {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, title, price")
        .in(
          "id",
          data.items.map((item) => item.productId),
        )
        .eq("published", true);
      if (error) throw new Error(error.message);
      rows = data.items.flatMap((item) => {
        const product = (products ?? []).find((entry) => entry.id === item.productId);
        if (!product) return [];
        return [{ id: product.id, title: product.title, price: product.price, qty: item.qty }];
      });
      if (rows.length === 0) throw new Error("Товары не найдены");
      total = rows.reduce((sum, row) => sum + row.price * row.qty, 0);
      if (total < 7000) total += 490;
    }

    const { data: inserted, error: orderError } = await supabase
      .from("orders")
      .insert({
        kind: data.kind,
        customer_name: data.customer_name,
        phone: data.phone,
        address: data.address,
        delivery_date: data.delivery_date ? data.delivery_date : null,
        delivery_slot: data.delivery_slot,
        comment: data.comment,
        total,
      })
      .select("id, order_no")
      .single();
    if (orderError || !inserted) throw new Error(orderError?.message ?? "Не удалось создать заявку");

    if (rows.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(
        rows.map((row) => ({
          order_id: inserted.id,
          product_id: row.id,
          title: row.title,
          price: row.price,
          qty: row.qty,
        })),
      );
      if (itemsError) throw new Error(itemsError.message);
    }

    return { orderNo: Number(inserted.order_no), total };
  });
