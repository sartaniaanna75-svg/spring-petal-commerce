import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка тюльпанов по Москве — зоны, сроки, оплата" },
      {
        name: "description",
        content:
          "Доставка тюльпанов по Москве за 2 часа: 490 ₽ внутри МКАД, бесплатно от 7000 ₽, самовывоз и оплата картой.",
      },
      { property: "og:title", content: "Доставка тюльпанов по Москве" },
      { property: "og:description", content: "Зоны, сроки, стоимость доставки и способы оплаты." },
    ],
  }),
  component: DeliveryPage,
});

const ZONES = [
  { title: "Внутри Садового", price: "490 ₽", time: "от 2 часов" },
  { title: "Внутри МКАД", price: "490 ₽", time: "от 2,5 часов" },
  { title: "До 10 км за МКАД", price: "890 ₽", time: "от 3 часов" },
  { title: "Самовывоз, ул. Цветочная, 7", price: "бесплатно", time: "через 40 минут" },
];

function DeliveryPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="font-display text-5xl md:text-6xl">Доставка и оплата</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Возим тюльпаны по Москве каждый день с 8:00 до 22:00. Букет едет в термобоксе, курьер отдаёт его
        получателю лично и присылает вам фото.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {ZONES.map((zone) => (
          <div key={zone.title} className="rounded-3xl bg-cream p-6">
            <p className="font-display text-2xl">{zone.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">Срок: {zone.time}</p>
            <p className="mt-1 font-display text-xl text-primary">{zone.price}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-3xl">Бесплатная доставка</h2>
          <p className="mt-2 text-muted-foreground">
            При заказе от 7000 ₽ доставка внутри МКАД бесплатна. Стоимость рассчитывается автоматически в
            корзине.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl">Интервалы</h2>
          <p className="mt-2 text-muted-foreground">
            09:00–13:00, 13:00–17:00, 17:00–21:00 или «как можно скорее». Точное время согласует флорист по
            телефону.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl">Оплата</h2>
          <p className="mt-2 text-muted-foreground">
            Картой по ссылке, переводом по СБП или наличными курьеру. Чек приходит на телефон.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl">Замена и свежесть</h2>
          <p className="mt-2 text-muted-foreground">
            Гарантируем свежесть 5 дней. Если букет завял раньше — заменим или вернём деньги. Подробности в{" "}
            <Link to="/offer" className="underline">
              оферте
            </Link>
            .
          </p>
        </section>
      </div>

      <Link
        to="/catalog"
        className="mt-12 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm text-primary-foreground"
      >
        Выбрать букет
      </Link>
    </div>
  );
}
