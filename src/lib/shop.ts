import pink from "@/assets/bouquet-pink.jpg";
import white from "@/assets/bouquet-white.jpg";
import mix from "@/assets/bouquet-mix.jpg";
import hero from "@/assets/tulips-hero.jpg";

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  composition: string;
  stems: number;
  color: string;
  price: number;
  image_url: string;
  published: boolean;
};

export const DELIVERY_PRICE = 490;
export const FREE_DELIVERY_FROM = 7000;

export const COLORS = ["розовый", "белый", "красный", "жёлтый", "сиреневый", "микс"];

export const SLOTS = ["09:00–13:00", "13:00–17:00", "17:00–21:00", "как можно скорее"];

export const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  delivered: "Доставлена",
  cancelled: "Отменена",
};

export const heroImage = hero;

export function productImage(product: Pick<Product, "image_url" | "color">): string {
  if (product.image_url) return product.image_url;
  switch (product.color) {
    case "белый":
      return white;
    case "микс":
    case "жёлтый":
    case "сиреневый":
      return mix;
    default:
      return pink;
  }
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

export function deliveryCost(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICE;
}
