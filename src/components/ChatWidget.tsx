import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleHeart, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { askFlowerBot } from "@/lib/chat.functions";
import { submitOrder } from "@/lib/shop.functions";

type Message = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "tulip-bot-lead-v1";

const GREETING =
  "Здравствуйте! Я Тюльпа — помогу подобрать букет или собрать свой из наших тюльпанов. Расскажите, для кого и какой повод?";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<{ name: string; phone: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useServerFn(askFlowerBot);
  const sendLead = useServerFn(submitOrder);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLead(JSON.parse(raw) as { name: string; phone: string });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  async function startChat(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 6 || !agree) return;
    const next = { name: name.trim(), phone: phone.trim() };
    setLead(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try {
      await sendLead({
        data: {
          kind: "callback",
          customer_name: next.name,
          phone: next.phone,
          address: "",
          delivery_date: "",
          delivery_slot: "",
          comment: "Обращение через чат-бота на сайте",
          items: [],
        },
      });
    } catch {
      /* заявка не критична для чата */
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading || !lead) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const result = await ask({
        data: { name: lead.name, phone: lead.phone, messages: next.slice(-20) },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
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
            <p className="mt-1 text-xs text-muted-foreground">Подберёт букет из нашего каталога</p>
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
                placeholder="+7 (999) 000-00-00"
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
                  className="mt-0.5 h-4 w-4 accent-primary"
                  required
                />
                <span>
                  Согласен(на) с{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    политикой конфиденциальности
                  </Link>{" "}
                  и обработкой персональных данных
                </span>
              </label>
              <button
                type="submit"
                disabled={name.trim().length < 2 || phone.trim().length < 6 || !agree}
                className="mt-1 h-11 rounded-full bg-primary text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Начать чат
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
                        : "bg-secondary/60 text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
                {loading && (
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-2.5 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> подбираю…
                  </div>
                )}
              </div>
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
