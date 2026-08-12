import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "tulip-cart-v1";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: items.reduce((sum, item) => sum + item.qty * item.price, 0),
      add: (item, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((entry) => entry.productId === item.productId);
          if (existing) {
            return prev.map((entry) =>
              entry.productId === item.productId ? { ...entry, qty: entry.qty + qty } : entry,
            );
          }
          return [...prev, { ...item, qty }];
        }),
      setQty: (productId, qty) =>
        setItems((prev) =>
          prev
            .map((entry) => (entry.productId === productId ? { ...entry, qty: Math.max(0, qty) } : entry))
            .filter((entry) => entry.qty > 0),
        ),
      remove: (productId) => setItems((prev) => prev.filter((entry) => entry.productId !== productId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
