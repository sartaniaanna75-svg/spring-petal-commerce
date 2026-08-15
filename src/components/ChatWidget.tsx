import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleHeart, Send, X, Loader2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { askFlowerBot, pollChat, requestOperator, startChatSession } from "@/lib/chat.functions";

type Message = { role: "user" | "assistant" | "operator"; content: string };

const STORAGE_KEY = "tulip-bot-lead-v2";

const GREETING =
  "Здравствуйте! Я Тюльпа — помогу подобрать букет или собрать свой из наших тюльпанов, посчитаю сумму и сразу оформлю заявку. Расскажите, для кого и какой повод?";

type Lead = { name: string; phone: string; sessionId: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [operatorMode, setOperatorMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useServerFn(askFlowerBot);
  const start = useServerFn(startChatSession);
  const poll = useServerFn(pollChat);
  const callOperator = useServerFn(requestOperator);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLead(JSON.parse(raw) as Lead);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const sync = useCallback(async () => {
    if (!lead) return;
    try {
      const result = await poll({ data: { sessionId: lead.sessionId } });
      setOperatorMode(result.needsOperator);
      if (result.messages.length > 0) {
        setMessages([{ role: "assistant", content: GREETING }, ...result.messages]);
      }
    } catch {
      /* ignore */
    }
  }, [lead, poll]);

  // Подтягиваем историю и ответы живого оператора, пока чат открыт.
  useEffect(() => {
    if (!open || !lead) return;
    void sync();
    const timer = window.setInterval(() => void sync(), 12000);
    return () => window.clearInterval(timer);
  }, [open, lead, sync]);

  async function startChat(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 6 || !agree || starting) return;
    setStarting(true);
    try {
      const result = await start({ data: { name: name.trim(), phone: phone.trim() } });
      const next: Lead = { name: name.trim(), phone: phone.trim(), sessionId: result.sessionId };
      setLead(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch {
      toast.error("Не удалось начать чат, попробуйте ещё раз");
    } finally {
      setStarting(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading || !lead) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const result = await ask({ data: { sessionId: lead.sessionId, message: text } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      if (result.orderNo) toast.success(`Заявка №${result.orderNo} оформлена`);
      if (result.operator) setOperatorMode(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помощник недоступен");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Простите, не получилось ответить. Попробуйте ещё раз." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Чат с подборщиком букетов"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleHeart className="h-5 w-5" strokeWidth={1.5} />}
        <span className="hidden sm:inline">{open ? "Закрыть" : "Бот-флорист"}</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border/60 bg-secondary/40 px-5 py-4">
            <p className="font-display text-xl leading-none">Тюльпа</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {operatorMode
                ? "Живой флорист подключён к чату"
                : "Подберёт букет, посчитает и оформит заявку"}
            </p>
          </div>

          {!lead ? (
            <form onSubmit={startChat} className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 text-sm">
              <p className="text-muted-foreground">
                Познакомимся? Оставьте имя и телефон — так флорист сможет продолжить подбор, если чат
                прервётся.
              </p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Имя"
                className="h-11 rounded-xl border border-border bg-background px-4 outline-none focus:border-primary/60"
                required
                minLength={2}
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Телефон"
                type="tel"
                className="h-11 rounded-xl border border-border bg-background px-4 outline-none focus:border-primary/60"
                required
                minLength={6}
              />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Согласен с{" "}
                  <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                    политикой конфиденциальности
                  </Link>{" "}
                  и обработкой персональных данных
                </span>
              </label>
              <button
                type="submit"
                disabled={name.trim().length < 2 || phone.trim().length < 6 || !agree || starting}
                className="mt-1 h-11 rounded-full bg-primary text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {starting ? "Открываем чат…" : "Начать чат"}
              </button>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : message.role === "operator"
                          ? "border border-primary/40 bg-secondary/60 text-foreground"
                          : "bg-secondary/60 text-foreground"
                    }`}
                  >
                    {message.role === "operator" && (
                      <span className="mb-1 block text-[11px] text-primary">Флорист магазина</span>
                    )}
                    {message.content}
                  </div>
                ))}
                {loading && (
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-2.5 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> подбираю…
                  </div>
                )}
              </div>

              {!operatorMode && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await callOperator({ data: { sessionId: lead.sessionId } });
                      setOperatorMode(true);
                      toast.success("Флорист подключится к чату");
                      void sync();
                    } catch {
                      toast.error("Не удалось позвать оператора");
                    }
                  }}
                  className="mx-4 mb-1 inline-flex items-center justify-center gap-2 rounded-full border border-border py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  <LifeBuoy className="h-3.5 w-3.5" /> Позвать живого флориста
                </button>
              )}

              <form onSubmit={send} className="flex items-center gap-2 border-t border-border/60 p-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Например: букет маме на 3000 ₽"
                  className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Отправить"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
