import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { listProducts, submitOrder } from "@/lib/shop.functions";
import { heroImage, type Product } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

const productsQuery = queryOptions({
  queryKey: ["products", "published"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Тюльпаны с доставкой по Москве за 2 часа" },
      {
        name: "description",
        content:
          "Свежие тюльпаны из собственной срезки: букеты от 15 до 101 стебля, доставка по Москве за 2 часа, бесплатно от 7000 ₽.",
      },
      { property: "og:title", content: "Тюльпаны с доставкой по Москве за 2 часа" },
      {
        property: "og:description",
        content: "Букеты тюльпанов от 15 до 101 стебля. Срезаем утром — привозим сегодня.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQuery);
  },
  component: HomePage,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Ничего не найдено</div>,
});

function HomePage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const featured = products.slice(0, 3);

  return (
    <div>
      <Hero />
      <Featured products={featured} />
      <Steps />
      <Colors products={products} />
      <Reviews />
      <QuickForm />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_1fr] md:py-24">
        <div className="rise-in">
          <p className="text-sm tracking-[0.25em] text-muted-foreground uppercase">Москва · с 2016 года</p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] md:text-7xl">
            Свежие тюльпаны
            <br />
            <span className="text-primary italic">с доставкой сегодня</span>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">
            Срезаем на рассвете, собираем вручную и привозим в течение двух часов. Букет доезжает таким же
            живым, каким его собрали.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/catalog"
              className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Выбрать букет
            </Link>
            <span className="text-sm text-muted-foreground">Бесплатная доставка от 7000 ₽</span>
          </div>
        </div>

        <div className="rise-in overflow-hidden rounded-[2.5rem] petal-edge">
          <img
            src={heroImage}
            alt="Букет розовых тюльпанов в крафтовой упаковке"
            width={1600}
            height={1200}
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Featured({ products }: { products: Product[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="flex items-end justify-between gap-6">
        <h2 className="font-display text-4xl md:text-5xl">Букеты недели</h2>
        <Link to="/catalog" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          весь каталог
        </Link>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        {products.map((product, index) => (
          <div key={product.id} className={index === 1 ? "md:-mt-10" : index === 2 ? "md:mt-8" : ""}>
            <ProductCard product={product} tall={index === 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Срез на рассвете", text: "Плантация под Москвой: цветы попадают в холод через 20 минут." },
  { title: "Ручная сборка", text: "Флорист собирает букет под ваш повод и упаковывает в тот же час." },
  { title: "Доставка за 2 часа", text: "Курьер везёт букет в термобоксе и отдаёт получателю лично." },
];

function Steps() {
  return (
    <section id="about" className="bg-cream py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="font-display text-4xl md:text-5xl">Как это работает</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="border-t border-foreground/15 pt-5">
              <p className="font-display text-3xl text-primary">0{index + 1}</p>
              <p className="mt-3 font-display text-2xl">{step.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Colors({ products }: { products: Product[] }) {
  const colors = Array.from(new Set(products.map((product) => product.color)));
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="font-display text-4xl md:text-5xl">Сорта и оттенки</h2>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Пудровые, белоснежные, махровые пионовидные и редкие сиреневые — выберите настроение.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {colors.map((color) => (
          <Link
            key={color}
            to="/catalog"
            search={{ color }}
            className="rounded-full border border-foreground/15 px-6 py-3 text-sm transition-colors hover:border-primary hover:text-primary"
          >
            {color}
          </Link>
        ))}
      </div>
    </section>
  );
}

const REVIEWS = [
  { name: "Марина", text: "Заказала в 11 утра — в час дня мама уже фотографировала букет. Живые, плотные." },
  { name: "Илья", text: "101 тюльпан. Жена сказала, что это лучший день рождения за десять лет." },
  { name: "Катя", text: "Пионовидные держались девять дней. Упаковка нежная, без пластика." },
];

function Reviews() {
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="font-display text-4xl md:text-5xl">Что говорят</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <blockquote key={review.name} className="rounded-3xl bg-card p-7">
              <p className="font-display text-xl leading-snug italic">«{review.text}»</p>
              <footer className="mt-4 text-sm text-muted-foreground">{review.name}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickForm() {
  const send = useServerFn(submitOrder);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 6) {
      toast.error("Укажите имя и телефон");
      return;
    }
    setLoading(true);
    try {
      await send({ data: { kind: "callback", customer_name: name, phone, items: [] } });
      setSent(true);
      toast.success("Перезвоним в течение 15 минут");
    } catch {
      toast.error("Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid gap-10 rounded-[2.5rem] bg-primary/10 px-6 py-12 md:grid-cols-2 md:px-14">
        <div>
          <h2 className="font-display text-4xl md:text-5xl">Не знаете, что выбрать?</h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Оставьте телефон — флорист перезвонит, уточнит повод и соберёт букет под него.
          </p>
        </div>
        {sent ? (
          <p className="self-center font-display text-2xl">Спасибо! Скоро позвоним.</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3 self-center">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Как вас зовут"
              className="h-12 rounded-full border border-border bg-card px-5 text-sm outline-none focus:border-primary"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
              inputMode="tel"
              placeholder="Телефон"
              className="h-12 rounded-full border border-border bg-card px-5 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-full bg-primary text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Отправляем…" : "Жду звонка"}
            </button>
            <p className="text-xs text-muted-foreground">
              Нажимая кнопку, вы соглашаетесь с{" "}
              <Link to="/privacy" className="underline">
                политикой конфиденциальности
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
