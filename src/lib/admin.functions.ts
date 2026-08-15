import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Product } from "@/lib/shop";

export type AdminOrder = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  address: string;
  delivery_date: string | null;
  delivery_slot: string;
  comment: string;
  admin_note: string;
  total: number;
  kind: string;
  status: string;
  created_at: string;
  items: Array<{ id: string; title: string; price: number; qty: number }>;
};

export type DashboardStats = {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  newCount: number;
  averageCheck: number;
  topProducts: Array<{ title: string; qty: number; revenue: number }>;
  latest: Array<{
    id: string;
    order_no: number;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
  }>;
};

async function isAdmin(context: { supabase: any; userId: string }): Promise<boolean> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  if (!(await isAdmin(context))) throw new Error("Нет доступа");
}

const ORDER_COLUMNS =
  "id, order_no, customer_name, phone, address, delivery_date, delivery_slot, comment, admin_note, total, kind, status, created_at, order_items(id, title, price, qty)";

function mapOrder(row: any): AdminOrder {
  return {
    id: row.id,
    order_no: Number(row.order_no),
    customer_name: row.customer_name,
    phone: row.phone,
    address: row.address,
    delivery_date: row.delivery_date,
    delivery_slot: row.delivery_slot,
    comment: row.comment,
    admin_note: row.admin_note ?? "",
    total: row.total,
    kind: row.kind,
    status: row.status,
    created_at: row.created_at,
    items: (row.order_items ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      qty: item.qty,
    })),
  };
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    return { isAdmin: await isAdmin(context) };
  });

/** Первый зарегистрированный пользователь может стать администратором. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean; claimed: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) return { isAdmin: false, claimed: false };
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (insertError) throw new Error(insertError.message);
    return { isAdmin: true, claimed: true };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(mapOrder);
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const orders = ((data ?? []) as any[]).map(mapOrder);

    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const inRange = (order: AdminOrder, from: number) =>
      new Date(order.created_at).getTime() >= from && order.status !== "cancelled";

    const sum = (list: AdminOrder[]) => list.reduce((acc, order) => acc + order.total, 0);

    const todayList = orders.filter((order) => inRange(order, dayStart.getTime()));
    const weekList = orders.filter((order) => inRange(order, now - 7 * 24 * 3600 * 1000));
    const monthList = orders.filter((order) => inRange(order, now - 30 * 24 * 3600 * 1000));

    const totals = new Map<string, { qty: number; revenue: number }>();
    for (const order of monthList) {
      for (const item of order.items) {
        const current = totals.get(item.title) ?? { qty: 0, revenue: 0 };
        current.qty += item.qty;
        current.revenue += item.qty * item.price;
        totals.set(item.title, current);
      }
    }

    return {
      today: { orders: todayList.length, revenue: sum(todayList) },
      week: { orders: weekList.length, revenue: sum(weekList) },
      month: { orders: monthList.length, revenue: sum(monthList) },
      newCount: orders.filter((order) => order.status === "new").length,
      averageCheck: monthList.length ? Math.round(sum(monthList) / monthList.length) : 0,
      topProducts: [...totals.entries()]
        .map(([title, value]) => ({ title, ...value }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      latest: orders.slice(0, 5).map((order) => ({
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
      })),
    };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "in_progress", "delivered", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ admin_note: data.note })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error: itemsError } = await context.supabase
      .from("order_items")
      .delete()
      .eq("order_id", data.id);
    if (itemsError) throw new Error(itemsError.message);
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PRODUCT_COLUMNS =
  "id, slug, title, description, composition, stems, color, price, image_url, images, published, category, sort_order";

function mapProduct(row: any): Product {
  return {
    ...row,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    sort_order: row.sort_order ?? 0,
  } as Product;
}

export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Product[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(mapProduct);
  });

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  composition: z.string().trim().max(1000).default(""),
  stems: z.number().int().min(1).max(1001),
  color: z.string().trim().min(2).max(40),
  price: z.number().int().min(0).max(1000000),
  image_url: z.string().trim().max(600).default(""),
  images: z.array(z.string().trim().max(600)).max(5).default([]),
  published: z.boolean().default(true),
  category: z.enum(["single", "composition", "bouquet"]).default("bouquet"),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...fields } = data;
    const payload = { ...fields, image_url: fields.images[0] ?? fields.image_url };
    if (id) {
      const { error } = await context.supabase.from("products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

export const setProductPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("products")
      .update({ published: data.published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const source = mapProduct(row) as any;
    delete source.id;
    const suffix = Math.random().toString(36).slice(2, 6);
    const { data: inserted, error: insertError } = await context.supabase
      .from("products")
      .insert({
        ...source,
        slug: `${source.slug}-copy-${suffix}`.slice(0, 120),
        title: `${source.title} (копия)`.slice(0, 120),
        published: false,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    return { ok: true, id: inserted.id as string };
  });

export const reorderProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0).max(9999) })).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const item of data.items) {
      const { error } = await context.supabase
        .from("products")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
