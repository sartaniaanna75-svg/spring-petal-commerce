import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/shop.functions";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, type ProductCategory } from "@/lib/shop";

const productsQuery = queryOptions({
  queryKey: ["products", "published"],
  queryFn: () => listProducts(),
});

type Search = {
  color?: string | undefined;
  category?: ProductCategory | undefined;
  sort?: "price-asc" | "price-desc" | "stems" | undefined;
};

const CATEGORY_VALUES = CATEGORIES.map((item) => item.value) as string[];

export const Route = createFileRoute("/catalog/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    color: typeof search["color"] === "string" ? search["color"] : undefined,
    category:
      typeof search["category"] === "string" && CATEGORY_VALUES.includes(search["category"])
        ? (search["category"] as ProductCategory)
        : undefined,
    sort:
      search["sort"] === "price-desc" || search["sort"] === "stems"
        ? search["sort"]
        : search["sort"] === "price-asc"
          ? "price-asc"
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Каталог тюльпанов — штучно, букеты, композиции" },
      {
        name: "description",
        content:
          "Тюльпаны поштучно, авторские букеты и композиции в коробках и корзинах. Доставка по Москве за 2 часа.",
      },
      { property: "og:title", content: "Каталог тюльпанов — штучно, букеты, композиции" },
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
  const { color, sort, category } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const byCategory = category ? products.filter((product) => product.category === category) : products;
  const colors = Array.from(new Set(byCategory.map((product) => product.color)));
  let visible = color ? byCategory.filter((product) => product.color === color) : byCategory;
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

      <div className="mt-8 flex flex-wrap gap-2 border-b border-foreground/10 pb-1">
        {[{ value: undefined, label: "Всё" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))].map(
          (tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() =>
                navigate({
                  search: (prev: Search) => ({ ...prev, category: tab.value, color: undefined }),
                })
              }
              className={`-mb-px border-b-2 px-4 pb-3 pt-2 font-display text-xl transition-colors ${
                category === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ),
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">

        <button
          type="button"
          onClick={() => navigate({ search: (prev: Search) => ({ ...prev, color: undefined }) })}
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
            onClick={() => navigate({ search: (prev: Search) => ({ ...prev, color: item }) })}
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
            navigate({ search: (prev: Search) => ({ ...prev, sort: event.target.value as Search["sort"] }) })
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
