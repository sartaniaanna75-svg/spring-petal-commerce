import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта — Тюльпаны Москва" },
      {
        name: "description",
        content: "Условия продажи и доставки букетов тюльпанов: оформление заказа, оплата, возврат, гарантии.",
      },
      { property: "og:title", content: "Публичная оферта" },
      { property: "og:description", content: "Условия продажи и доставки букетов тюльпанов по Москве." },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-5xl">Публичная оферта</h1>
      <p className="mt-3 text-sm text-muted-foreground">Редакция от 1 января 2026 года</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-2xl">1. Предмет</h2>
          <p className="mt-2 text-muted-foreground">
            Настоящий документ является публичной офертой ИП Тюльпанова А. В. (далее — Продавец) о продаже
            цветочной продукции дистанционным способом. Оформление заказа означает полное принятие условий
            оферты.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">2. Оформление заказа</h2>
          <p className="mt-2 text-muted-foreground">
            Заказ оформляется на сайте или по телефону. Продавец подтверждает заказ звонком и согласовывает
            состав букета, дату и интервал доставки.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">3. Цена и оплата</h2>
          <p className="mt-2 text-muted-foreground">
            Цены указаны в рублях РФ и включают упаковку. Стоимость доставки рассчитывается в корзине. Оплата
            производится картой, по СБП или наличными курьеру.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">4. Доставка</h2>
          <p className="mt-2 text-muted-foreground">
            Доставка выполняется по Москве и до 10 км за МКАД в согласованный интервал. Если получатель
            недоступен, курьер ожидает 15 минут, повторная доставка оплачивается отдельно.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">5. Замена состава</h2>
          <p className="mt-2 text-muted-foreground">
            Продавец вправе заменить отдельные сорта тюльпанов на равноценные по стоимости и внешнему виду,
            сохранив количество стеблей и оттенок букета.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">6. Возврат и гарантии</h2>
          <p className="mt-2 text-muted-foreground">
            Срезанные цветы надлежащего качества возврату не подлежат. При обнаружении дефекта в течение 24
            часов с фотоподтверждением Продавец заменяет букет или возвращает его стоимость.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">7. Реквизиты</h2>
          <p className="mt-2 text-muted-foreground">
            ИП Тюльпанова Анна Владимировна, ИНН 770000000000, Москва, ул. Цветочная, 7. Телефон +7 (495)
            123-45-67, hello@tulips.moscow.
          </p>
        </section>
      </div>
    </article>
  );
}
