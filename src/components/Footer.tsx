import { Link } from "@tanstack/react-router";
import { Flower2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <span className="font-display text-2xl">Тюльпаны Москва</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Срезаем утром, собираем днём, привозим к вечеру. Доставка по Москве круглый год.
          </p>
          <p className="mt-4 text-sm">
            <a href="tel:+74951234567" className="transition-colors hover:text-primary">
              +7 (495) 123-45-67
            </a>
            <br />
            <a href="mailto:hello@tulips.moscow" className="text-muted-foreground hover:text-primary">
              hello@tulips.moscow
            </a>
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-display text-xl">Магазин</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/catalog" className="hover:text-foreground">
                Каталог букетов
              </Link>
            </li>
            <li>
              <Link to="/delivery" className="hover:text-foreground">
                Доставка и оплата
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-foreground">
                Корзина
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-display text-xl">Документы</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-foreground">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link to="/offer" className="hover:text-foreground">
                Публичная оферта
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-foreground">
                Вход для сотрудников
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        ИП Тюльпанова А. В. · ИНН 770000000000 · Москва, ул. Цветочная, 7 · © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
