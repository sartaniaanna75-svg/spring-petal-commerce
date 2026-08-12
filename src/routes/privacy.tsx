import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности — Тюльпаны Москва" },
      {
        name: "description",
        content: "Как мы обрабатываем и защищаем персональные данные покупателей интернет-магазина тюльпанов.",
      },
      { property: "og:title", content: "Политика конфиденциальности" },
      { property: "og:description", content: "Обработка персональных данных покупателей." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-5xl">Политика конфиденциальности</h1>
      <p className="mt-3 text-sm text-muted-foreground">Редакция от 1 января 2026 года</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-2xl">1. Общие положения</h2>
          <p className="mt-2 text-muted-foreground">
            Настоящая политика определяет порядок обработки персональных данных пользователей сайта
            интернет-магазина «Тюльпаны Москва» (далее — Оператор) и действует в отношении всей информации,
            которую Оператор может получить о пользователе во время использования сайта.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">2. Какие данные мы собираем</h2>
          <p className="mt-2 text-muted-foreground">
            Имя, номер телефона, адрес доставки, дата и интервал доставки, комментарий к заказу, а также
            обезличенные данные о посещении сайта. Данные банковских карт Оператор не хранит.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">3. Цели обработки</h2>
          <p className="mt-2 text-muted-foreground">
            Оформление и доставка заказа, связь с покупателем, информирование о статусе заявки, разрешение
            спорных ситуаций и выполнение требований законодательства РФ.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">4. Передача третьим лицам</h2>
          <p className="mt-2 text-muted-foreground">
            Данные передаются только курьерской службе в объёме, необходимом для доставки, а также
            уполномоченным государственным органам по законному запросу.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">5. Хранение и защита</h2>
          <p className="mt-2 text-muted-foreground">
            Данные хранятся на защищённых серверах на территории РФ в течение трёх лет с момента последнего
            заказа. Доступ имеют только сотрудники, участвующие в обработке заявок.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">6. Права пользователя</h2>
          <p className="mt-2 text-muted-foreground">
            Пользователь вправе запросить сведения об обработке своих данных, потребовать их уточнения,
            блокирования или удаления, отозвать согласие, написав на hello@tulips.moscow.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl">7. Cookie</h2>
          <p className="mt-2 text-muted-foreground">
            Сайт использует cookie и локальное хранилище браузера для работы корзины и аналитики. Их можно
            отключить в настройках браузера — часть функций при этом станет недоступна.
          </p>
        </section>
      </div>
    </article>
  );
}
