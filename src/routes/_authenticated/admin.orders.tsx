import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteOrder,
  listOrders,
  setOrderNote,
  setOrderStatus,
  type AdminOrder,
} from "@/lib/admin.functions";
import { formatPrice, STATUS_LABELS } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const STATUSES = ["new", "in_progress", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const PERIODS = [
  { value: "all", label: "за всё время" },
  { value: "today", label: "сегодня" },
  { value: "week", label: "неделя" },
  { value: "month", label: "месяц" },
] as const;

function periodStart(period: string): number {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "week") return Date.now() - 7 * 24 * 3600 * 1000;
  if (period === "month") return Date.now() - 30 * 24 * 3600 * 1000;
  return 0;
}

function toCsv(orders: AdminOrder[]): string {
  const head = [
    "Номер",
    "Дата",
    "Статус",
    "Имя",
    "Телефон",
    "Адрес",
    "Доставка",
    "Сумма",
    "Состав",
    "Комментарий",
    "Заметка",
  ];
  const rows = orders.map((order) => [
    order.order_no,
    new Date(order.created_at).toLocaleString("ru-RU"),
    STATUS_LABELS[order.status] ?? order.status,
    order.customer_name,
    order.phone,
    order.address,
    `${order.delivery_date ?? ""} ${order.delivery_slot}`.trim(),
    order.total,
    order.items.map((item) => `${item.title} x${item.qty}`).join("; "),
    order.comment,
    order.admin_note,
  ]);
  return [head, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

function OrdersPage() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(setOrderStatus);
  const updateNote = useServerFn(setOrderNote);
  const removeOrder = useServerFn(deleteOrder);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => fetchOrders({}),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: Status }) => updateStatus({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Статус обновлён");
    },
    onError: () => toast.error("Не удалось обновить статус"),
  });

  const noteMutation = useMutation({
    mutationFn: (input: { id: string; note: string }) => updateNote({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Заметка сохранена");
    },
    onError: () => toast.error("Не удалось сохранить заметку"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeOrder({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Заявка удалена");
    },
    onError: () => toast.error("Не удалось удалить заявку"),
  });

  const orders = useMemo(() => {
    const from = periodStart(period);
    const query = search.trim().toLowerCase();
    return (data ?? []).filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (new Date(order.created_at).getTime() < from) return false;
      if (!query) return true;
      return (
        String(order.order_no).includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.phone.toLowerCase().includes(query)
      );
    });
  }, [data, filter, period, search]);

  function exportCsv() {
    const blob = new Blob(["\ufeff" + toCsv(orders)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zayavki-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Загружаем заявки…</p>;
  if (error) return <p className="text-sm text-destructive">Не удалось загрузить заявки</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Заявки</h1>
        <button
          type="button"
          onClick={exportCsv}
          className="h-11 rounded-full border border-border px-6 text-sm hover:border-primary"
        >
          Выгрузить CSV
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по номеру, имени или телефону"
        className="mt-6 h-11 w-full max-w-md rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
      />

      <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="mt-3 flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setPeriod(item.value)}
            className={`rounded-full border px-4 py-2 text-xs ${
              period === item.value ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatus={(status) => statusMutation.mutate({ id: order.id, status })}
            onNote={(note) => noteMutation.mutate({ id: order.id, note })}
            onDelete={() => {
              if (window.confirm(`Удалить заявку №${order.order_no}?`)) deleteMutation.mutate(order.id);
            }}
          />
        ))}
        {orders.length === 0 && <p className="text-sm text-muted-foreground">Заявок не найдено.</p>}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onNote,
  onDelete,
}: {
  order: AdminOrder;
  onStatus: (status: Status) => void;
  onNote: (note: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(order.admin_note);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

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
            <button
              type="button"
              onClick={() => copy(order.phone)}
              className="ml-2 text-xs underline-offset-4 hover:underline"
            >
              копировать
            </button>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString("ru-RU")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl">{formatPrice(order.total)}</p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            {open ? "Свернуть" : "Подробнее"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {order.address && (
            <p className="text-muted-foreground">
              Адрес: {order.address}
              <button
                type="button"
                onClick={() => copy(order.address)}
                className="ml-2 text-xs underline-offset-4 hover:underline"
              >
                копировать
              </button>
            </p>
          )}
          <p className="text-muted-foreground">
            Доставка: {order.delivery_date ?? "дата не указана"} {order.delivery_slot}
          </p>
          {order.comment && <p className="italic">«{order.comment}»</p>}
          {order.items.length > 0 && (
            <ul className="space-y-1 text-muted-foreground">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.title} × {item.qty} — {formatPrice(item.price * item.qty)}
                </li>
              ))}
            </ul>
          )}
          <div>
            <p className="text-muted-foreground">Заметка менеджера</p>
            <textarea
              value={note}
              rows={2}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => onNote(note)}
              className="mt-2 rounded-full border border-border px-4 py-2 text-xs hover:border-primary"
            >
              Сохранить заметку
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-full border border-border px-4 py-2 text-xs hover:border-destructive hover:text-destructive"
        >
          Удалить
        </button>
      </div>
    </article>
  );
}
