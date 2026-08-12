import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listOrders, setOrderStatus, type AdminOrder } from "@/lib/admin.functions";
import { formatPrice, STATUS_LABELS } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OrdersPage,
});

const STATUSES = ["new", "in_progress", "delivered", "cancelled"] as const;

function OrdersPage() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(setOrderStatus);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchOrders({}),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; status: (typeof STATUSES)[number] }) =>
      updateStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Статус обновлён");
    },
    onError: () => toast.error("Не удалось обновить статус"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Загружаем заявки…</p>;
  if (error) return <p className="text-sm text-destructive">Не удалось загрузить заявки</p>;

  const orders = (data ?? []).filter((order) => filter === "all" || order.status === filter);

  return (
    <div>
      <h1 className="font-display text-4xl">Заявки</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {["all", ...STATUSES].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-sm ${
              filter === value ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {value === "all" ? "все" : STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatus={(status) => mutation.mutate({ id: order.id, status })}
          />
        ))}
        {orders.length === 0 && <p className="text-sm text-muted-foreground">Заявок пока нет.</p>}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
}: {
  order: AdminOrder;
  onStatus: (status: (typeof STATUSES)[number]) => void;
}) {
  return (
    <article className="rounded-3xl bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl">
            №{order.order_no} · {order.customer_name}
            {order.kind === "callback" && (
              <span className="ml-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                обратный звонок
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <a href={`tel:${order.phone}`} className="hover:text-foreground">
              {order.phone}
            </a>
            {order.address && ` · ${order.address}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.delivery_date ? `${order.delivery_date} ` : ""}
            {order.delivery_slot}
            {" · создана "}
            {new Date(order.created_at).toLocaleString("ru-RU")}
          </p>
          {order.comment && <p className="mt-2 text-sm italic">«{order.comment}»</p>}
        </div>
        <p className="font-display text-2xl">{formatPrice(order.total)}</p>
      </div>

      {order.items.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.title} × {item.qty} — {formatPrice(item.price * item.qty)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatus(status)}
            className={`rounded-full border px-4 py-2 text-xs ${
              order.status === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
            }`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </article>
  );
}
