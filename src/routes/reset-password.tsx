import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Новый пароль — Тюльпаны Москва" },
      { name: "description", content: "Установите новый пароль для входа в панель управления." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Новый пароль" },
      { property: "og:description", content: "Восстановление доступа к панели управления." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Пароль обновлён");
      navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось изменить пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5 py-16">
      <div className="w-full max-w-sm rounded-[2rem] bg-card p-8">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <span className="font-display text-2xl">Тюльпаны Москва</span>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="mt-6 font-display text-3xl">Новый пароль</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Откройте эту страницу по ссылке из письма и задайте новый пароль.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Новый пароль"
            className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-primary text-sm text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Сохраняем…" : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
