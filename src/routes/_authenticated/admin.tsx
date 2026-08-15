import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { claimAdmin, getAdminStatus } from "@/lib/admin.functions";
import { ThemeToggle } from "@/components/ThemeToggle";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Панель управления — Тюльпаны Москва" },
      { name: "description", content: "Заявки и каталог букетов магазина тюльпанов." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Панель управления" },
      { property: "og:description", content: "Заявки и каталог магазина тюльпанов." },
    ],
  }),
  component: AdminLayout,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
});

function AdminLayout() {
  const status = useServerFn(getAdminStatus);
  const claim = useServerFn(claimAdmin);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => status({}),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <ThemeToggle />
          <Link to="/" className="flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <span className="font-display text-xl">Админка</span>
          </Link>

          <nav className="flex gap-4 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Сводка
            </Link>
            <Link
              to="/admin/orders"
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Заявки
            </Link>
            <Link
              to="/admin/products"
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Товары
            </Link>
            <Link
              to="/admin/chats"
              activeProps={{ className: "text-primary" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Чаты
            </Link>
          </nav>
          <button
            type="button"
            onClick={signOut}
            className="ml-auto rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загружаем…</p>
        ) : data?.isAdmin ? (
          <Outlet />
        ) : (
          <div className="rounded-3xl bg-card p-8">
            <h1 className="font-display text-3xl">Нет прав администратора</h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              Если вы первый сотрудник магазина, нажмите кнопку ниже — аккаунт станет администратором.
              Остальным доступ выдаёт действующий администратор.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await claim({});
                  if (result.claimed) {
                    toast.success("Готово, вы администратор");
                    queryClient.invalidateQueries({ queryKey: ["admin"] });
                  } else {
                    toast.error("Администратор уже назначен");
                  }
                } catch {
                  toast.error("Не удалось назначить права");
                }
              }}
              className="mt-6 h-12 rounded-full bg-primary px-8 text-sm text-primary-foreground"
            >
              Стать администратором
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
