import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { deleteProduct, listAllProducts, saveProduct } from "@/lib/admin.functions";
import { COLORS, formatPrice, productImage, type Product } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Draft = Omit<Product, "id"> & { id?: string };

const EMPTY: Draft = {
  slug: "",
  title: "",
  description: "",
  composition: "",
  stems: 25,
  color: "розовый",
  price: 3900,
  image_url: "",
  published: true,
};

function ProductsPage() {
  const fetchProducts = useServerFn(listAllProducts);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts({}),
  });

  const saveMutation = useMutation({
    mutationFn: (input: Draft) => save({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDraft(null);
      toast.success("Сохранено");
    },
    onError: (error: Error) => toast.error(error.message || "Не удалось сохранить"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Букет удалён");
    },
    onError: () => toast.error("Не удалось удалить"),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Товары</h1>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY })}
          className="h-11 rounded-full bg-primary px-6 text-sm text-primary-foreground"
        >
          Добавить букет
        </button>
      </div>

      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate(draft);
          }}
          className="mt-8 grid gap-3 rounded-3xl bg-card p-6 md:grid-cols-2"
        >
          <Text label="Название" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          <Text
            label="Ссылка (латиницей)"
            value={draft.slug}
            onChange={(v) => setDraft({ ...draft, slug: v })}
          />
          <Text
            label="Цена, ₽"
            value={String(draft.price)}
            onChange={(v) => setDraft({ ...draft, price: Number(v.replace(/\D/g, "")) || 0 })}
          />
          <Text
            label="Стеблей"
            value={String(draft.stems)}
            onChange={(v) => setDraft({ ...draft, stems: Number(v.replace(/\D/g, "")) || 1 })}
          />
          <label className="text-sm">
            <span className="text-muted-foreground">Цвет</span>
            <select
              value={draft.color}
              onChange={(event) => setDraft({ ...draft, color: event.target.value })}
              className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"
            >
              {COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <Text
            label="Ссылка на фото (необязательно)"
            value={draft.image_url}
            onChange={(v) => setDraft({ ...draft, image_url: v })}
          />
          <label className="text-sm md:col-span-2">
            <span className="text-muted-foreground">Описание</span>
            <textarea
              value={draft.description}
              rows={3}
              maxLength={2000}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-muted-foreground">Состав</span>
            <textarea
              value={draft.composition}
              rows={2}
              maxLength={1000}
              onChange={(event) => setDraft({ ...draft, composition: event.target.value })}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
            />
            Показывать в каталоге
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 rounded-full bg-primary px-8 text-sm text-primary-foreground disabled:opacity-60"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-11 rounded-full border border-border px-6 text-sm"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Загружаем каталог…</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {(data ?? []).map((product) => (
            <article key={product.id} className="flex items-center gap-4 rounded-3xl bg-card p-4">
              <img
                src={productImage(product)}
                alt={product.title}
                loading="lazy"
                width={120}
                height={120}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div className="flex-1">
                <p className="font-display text-2xl">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {product.stems} шт · {product.color} · {formatPrice(product.price)}
                  {!product.published && " · скрыт"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft({ ...product })}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Удалить «${product.title}»?`)) deleteMutation.mutate(product.id);
                }}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
              >
                Удалить
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
