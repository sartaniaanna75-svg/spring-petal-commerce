import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatPrice, productImage, type Product } from "@/lib/shop";

export function ProductCard({ product, tall = false }: { product: Product; tall?: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <article className="group flex flex-col">
      <Link
        to="/catalog/$slug"
        params={{ slug: product.slug }}
        className="block overflow-hidden rounded-3xl bg-cream petal-edge"
      >
        <img
          src={productImage(product)}
          alt={`Букет «${product.title}» — ${product.stems} тюльпанов`}
          loading="lazy"
          width={1024}
          height={1280}
          className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${
            tall ? "aspect-[3/4]" : "aspect-[4/5]"
          }`}
        />
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <Link to="/catalog/$slug" params={{ slug: product.slug }} className="font-display text-2xl">
            {product.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {product.stems} шт · {product.color}
          </p>
        </div>
        <p className="shrink-0 pt-1 font-display text-xl">{formatPrice(product.price)}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 shrink-0 items-center rounded-full border border-foreground/15">
          <button
            type="button"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            className="h-11 w-10 text-lg"
            aria-label={`Меньше: ${product.title}`}
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((value) => Math.min(20, value + 1))}
            className="h-11 w-10 text-lg"
            aria-label={`Больше: ${product.title}`}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            add(
              { productId: product.id, slug: product.slug, title: product.title, price: product.price },
              qty,
            );
            toast.success(`«${product.title}» в корзине — ${qty} шт`);
            setQty(1);
          }}
          className="h-11 flex-1 rounded-full border border-foreground/15 text-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          В корзину
        </button>
      </div>
    </article>
  );
}
