import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/shop.functions";
import { ProductCard } from "@/components/ProductCard";

const productsQuery = queryOptions({
  queryKey: ["products", "published"],
  queryFn: () => listProducts(),
});

type Search = { color?: string; sort?: "price-asc" | "price-desc" | "stems" };

export const Route = createFileRoute("/catalog")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    color: typeof search["color"] === "string" ? search["color"] : undefined,
    sort:
      search["sort"] === "price-desc" || search["sort"] === "stems"
        ? search["sort"]
        : search["sort"] === "price-asc"
          ? "price-asc"
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Каталог букетов тюльпанов — Москва" },
      {
        name: "description",
        content: "Букеты тюльпанов от 15 до 101 стебля: розовые, белые, красные, сиреневые и микс.",
      },
      { property: "og:title", content: "Каталог букетов тюльпанов — Москва" },
      { property: "og:description", content: "Свежая срезка, доставка по Москве за 2 часа." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQuery);
  },
  component: CatalogPage,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Букеты не найдены</div>,
});

function CatalogPage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { color, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const colors = Array.from(new Set(products.map((product) => product.color)));
  let visible = color ? products.filter((product) => product.color === color) : products;
  visible = [...visible].sort((a, b) => {
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "stems") return b.stems - a.stems;
    return a.price - b.price;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="font-display text-5xl md:text-6xl">Каталог</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Всё, что сегодня в срезке. Количество стеблей можно изменить в комментарии к заказу.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ search: (prev) => ({ ...prev, color: undefined }) })}
          className={`rounded-full border px-5 py-2 text-sm transition-colors ${
            !color ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15"
          }`}
        >
          все
        </button>
        {colors.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => navigate({ search: (prev) => ({ ...prev, color: item }) })}
            className={`rounded-full border px-5 py-2 text-sm transition-colors ${
              color === item ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15"
            }`}
          >
            {item}
          </button>
        ))}

        <select
          value={sort ?? "price-asc"}
          onChange={(event) =>
            navigate({ search: (prev) => ({ ...prev, sort: event.target.value as Search["sort"] }) })
          }
          className="ml-auto h-10 rounded-full border border-foreground/15 bg-card px-4 text-sm"
        >
          <option value="price-asc">сначала дешевле</option>
          <option value="price-desc">сначала дороже</option>
          <option value="stems">больше стеблей</option>
        </select>
      </div>

      <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product, index) => (
          <div key={product.id} className={index % 3 === 1 ? "lg:mt-12" : ""}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-16 text-center text-muted-foreground">В этом оттенке сегодня пусто.</p>
      )}
    </div>
  );
}
