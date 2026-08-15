import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";


const NAV = [
  { to: "/catalog", label: "Каталог" },
  { to: "/delivery", label: "Доставка" },
  { to: "/", hash: "about", label: "О нас" },
] as const;

export function Header() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border/60 backdrop-blur transition-all ${
        scrolled ? "bg-background/90 py-2" : "bg-background/60 py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <span className="font-display text-2xl leading-none">Тюльпаны Москва</span>
          </Link>
        </div>


        <nav className="hidden items-center gap-7 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              {...("hash" in item ? { hash: item.hash } : {})}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          {signedIn && (
            <Link
              to="/admin"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Панель управления
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="tel:+74951234567"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline"
          >
            +7 (495) 123-45-67
          </a>
          <Link
            to="/cart"
            className="relative inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-primary/50"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Корзина</span>
            {count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Меню"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mx-auto mt-3 flex max-w-6xl flex-col gap-3 border-t border-border/60 px-5 pt-4 pb-2 text-sm md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              {...("hash" in item ? { hash: item.hash } : {})}
              onClick={() => setOpen(false)}
              className="py-1"
            >
              {item.label}
            </Link>
          ))}
          {signedIn && (
            <Link to="/admin" onClick={() => setOpen(false)} className="py-1">
              Панель управления
            </Link>
          )}
          <a href="tel:+74951234567" className="py-1 text-muted-foreground">
            +7 (495) 123-45-67
          </a>
        </nav>
      )}
    </header>
  );
}
