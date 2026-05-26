import { createContext, useContext, useState, type ReactNode } from "react";

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add: CartCtx["add"] = (item, qty = 1) => {
    setItems((curr) => {
      const ex = curr.find((i) => i.product_id === item.product_id);
      if (ex) return curr.map((i) => i.product_id === item.product_id ? { ...i, quantity: i.quantity + qty } : i);
      return [...curr, { ...item, quantity: qty }];
    });
  };
  const remove = (id: string) => setItems((c) => c.filter((i) => i.product_id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((c) => c.map((i) => i.product_id === id ? { ...i, quantity: Math.max(1, qty) } : i));
  const clear = () => setItems([]);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, total, count }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
};
