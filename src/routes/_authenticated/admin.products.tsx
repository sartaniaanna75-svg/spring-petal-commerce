import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteProduct,
  duplicateProduct,
  listAllProducts,
  reorderProducts,
  saveProduct,
  setProductPublished,
} from "@/lib/admin.functions";
import {
  CATEGORIES,
  COLORS,
  categoryLabel,
  formatPrice,
  productImage,
  type Product,
} from "@/lib/shop";

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
  images: [],
  published: true,
  category: "bouquet",
  sort_order: 0,
};

function ProductsPage() {
  const fetchProducts = useServerFn(listAllProducts);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const duplicate = useServerFn(duplicateProduct);
  const togglePublished = useServerFn(setProductPublished);
  const reorder = useServerFn(reorderProducts);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibility, setVisibility] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => fetchProducts({}),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
  };

  async function uploadPhoto(file: File): Promise<string | null> {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Файл больше 8 МБ");
      return null;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: signed, error: signError } = await supabase.storage
        .from("product-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signError || !signed) throw signError ?? new Error("Не удалось получить ссылку");
      return signed.signedUrl;
    } catch (error) {
      toast.error((error as Error).message || "Не удалось загрузить фото");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      const current = draft?.images.length ?? 0;
      if (current >= 5) {
        toast.error("Максимум 5 фото");
        break;
      }
      const url = await uploadPhoto(file);
      if (url) setDraft((prev) => (prev ? { ...prev, images: [...prev.images, url].slice(0, 5) } : prev));
    }
  }

  const saveMutation = useMutation({
    mutationFn: (input: Draft) => save({ data: input }),
    onSuccess: () => {
      invalidate();
      setDraft(null);
      toast.success("Сохранено");
    },
    onError: (error: Error) => toast.error(error.message || "Не удалось сохранить"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Товар удалён");
    },
    onError: () => toast.error("Не удалось удалить"),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicate({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Создана копия (скрыта из каталога)");
    },
    onError: () => toast.error("Не удалось скопировать"),
  });

  const publishMutation = useMutation({
    mutationFn: (input: { id: string; published: boolean }) => togglePublished({ data: input }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Не удалось изменить видимость"),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; sort_order: number }>) => reorder({ data: { items } }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Не удалось изменить порядок"),
  });

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (visibility === "published" && !product.published) return false;
      if (visibility === "hidden" && product.published) return false;
      if (!query) return true;
      return product.title.toLowerCase().includes(query) || product.slug.includes(query);
    });
  }, [data, search, categoryFilter, visibility]);

  function move(index: number, direction: -1 | 1) {
    const list = [...(data ?? [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const a = list[index]!;
    const b = list[target]!;
    list[index] = b;
    list[target] = a;
    reorderMutation.mutate(list.map((item, position) => ({ id: item.id, sort_order: position })));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Товары</h1>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY, sort_order: (data?.length ?? 0) + 1 })}
          className="h-11 rounded-full bg-primary px-6 text-sm text-primary-foreground"
        >
          Добавить товар
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию"
          className="h-11 w-full max-w-xs rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-11 rounded-2xl border border-border bg-background px-4 text-sm"
        >
          <option value="all">все типы</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
          className="h-11 rounded-2xl border border-border bg-background px-4 text-sm"
        >
          <option value="all">все</option>
          <option value="published">опубликованные</option>
          <option value="hidden">скрытые</option>
        </select>
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
            <span className="text-muted-foreground">Тип товара</span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value as Product["category"] })
              }
              className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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

          <div
            className="text-sm md:col-span-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files);
            }}
          >
            <span className="text-muted-foreground">Фото товара (до 5, первое — главное)</span>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border p-4">
              {draft.images.map((url, index) => (
                <div key={url} className="relative">
                  <img src={url} alt={`Фото ${index + 1}`} className="h-20 w-20 rounded-2xl object-cover" />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-2 text-[10px] text-primary-foreground">
                      главное
                    </span>
                  )}
                  <div className="mt-1 flex justify-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const images = [...draft.images];
                        const [item] = images.splice(index, 1);
                        images.unshift(item!);
                        setDraft({ ...draft, images });
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, images: draft.images.filter((_, i) => i !== index) })
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <label className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-5 text-sm hover:border-primary">
                {uploading ? "Загружаем…" : "Загрузить фото"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={async (event) => {
                    const files = event.target.files;
                    event.target.value = "";
                    if (files?.length) await addFiles(files);
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">или перетащите файлы сюда</span>
            </div>
          </div>

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
          <Text
            label="Порядок в каталоге"
            value={String(draft.sort_order)}
            onChange={(v) => setDraft({ ...draft, sort_order: Number(v.replace(/\D/g, "")) || 0 })}
          />
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
              disabled={saveMutation.isPending || uploading}
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
          {products.map((product) => (
            <article key={product.id} className="flex flex-wrap items-center gap-4 rounded-3xl bg-card p-4">
              <img
                src={product.images[0] ?? productImage(product)}
                alt={product.title}
                loading="lazy"
                width={120}
                height={120}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div className="min-w-[200px] flex-1">
                <p className="font-display text-2xl">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {categoryLabel(product.category)} · {product.stems} шт · {product.color} ·{" "}
                  {formatPrice(product.price)}
                  {product.images.length > 1 && ` · ${product.images.length} фото`}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move((data ?? []).indexOf(product), -1)}
                  className="rounded-full border border-border px-3 text-xs"
                  aria-label="Выше"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move((data ?? []).indexOf(product), 1)}
                  className="rounded-full border border-border px-3 text-xs"
                  aria-label="Ниже"
                >
                  ↓
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={product.published}
                  onChange={(event) =>
                    publishMutation.mutate({ id: product.id, published: event.target.checked })
                  }
                />
                в каталоге
              </label>
              <button
                type="button"
                onClick={() => setDraft({ ...product })}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={() => duplicateMutation.mutate(product.id)}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
              >
                Копия
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
          {products.length === 0 && <p className="text-sm text-muted-foreground">Товары не найдены.</p>}
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
