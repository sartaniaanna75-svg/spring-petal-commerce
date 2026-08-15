import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход для сотрудников — Тюльпаны Москва" },
      { name: "description", content: "Служебный вход в панель управления заявками и каталогом." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Вход для сотрудников" },
      { property: "og:description", content: "Панель управления магазином тюльпанов." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onForgotPassword() {
    if (!email) {
      toast.error("Введите email");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Письмо для сброса пароля отправлено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить письмо");
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/admin", replace: true });
        } else {
          setCheckEmail(true);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось войти");
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

        <h1 className="mt-6 font-display text-3xl">
          {mode === "signin" ? "Вход в админку" : "Регистрация сотрудника"}
        </h1>

        {checkEmail ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Мы отправили письмо для подтверждения на {email}. Откройте ссылку из письма и вернитесь сюда.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Пароль"
              className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-full bg-primary text-sm text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Секунду…" : mode === "signin" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        )}

        {mode === "signin" && !checkEmail && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="mt-4 block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Забыли пароль?
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setCheckEmail(false);
          }}
          className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Первый вход? Создать аккаунт" : "У меня уже есть аккаунт"}
        </button>
      </div>
    </div>
  );
}
