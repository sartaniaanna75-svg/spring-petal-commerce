import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct, listProducts } from "@/lib/shop.functions";
import { formatPrice, productImage } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });

const productsQuery = queryOptions({
  queryKey: ["products", "published"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/catalog/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    context.queryClient.ensureQueryData(productsQuery);
    return { title: product.title, description: product.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Букет недоступен" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${loaderData.title} — букет тюльпанов с доставкой по Москве` },
        { name: "description", content: loaderData.description.slice(0, 155) },
        { property: "og:title", content: `${loaderData.title} — букет тюльпанов` },
        { property: "og:description", content: loaderData.description.slice(0, 155) },
      ],
    };
  },
  component: ProductPage,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-20 text-center">
      <p className="font-display text-3xl">Такого букета нет</p>
      <Link to="/catalog" className="mt-4 inline-block underline">
        Вернуться в каталог
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(slug));
  const { data: products } = useSuspenseQuery(productsQuery);
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const similar = products.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Главная
        </Link>{" "}
        ·{" "}
        <Link to="/catalog" className="hover:text-foreground">
          Каталог
        </Link>{" "}
        · <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div className="overflow-hidden rounded-[2.5rem] bg-cream petal-edge">
          <img
            src={productImage(product)}
            alt={`Букет «${product.title}» из ${product.stems} тюльпанов`}
            width={1024}
            height={1280}
            className="aspect-[4/5] w-full object-cover"
          />
        </div>

        <div>
          <h1 className="font-display text-5xl">{product.title}</h1>
          <p className="mt-3 text-muted-foreground">
            {product.stems} тюльпанов · оттенок «{product.color}»
          </p>
          <p className="mt-6 max-w-md">{product.description}</p>

          <div className="mt-6 rounded-3xl bg-cream p-5 text-sm">
            <p className="font-display text-xl">Состав</p>
            <p className="mt-1 text-muted-foreground">{product.composition}</p>
          </div>

          <p className="mt-8 font-display text-4xl">{formatPrice(product.price)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex h-12 items-center rounded-full border border-foreground/15">
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="h-12 w-12 text-lg"
                aria-label="Меньше"
              >
                −
              </button>
              <span className="w-8 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(20, value + 1))}
                className="h-12 w-12 text-lg"
                aria-label="Больше"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    title: product.title,
                    price: product.price,
                  },
                  qty,
                );
                toast.success("Добавили в корзину");
              }}
              className="h-12 rounded-full bg-primary px-10 text-sm text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              В корзину
            </button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Доставка по Москве от 2 часов, 490 ₽ · бесплатно от 7000 ₽.{" "}
            <Link to="/delivery" className="underline">
              Условия доставки
            </Link>
          </p>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display text-4xl">Похожие букеты</h2>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
