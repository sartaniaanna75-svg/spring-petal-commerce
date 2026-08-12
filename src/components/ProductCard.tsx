import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatPrice, productImage, type Product } from "@/lib/shop";

export function ProductCard({ product, tall = false }: { product: Product; tall?: boolean }) {
  const { add } = useCart();

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

      <button
        type="button"
        onClick={() => {
          add({ productId: product.id, slug: product.slug, title: product.title, price: product.price });
          toast.success(`«${product.title}» в корзине`);
        }}
        className="mt-4 h-11 rounded-full border border-foreground/15 text-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
      >
        В корзину
      </button>
    </article>
  );
}
