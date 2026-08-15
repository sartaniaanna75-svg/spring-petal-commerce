import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LifeBuoy, Send, Trash2 } from "lucide-react";
import {
  deleteChat,
  getChatMessages,
  listChats,
  replyAsOperator,
  updateChat,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/chats")({
  component: AdminChats,
});

const STATUS_LABELS: Record<string, string> = {
  active: "Бот ведёт",
  operator: "Нужен оператор",
  ordered: "Заявка оформлена",
  closed: "Закрыт",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function AdminChats() {
  const queryClient = useQueryClient();
  const fetchChats = useServerFn(listChats);
  const fetchMessages = useServerFn(getChatMessages);
  const reply = useServerFn(replyAsOperator);
  const patch = useServerFn(updateChat);
  const remove = useServerFn(deleteChat);

  const [selected, setSelected] = useState<string | null>(null);
  const [onlyTickets, setOnlyTickets] = useState(false);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useQuery({
    queryKey: ["admin", "chats"],
    queryFn: () => fetchChats({}),
    refetchInterval: 15000,
  });

  const chats = useMemo(() => {
    const list = chatsQuery.data ?? [];
    return onlyTickets ? list.filter((chat) => chat.needs_operator) : list;
  }, [chatsQuery.data, onlyTickets]);

  useEffect(() => {
    if (!selected && chats.length > 0) setSelected(chats[0]!.id);
  }, [chats, selected]);

  const messagesQuery = useQuery({
    queryKey: ["admin", "chat", selected],
    queryFn: () => fetchMessages({ data: { sessionId: selected! } }),
    enabled: Boolean(selected),
    refetchInterval: 10000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => reply({ data: { sessionId: selected!, content } }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["admin", "chat", selected] });
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
    },
    onError: () => toast.error("Не удалось отправить"),
  });

  const current = chats.find((chat) => chat.id === selected) ?? null;
  const ticketCount = (chatsQuery.data ?? []).filter((chat) => chat.needs_operator).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Чаты с ботом</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Все переписки клиентов с Тюльпой. Тикетов на оператора: {ticketCount}.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyTickets}
            onChange={(event) => setOnlyTickets(event.target.checked)}
          />
          Только тикеты оператору
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-2 rounded-3xl bg-card p-3">
          {chatsQuery.isLoading && <p className="p-3 text-sm text-muted-foreground">Загружаем…</p>}
          {!chatsQuery.isLoading && chats.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Пока нет чатов.</p>
          )}
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setSelected(chat.id)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition-colors ${
                chat.id === selected ? "bg-secondary/70" : "hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{chat.customer_name}</span>
                {chat.needs_operator && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                    <LifeBuoy className="h-3 w-3" /> тикет
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {chat.phone} · {formatTime(chat.last_message_at)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{chat.preview}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {STATUS_LABELS[chat.status] ?? chat.status}
                {chat.order_no ? ` · заявка №${chat.order_no}` : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="flex min-h-[30rem] flex-col rounded-3xl bg-card p-5">
          {!current ? (
            <p className="text-sm text-muted-foreground">Выберите чат слева.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="font-display text-xl">{current.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {current.phone} · начат {formatTime(current.created_at)}
                    {current.order_no ? ` · заявка №${current.order_no}` : ""}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  {current.needs_operator && (
                    <button
                      type="button"
                      onClick={async () => {
                        await patch({
                          data: { sessionId: current.id, needs_operator: false, status: "closed" },
                        });
                        queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
                        toast.success("Тикет закрыт");
                      }}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:border-primary"
                    >
                      Закрыть тикет
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Удалить переписку?")) return;
                      await remove({ data: { sessionId: current.id } });
                      setSelected(null);
                      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Удалить
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4 text-sm">
                {(messagesQuery.data ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-secondary/60"
                        : message.role === "operator"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "ml-auto bg-secondary/30"
                    }`}
                  >
                    <span className="mb-1 block text-[11px] opacity-70">
                      {message.role === "user"
                        ? current.customer_name
                        : message.role === "operator"
                          ? "Оператор"
                          : "Тюльпа"}{" "}
                      · {formatTime(message.created_at)}
                    </span>
                    {message.content}
                  </div>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = text.trim();
                  if (value) sendMutation.mutate(value);
                }}
                className="flex items-center gap-2 border-t border-border/60 pt-4"
              >
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Ответить клиенту как живой флорист…"
                  className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={sendMutation.isPending || !text.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Отправить"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
