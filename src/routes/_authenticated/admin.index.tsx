import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin.functions";
import { formatPrice, STATUS_LABELS } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchStats({}),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Собираем сводку…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Не удалось загрузить сводку</p>;

  return (
    <div>
      <h1 className="font-display text-4xl">Сводка</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile title="Сегодня" value={formatPrice(data.today.revenue)} note={`${data.today.orders} заявок`} />
        <Tile title="7 дней" value={formatPrice(data.week.revenue)} note={`${data.week.orders} заявок`} />
        <Tile title="30 дней" value={formatPrice(data.month.revenue)} note={`${data.month.orders} заявок`} />
        <Tile title="Средний чек" value={formatPrice(data.averageCheck)} note={`новых заявок: ${data.newCount}`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-6">
          <h2 className="font-display text-2xl">Топ товаров за 30 дней</h2>
          {data.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Пока нет продаж.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.topProducts.map((item) => (
                <li key={item.title} className="flex justify-between gap-4">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground">
                    {item.qty} шт · {formatPrice(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Последние заявки</h2>
            <Link to="/admin/orders" className="text-sm text-primary underline-offset-4 hover:underline">
              Все заявки
            </Link>
          </div>
          {data.latest.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Заявок пока нет.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {data.latest.map((order) => (
                <li key={order.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    №{order.order_no} · {order.customer_name}
                  </span>
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[order.status] ?? order.status} · {formatPrice(order.total)} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl bg-card p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
