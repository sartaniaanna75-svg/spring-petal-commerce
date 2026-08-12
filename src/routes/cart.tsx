import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useCart } from "@/lib/cart";
import { deliveryCost, formatPrice, SLOTS } from "@/lib/shop";
import { submitOrder } from "@/lib/shop.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина и оформление заказа — Тюльпаны Москва" },
      { name: "description", content: "Оформите доставку тюльпанов по Москве: адрес, дата и интервал." },
      { property: "og:title", content: "Корзина — Тюльпаны Москва" },
      { property: "og:description", content: "Оформление доставки тюльпанов по Москве." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

const WRAPS = [
  "Крафт-бумага, льняная лента",
  "Матовая плёнка, пастель",
  "Прозрачная плёнка",
  "Фетр, нежно-розовый",
  "Без упаковки, только лента",
] as const;

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Укажите имя").max(100),
  phone: z.string().trim().min(6, "Укажите телефон").max(30),
  address: z.string().trim().min(5, "Укажите адрес доставки").max(300),
  delivery_date: z.string().trim().max(20),
  delivery_slot: z.string().trim().max(60),
  comment: z.string().trim().max(1400),
});

function CartPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const send = useServerFn(submitOrder);
  const [done, setDone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    delivery_date: "",
    delivery_slot: SLOTS[0]!,
    comment: "",
  });
  const [wrap, setWrap] = useState<string>(WRAPS[0]!);
  const [wrapNote, setWrapNote] = useState("");

  const shipping = deliveryCost(subtotal);
  const total = subtotal + shipping;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const extras = [
      `Упаковка: ${wrap}`,
      wrapNote.trim() ? `Пожелания к оформлению: ${wrapNote.trim()}` : "",
    ].filter(Boolean).join("; ");
    const parsed = formSchema.safeParse({
      ...form,
      comment: [form.comment.trim(), extras].filter(Boolean).join(". "),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    if (!agree) {
      toast.error("Нужно согласие с офертой и политикой");
      return;
    }
    setLoading(true);
    try {
      const result = await send({
        data: {
          kind: "order",
          ...parsed.data,
          items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
        },
      });
      clear();
      setDone(result.orderNo);
    } catch {
      toast.error("Не удалось оформить заказ. Позвоните нам, пожалуйста.");
    } finally {
      setLoading(false);
    }
  }

  if (done !== null) {
    return (
      <div className="mx-auto max-w-xl px-5 py-28 text-center">
        <h1 className="font-display text-5xl">Заявка №{done} принята</h1>
        <p className="mt-4 text-muted-foreground">
          Флорист перезвонит в течение 15 минут, чтобы подтвердить время доставки.
        </p>
        <Link
          to="/catalog"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm text-primary-foreground"
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-28 text-center">
        <h1 className="font-display text-5xl">В корзине пусто</h1>
        <p className="mt-4 text-muted-foreground">Самое время выбрать охапку тюльпанов.</p>
        <Link
          to="/catalog"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm text-primary-foreground"
        >
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="font-display text-5xl md:text-6xl">Корзина</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-4 py-5">
                <div className="flex-1">
                  <Link
                    to="/catalog/$slug"
                    params={{ slug: item.slug }}
                    className="font-display text-2xl"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{formatPrice(item.price)} за букет</p>
                </div>
                <div className="flex h-10 items-center rounded-full border border-foreground/15">
                  <button
                    type="button"
                    onClick={() => setQty(item.productId, item.qty - 1)}
                    className="h-10 w-10"
                    aria-label="Меньше"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.productId, item.qty + 1)}
                    className="h-10 w-10"
                    aria-label="Больше"
                  >
                    +
                  </button>
                </div>
                <p className="w-24 text-right font-display text-xl">
                  {formatPrice(item.price * item.qty)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  className="text-sm text-muted-foreground hover:text-destructive"
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Букеты</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доставка по Москве</span>
              <span>{shipping === 0 ? "бесплатно" : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-display text-2xl">
              <span>Итого</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-[2rem] bg-cream p-7">
          <h2 className="font-display text-3xl">Куда везём</h2>
          <div className="mt-5 grid gap-3">
            <Field
              label="Имя"
              value={form.customer_name}
              onChange={(value) => setForm({ ...form, customer_name: value })}
            />
            <Field
              label="Телефон"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Field
              label="Адрес в Москве"
              value={form.address}
              onChange={(value) => setForm({ ...form, address: value })}
            />
            <label className="text-sm">
              <span className="text-muted-foreground">Дата доставки</span>
              <input
                type="date"
                value={form.delivery_date}
                onChange={(event) => setForm({ ...form, delivery_date: event.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Интервал</span>
              <select
                value={form.delivery_slot}
                onChange={(event) => setForm({ ...form, delivery_slot: event.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              >
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Комментарий, открытка</span>
              <textarea
                value={form.comment}
                maxLength={1000}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">Упаковка</span>
              <select
                value={wrap}
                onChange={(event) => setWrap(event.target.value)}
                className="mt-1 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              >
                {WRAPS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Пожелания к оформлению</span>
              <textarea
                value={wrapNote}
                maxLength={300}
                onChange={(event) => setWrapNote(event.target.value)}
                rows={2}
                placeholder="Цвет ленты, без упаковки, сюрприз-доставка, позвонить заранее…"
                className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Согласен с{" "}
                <Link to="/offer" className="underline">
                  офертой
                </Link>{" "}
                и{" "}
                <Link to="/privacy" className="underline">
                  политикой конфиденциальности
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-full bg-primary text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Отправляем…" : `Оформить за ${formatPrice(total)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        maxLength={300}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
