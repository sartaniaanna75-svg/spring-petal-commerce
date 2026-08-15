export type ChatCard = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stems: number;
  color: string;
  category: string;
  image_url: string;
  images: string[];
};

const CARDS_RE = /\[\[CARDS\]\]\s*(\{[\s\S]*?\})/;

/** Отделяет служебный блок с карточками товаров от видимого текста. */
export function splitCards(content: string): { text: string; slugs: string[] } {
  const match = content.match(CARDS_RE);
  let slugs: string[] = [];
  if (match) {
    try {
      const payload = JSON.parse(match[1]!) as { slugs?: unknown };
      if (Array.isArray(payload.slugs)) {
        slugs = payload.slugs.filter((item): item is string => typeof item === "string").slice(0, 6);
      }
    } catch {
      /* ignore */
    }
  }
  return { text: content.replace(CARDS_RE, "").trim(), slugs };
}
