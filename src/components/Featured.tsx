import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/7b024c21-5cd0-4f27-b3e7-6fd2f6449619";

const TABS = ["Ассортимент", "Доставка", "Поддержка", "Профиль"] as const;
type Tab = typeof TABS[number];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: "Новый",       color: "bg-blue-50 text-blue-600" },
  confirmed: { label: "Подтверждён", color: "bg-indigo-50 text-indigo-600" },
  delivery:  { label: "В доставке",  color: "bg-amber-50 text-amber-600" },
  done:      { label: "Выполнен",    color: "bg-green-50 text-green-600" },
  cancelled: { label: "Отменён",     color: "bg-red-50 text-red-600" },
};

const POSITION_LABELS: Record<string, string> = {
  admin: "Администратор",
  courier: "Курьер",
  client: "",
};

interface SectionItem { title: string; desc: string; icon: string }
interface Section { title: string; content: SectionItem[] }

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  active: boolean;
  brand?: string;
  image_url?: string;
  sort_order: number;
}

interface CartItem extends Product { qty: number }

interface OrderItem { name: string; qty: number; price: number }
interface Order {
  id: number;
  status: string;
  total: number;
  items: OrderItem[];
  note?: string;
  created_at: string;
  address?: string;
  username?: string;
  first_name?: string;
}

interface ProfileData {
  username: string;
  first_name?: string;
  created_at: string;
  orders_count: number;
  position: string;
}

// ── Утилита: читаем файл как base64 ────────────────────────────────────────
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Секция (Доставка / Поддержка) ─────────────────────────────────────────
function StaticSection({ sectionKey }: { sectionKey: string }) {
  const [items, setItems] = useState<SectionItem[]>([]);

  useEffect(() => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_sections" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.sections[sectionKey]) {
          setItems(d.sections[sectionKey].content || []);
        }
      });
  }, [sectionKey]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item, i) => (
        <div key={i} className="border border-neutral-100 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-start gap-4">
            <div className="bg-purple-50 group-hover:bg-purple-100 p-3 transition-colors duration-300">
              <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={22} className="text-purple-600" fallback="Info" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-900 mb-1">{item.title}</h4>
              <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Боковая панель корзины ────────────────────────────────────────────────
interface CartDrawerProps {
  cart: CartItem[];
  onChangeQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onClose: () => void;
  onOrderSuccess: () => void;
}

function CartDrawer({ cart, onChangeQty, onRemove, onClose, onOrderSuccess }: CartDrawerProps) {
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState("");

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("tg_session");
    if (!token) { setOrderError("Войдите через Telegram для оформления заказа"); return; }
    setOrdering(true); setOrderError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "create_order",
          items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
          address, note,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка");
      setOrderDone(true);
      setTimeout(() => { onOrderSuccess(); }, 2500);
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Icon name="ShoppingCart" size={20} className="text-purple-600" />
            <span className="font-bold text-neutral-900">Корзина</span>
            <span className="bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors touch-manipulation p-1">
            <Icon name="X" size={20} />
          </button>
        </div>

        {orderDone ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
            <Icon name="CheckCircle" size={56} className="text-green-500" />
            <p className="text-green-700 font-bold text-xl">Заказ оформлен!</p>
            <p className="text-neutral-500 text-sm text-center">Мы уведомим вас в Telegram о статусе доставки.</p>
          </div>
        ) : (
          <>
            {/* Список товаров */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-neutral-400">
                  <Icon name="ShoppingCart" size={36} className="text-neutral-200" />
                  <span className="text-sm">Корзина пуста</span>
                </div>
              )}
              {cart.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border border-neutral-100 p-3">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-14 h-14 object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-purple-50 flex items-center justify-center shrink-0">
                      <Icon name={c.icon as Parameters<typeof Icon>[0]["name"]} size={24} className="text-purple-300" fallback="Package" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{c.name}</p>
                    <p className="text-purple-600 font-bold text-sm">{(c.price * c.qty).toLocaleString("ru-RU")} ₽</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onChangeQty(c.id, -1)} className="w-9 h-9 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 touch-manipulation text-base">−</button>
                    <span className="text-sm w-6 text-center font-medium">{c.qty}</span>
                    <button onClick={() => onChangeQty(c.id, 1)} className="w-9 h-9 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 touch-manipulation text-base">+</button>
                    <button onClick={() => onRemove(c.id)} className="ml-1 w-9 h-9 flex items-center justify-center text-neutral-300 hover:text-red-400 transition-colors touch-manipulation">
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Форма и итог */}
            {cart.length > 0 && (
              <form onSubmit={handleOrder} className="border-t border-neutral-100 px-5 py-4 flex flex-col gap-3 bg-white">
                <div className="flex justify-between text-sm font-bold text-neutral-900">
                  <span>Итого</span>
                  <span className="text-purple-600">{total.toLocaleString("ru-RU")} ₽</span>
                </div>
                <input type="text" placeholder="Адрес доставки *" value={address}
                  onChange={(e) => setAddress(e.target.value)} required
                  className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                <input type="text" placeholder="Комментарий к заказу" value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                {orderError && <p className="text-red-500 text-xs">{orderError}</p>}
                <button type="submit" disabled={ordering}
                  className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white py-3.5 uppercase tracking-wide text-sm font-semibold transition-colors flex items-center justify-center gap-2 touch-manipulation">
                  {ordering && <Icon name="Loader" size={14} className="animate-spin" />}
                  {ordering ? "Оформляем..." : `Оформить заказ · ${total.toLocaleString("ru-RU")} ₽`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Ассортимент с корзиной ───────────────────────────────────────────────
function CatalogTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filterBrand, setFilterBrand] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const loadProducts = () => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_products" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setProducts(d.products.filter((p: Product) => p.active)); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === p.id);
      if (ex) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));
  const changeQty = (id: number, delta: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const handleCartClose = () => setCartOpen(false);
  const handleOrderSuccess = () => { setCart([]); setCartOpen(false); };

  const categories = [...new Set(products.map((p) => p.category))].filter(Boolean);
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[];

  const filtered = products.filter((p) =>
    (!filterCat || p.category === filterCat) &&
    (!filterBrand || p.brand === filterBrand)
  );

  const grouped: Record<string, Record<string, Product[]>> = {};
  for (const p of filtered) {
    const cat = p.category || "Прочее";
    const br = p.brand || "";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][br]) grouped[cat][br] = [];
    grouped[cat][br].push(p);
  }

  if (loading) return <div className="flex justify-center py-20"><Icon name="Loader" size={32} className="animate-spin text-purple-600" /></div>;

  return (
    <div className="pb-28">
      {/* Drawer корзины */}
      {cartOpen && (
        <CartDrawer cart={cart} onChangeQty={changeQty} onRemove={removeFromCart} onClose={handleCartClose} onOrderSuccess={handleOrderSuccess} />
      )}

      {/* FAB — плавающая кнопка корзины */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-4 z-30 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-2xl flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3.5 transition-all duration-200 touch-manipulation rounded-sm"
        >
          <Icon name="ShoppingCart" size={18} />
          <span className="font-bold text-sm">{total.toLocaleString("ru-RU")} ₽</span>
          <span className="bg-white text-purple-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
            {cartCount}
          </span>
        </button>
      )}

      {/* Фильтры — горизонтальный скролл на мобильных */}
      {(categories.length > 1 || brands.length > 0) && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button onClick={() => { setFilterCat(null); setFilterBrand(null); }}
            className={`shrink-0 px-3 py-2 text-xs uppercase tracking-wide border transition-colors touch-manipulation ${!filterCat && !filterBrand ? "bg-purple-600 text-white border-purple-600" : "border-neutral-200 text-neutral-500 hover:border-purple-400"}`}>
            Все
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => { setFilterCat(filterCat === c ? null : c); setFilterBrand(null); }}
              className={`shrink-0 px-3 py-2 text-xs uppercase tracking-wide border transition-colors touch-manipulation ${filterCat === c ? "bg-purple-600 text-white border-purple-600" : "border-neutral-200 text-neutral-500 hover:border-purple-400"}`}>
              {c}
            </button>
          ))}
          {brands.map((b) => (
            <button key={b} onClick={() => { setFilterBrand(filterBrand === b ? null : b); setFilterCat(null); }}
              className={`shrink-0 px-3 py-2 text-xs tracking-wide border transition-colors touch-manipulation ${filterBrand === b ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"}`}>
              {b}
            </button>
          ))}
        </div>
      )}

      {/* Каталог: категория → бренд → карточки */}
      {Object.entries(grouped).map(([cat, brandMap]) => (
        <div key={cat} className="mb-10">
          <h4 className="text-xs uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
            <span className="flex-1 h-px bg-neutral-100" />
            {cat}
            <span className="flex-1 h-px bg-neutral-100" />
          </h4>
          {Object.entries(brandMap).map(([brand, prods]) => (
            <div key={brand} className="mb-6">
              {brand && (
                <p className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-2">
                  <Icon name="Tag" size={14} className="text-purple-400" />
                  {brand}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {prods.map((p) => (
                  <div key={p.id} className="border border-neutral-100 hover:border-purple-300 hover:shadow-sm transition-all duration-300 group flex flex-col overflow-hidden">
                    {p.image_url ? (
                      <div className="w-full h-32 sm:h-40 overflow-hidden bg-neutral-50">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="w-full h-24 sm:h-32 bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors duration-300">
                        <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={32} className="text-purple-300" fallback="Package" />
                      </div>
                    )}
                    <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <h5 className="font-semibold text-neutral-900 text-xs sm:text-sm leading-tight line-clamp-2">{p.name}</h5>
                        <span className="text-purple-600 font-bold text-sm">{p.price.toLocaleString("ru-RU")} ₽</span>
                      </div>
                      <p className="text-neutral-500 text-xs leading-relaxed flex-1 line-clamp-2 hidden sm:block">{p.description}</p>
                      <button onClick={() => addToCart(p)}
                        className="mt-auto w-full bg-neutral-900 hover:bg-purple-600 active:bg-purple-700 text-white py-2.5 text-xs uppercase tracking-wide transition-colors duration-300 touch-manipulation">
                        В корзину
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-neutral-400 text-sm">Товары не найдены</div>
      )}
    </div>
  );
}

// ── Редактор карточек раздела (Доставка/Поддержка) ─────────────────────────
function SectionEditor({ sectionKey, title }: { sectionKey: string; title: string }) {
  const [items, setItems] = useState<SectionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const token = localStorage.getItem("tg_session") || "";

  useEffect(() => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_sections" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.sections[sectionKey]) setItems(d.sections[sectionKey].content || []); });
  }, [sectionKey]);

  const updateItem = (i: number, field: keyof SectionItem, value: string) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems((prev) => [...prev, { title: "", desc: "", icon: "Info" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action: "update_section", section_key: sectionKey, title, content: items }),
    }).then((r) => r.json());
    setMsg(res.ok ? "✅ Сохранено" : `❌ ${res.error}`);
    setSaving(false);
  };

  return (
    <div className="border border-green-100 p-5 bg-green-50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-green-800 text-sm uppercase tracking-wide">{title}</h5>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
          <button onClick={save} disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs uppercase tracking-wide transition-colors">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white border border-neutral-100 p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input placeholder="Заголовок" value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)}
                className="flex-1 border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none focus:border-green-400" />
              <input placeholder="Иконка" value={item.icon} onChange={(e) => updateItem(i, 'icon', e.target.value)}
                className="w-28 border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none focus:border-green-400" />
              <button onClick={() => removeItem(i)} className="text-neutral-300 hover:text-red-400 transition-colors px-1">
                <Icon name="X" size={16} />
              </button>
            </div>
            <textarea placeholder="Описание" value={item.desc} onChange={(e) => updateItem(i, 'desc', e.target.value)}
              rows={2}
              className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none focus:border-green-400 resize-none" />
          </div>
        ))}
        <button onClick={addItem}
          className="flex items-center gap-2 text-green-600 text-sm hover:text-green-800 transition-colors">
          <Icon name="Plus" size={16} /> Добавить карточку
        </button>
      </div>
    </div>
  );
}

// ── Панель администратора ─────────────────────────────────────────────────
function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string; first_name?: string; position: string }[]>([]);
  const [tab, setTab] = useState<"products" | "users" | "orders" | "sections">("products");
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const token = localStorage.getItem("tg_session") || "";

  const api = (body: object) =>
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  const load = () => {
    setLoading(true);
    Promise.all([api({ action: "get_products" }), api({ action: "get_users" }), api({ action: "all_orders" })])
      .then(([pd, ud, od]) => {
        if (pd.ok) setProducts(pd.products);
        if (ud.ok) setUsers(ud.users);
        if (od.ok) setAllOrders(od.orders);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Форма добавления товара
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", category: "", icon: "Package", brand: "", sort_order: "0",
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const newFileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = (file: File | null, setPreview: (s: string | null) => void, setFile: (f: File | null) => void) => {
    if (!file) { setFile(null); setPreview(null); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true); setAddMsg("");
    const payload: Record<string, unknown> = { action: "add_product", ...newProduct, price: Number(newProduct.price), sort_order: Number(newProduct.sort_order) };
    if (newImageFile) {
      payload.image_b64 = await readFileAsBase64(newImageFile);
      payload.image_mime = newImageFile.type;
    }
    const res = await api(payload);
    if (res.ok) {
      setAddMsg("✅ Товар добавлен");
      setNewProduct({ name: "", description: "", price: "", category: "", icon: "Package", brand: "", sort_order: "0" });
      setNewImageFile(null); setNewImagePreview(null);
      if (newFileRef.current) newFileRef.current.value = "";
      load();
    } else {
      setAddMsg(`❌ ${res.error}`);
    }
    setAddLoading(false);
  };

  // ── Inline-редактирование товара
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<Product & { image_b64?: string; image_mime?: string }>>({});
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditFields({ name: p.name, price: p.price, description: p.description, category: p.category, brand: p.brand || "", icon: p.icon, sort_order: p.sort_order });
    setEditImagePreview(p.image_url || null);
  };

  const saveEdit = async (id: number) => {
    setEditSaving(true);
    const payload: Record<string, unknown> = { action: "update_product", id, ...editFields };
    await api(payload);
    setEditingId(null); setEditSaving(false); setEditImagePreview(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Скрыть товар?")) return;
    await api({ action: "delete_product", id });
    load();
  };

  const handleRestore = async (id: number) => {
    await api({ action: "restore_product", id });
    load();
  };

  // ── Сотрудники
  const [posUsername, setPosUsername] = useState("");
  const [posPosition, setPosPosition] = useState("courier");
  const [posMsg, setPosMsg] = useState("");

  const handleSetPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api({ action: "set_position", username: posUsername, position: posPosition });
    if (res.ok) { setPosMsg(`✅ @${res.username} — ${POSITION_LABELS[posPosition] || posPosition}`); setPosUsername(""); load(); }
    else setPosMsg(`❌ ${res.error}`);
  };

  const handleComplete = async (orderId: number) => {
    await api({ action: "complete_order", order_id: orderId });
    load();
  };

  // Уникальные категории из существующих товаров
  const existingCats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const existingBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[];

  if (loading) return <div className="flex justify-center py-12"><Icon name="Loader" size={28} className="animate-spin text-green-500" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-full"><Icon name="ShieldCheck" size={22} className="text-green-600" /></div>
        <h3 className="text-xl font-bold text-green-600">Панель администратора</h3>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-100 overflow-x-auto">
        {(["products", "sections", "users", "orders"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm uppercase tracking-wide border-b-2 -mb-[2px] whitespace-nowrap transition-colors ${
              tab === t ? "border-green-500 text-green-600 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-700"}`}>
            {t === "products" ? "Товары" : t === "sections" ? "Разделы" : t === "users" ? "Сотрудники" : "Заказы"}
          </button>
        ))}
      </div>

      {/* ── Товары ── */}
      {tab === "products" && (
        <div className="flex flex-col gap-6">
          {/* Добавить товар */}
          <form onSubmit={handleAddProduct} className="border border-green-100 p-4 sm:p-5 bg-green-50 flex flex-col gap-3">
            <h4 className="font-semibold text-green-800 text-sm uppercase tracking-wide">Добавить товар</h4>
            <div className="flex flex-col gap-2">
              <input required placeholder="Название" value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Цена ₽" type="number" value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
                <input placeholder="Порядок" type="number" value={newProduct.sort_order}
                  onChange={(e) => setNewProduct({ ...newProduct, sort_order: e.target.value })}
                  className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input list="cats-list" placeholder="Категория" value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
                  <datalist id="cats-list">{existingCats.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <input list="brands-list" placeholder="Бренд" value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
                  <datalist id="brands-list">{existingBrands.map((b) => <option key={b} value={b} />)}</datalist>
                </div>
              </div>
              <input placeholder="Иконка (Package, Zap, Wind...)" value={newProduct.icon}
                onChange={(e) => setNewProduct({ ...newProduct, icon: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
            </div>
            <textarea placeholder="Описание" value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              rows={2}
              className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400 resize-none" />

            {/* Загрузка фото */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-neutral-200 px-3 py-2 text-sm hover:border-green-400 transition-colors">
                <Icon name="Image" size={14} className="text-neutral-400" />
                Фото товара
                <input ref={newFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleImagePick(e.target.files?.[0] || null, setNewImagePreview, setNewImageFile)} />
              </label>
              {newImagePreview && (
                <div className="relative">
                  <img src={newImagePreview} alt="preview" className="w-16 h-16 object-cover border border-neutral-200" />
                  <button type="button" onClick={() => { setNewImageFile(null); setNewImagePreview(null); if (newFileRef.current) newFileRef.current.value = ""; }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={addLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors">
                {addLoading ? "Добавляем..." : "Добавить"}
              </button>
              {addMsg && <span className="text-sm text-neutral-600">{addMsg}</span>}
            </div>
          </form>

          {/* Список товаров */}
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className={`border overflow-hidden ${p.active ? "border-neutral-100" : "border-red-100 opacity-60"}`}>
                {editingId === p.id ? (
                  <div className="p-4 bg-neutral-50 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editFields.name || ""} onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                        placeholder="Название" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none col-span-2" />
                      <input type="number" value={editFields.price || ""} onChange={(e) => setEditFields({ ...editFields, price: Number(e.target.value) })}
                        placeholder="Цена" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none" />
                      <input type="number" value={editFields.sort_order ?? ""} onChange={(e) => setEditFields({ ...editFields, sort_order: Number(e.target.value) })}
                        placeholder="Порядок" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none" />
                      <input list="cats-list-edit" value={editFields.category || ""} onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                        placeholder="Категория" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none" />
                      <datalist id="cats-list-edit">{existingCats.map((c) => <option key={c} value={c} />)}</datalist>
                      <input list="brands-list-edit" value={editFields.brand || ""} onChange={(e) => setEditFields({ ...editFields, brand: e.target.value })}
                        placeholder="Бренд" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none" />
                      <datalist id="brands-list-edit">{existingBrands.map((b) => <option key={b} value={b} />)}</datalist>
                      <input value={editFields.icon || ""} onChange={(e) => setEditFields({ ...editFields, icon: e.target.value })}
                        placeholder="Иконка" className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <textarea value={editFields.description || ""} onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      placeholder="Описание" rows={2} className="border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none resize-none" />

                    {/* Загрузка фото при редактировании */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-neutral-200 px-3 py-1.5 text-sm hover:border-green-400 transition-colors">
                        <Icon name="Image" size={14} className="text-neutral-400" />
                        {editImagePreview ? "Заменить фото" : "Добавить фото"}
                        <input ref={editFileRef} type="file" accept="image/*" className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const b64 = await readFileAsBase64(file);
                            setEditFields({ ...editFields, image_b64: b64, image_mime: file.type });
                            const reader = new FileReader();
                            reader.onload = (ev) => setEditImagePreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }} />
                      </label>
                      {editImagePreview && <img src={editImagePreview} alt="preview" className="w-14 h-14 object-cover border border-neutral-200" />}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(p.id)} disabled={editSaving}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs uppercase tracking-wide transition-colors disabled:opacity-50">
                        {editSaving ? "Сохраняем..." : "Сохранить"}
                      </button>
                      <button onClick={() => { setEditingId(null); setEditImagePreview(null); }}
                        className="px-3 py-1.5 border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-100 transition-colors">
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center rounded shrink-0">
                        <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-neutral-400" fallback="Package" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-neutral-800 font-medium">{p.name}</span>
                      {(p.brand || p.category) && (
                        <p className="text-xs text-neutral-400">{[p.brand, p.category].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-purple-600 shrink-0">{p.price.toLocaleString("ru-RU")} ₽</span>
                    <button onClick={() => startEdit(p)} className="text-neutral-400 hover:text-neutral-700 transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    {p.active ? (
                      <button onClick={() => handleDelete(p.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                        <Icon name="Trash2" size={15} />
                      </button>
                    ) : (
                      <button onClick={() => handleRestore(p.id)} className="text-neutral-300 hover:text-green-500 transition-colors" title="Восстановить">
                        <Icon name="RotateCcw" size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Разделы ── */}
      {tab === "sections" && (
        <div>
          <p className="text-sm text-neutral-500 mb-4">Редактируйте карточки в разделах «Доставка» и «Поддержка». Иконки — названия из библиотеки Lucide (Bike, Package, MapPin...)</p>
          <SectionEditor sectionKey="delivery" title="Доставка" />
          <SectionEditor sectionKey="support" title="Поддержка" />
        </div>
      )}

      {/* ── Сотрудники ── */}
      {tab === "users" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={handleSetPosition} className="border border-green-100 p-4 sm:p-5 bg-green-50 flex flex-col gap-3">
            <h4 className="font-semibold text-green-800 text-sm uppercase tracking-wide">Назначить должность</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input required placeholder="@username" value={posUsername}
                onChange={(e) => setPosUsername(e.target.value)}
                className="flex-1 border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              <select value={posPosition} onChange={(e) => setPosPosition(e.target.value)}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400">
                <option value="admin">Администратор</option>
                <option value="courier">Курьер</option>
                <option value="client">Клиент</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors">
                Назначить
              </button>
              {posMsg && <span className="text-sm text-neutral-600">{posMsg}</span>}
            </div>
          </form>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="border border-neutral-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  {(u.first_name || u.username || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${u.position === "admin" ? "text-green-500" : u.position === "courier" ? "text-green-400" : "text-neutral-800"}`}>
                    {u.first_name || `@${u.username}`}
                  </span>
                  {u.username && <span className="text-neutral-400 text-xs ml-2">@{u.username}</span>}
                </div>
                {u.position !== "client" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.position === "admin" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {POSITION_LABELS[u.position]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Заказы ── */}
      {tab === "orders" && (
        <div className="flex flex-col gap-3">
          {allOrders.length === 0 && <p className="text-neutral-400 text-sm text-center py-8">Заказов ещё нет</p>}
          {allOrders.map((o) => {
            const st = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-neutral-100 text-neutral-600" };
            return (
              <div key={o.id} className="border border-neutral-100 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-neutral-900 text-sm">#{o.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  <span className="text-xs text-neutral-400 flex-1">{o.first_name || `@${o.username}`} · @{o.username}</span>
                  <span className="font-bold text-sm text-neutral-800">{o.total?.toLocaleString("ru-RU")} ₽</span>
                </div>
                {o.address && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mb-2">
                    <Icon name="MapPin" size={12} className="text-neutral-400" /> {o.address}
                  </p>
                )}
                <div className="flex flex-col gap-1 mb-3">
                  {(o.items || []).map((item, i) => (
                    <span key={i} className="text-xs text-neutral-600">• {item.name} × {item.qty} — {(item.price * item.qty).toLocaleString("ru-RU")} ₽</span>
                  ))}
                </div>
                {o.status !== "done" && o.status !== "cancelled" && (
                  <button onClick={() => handleComplete(o.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs uppercase tracking-wide transition-colors">
                    ✓ Завершить заказ
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Панель курьера ─────────────────────────────────────────────────────────
function CourierPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("tg_session") || "";

  const load = () => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action: "all_orders" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setOrders(d.orders.filter((o: Order) => o.status !== "done" && o.status !== "cancelled")); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleComplete = async (orderId: number) => {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action: "complete_order", order_id: orderId }),
    });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Icon name="Loader" size={28} className="animate-spin text-amber-500" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-100 p-2 rounded-full"><Icon name="Bike" size={22} className="text-amber-600" /></div>
        <h3 className="text-xl font-bold text-green-500">Панель курьера</h3>
      </div>
      {orders.length === 0 ? (
        <div className="border border-dashed border-neutral-200 p-10 text-center">
          <Icon name="CheckCircle" size={36} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400 text-sm">Активных заказов нет</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => {
            const st = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-neutral-100 text-neutral-600" };
            return (
              <div key={o.id} className="border border-amber-100 p-4 bg-amber-50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-neutral-900 text-sm">Заказ #{o.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  <span className="font-bold text-sm text-neutral-800 ml-auto">{o.total?.toLocaleString("ru-RU")} ₽</span>
                </div>
                {o.address && (
                  <p className="text-sm text-neutral-700 flex items-center gap-1 mb-2 font-medium">
                    <Icon name="MapPin" size={14} className="text-amber-500" /> {o.address}
                  </p>
                )}
                <p className="text-xs text-neutral-500 mb-3">Клиент: {o.first_name || `@${o.username}`}</p>
                <div className="flex flex-col gap-1 mb-3">
                  {(o.items || []).map((item, i) => (
                    <span key={i} className="text-xs text-neutral-600">• {item.name} × {item.qty}</span>
                  ))}
                </div>
                <button onClick={() => handleComplete(o.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} />
                  Доставлен — завершить
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Профиль ────────────────────────────────────────────────────────────────
function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(localStorage.getItem("tg_avatar"));

  useEffect(() => {
    const token = localStorage.getItem("tg_session");
    if (!token) { setError("not_logged_in"); setLoading(false); return; }
    Promise.all([
      fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": token }, body: JSON.stringify({ action: "profile" }) }).then((r) => r.json()),
      fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": token }, body: JSON.stringify({ action: "orders" }) }).then((r) => r.json()),
      fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Token": token }, body: JSON.stringify({ action: "get_avatar" }) }).then((r) => r.json()),
    ])
      .then(([profileData, ordersData, avatarData]) => {
        if (profileData.ok) setProfile(profileData.user);
        else setError(profileData.error || "Ошибка");
        if (ordersData.ok) setOrders(ordersData.orders);
        if (avatarData.ok && avatarData.avatar_url) { setAvatarUrl(avatarData.avatar_url); localStorage.setItem("tg_avatar", avatarData.avatar_url); }
      })
      .catch(() => setError("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center py-20"><Icon name="Loader" size={32} className="animate-spin text-purple-600" /></div>;

  if (error === "not_logged_in") return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="bg-purple-50 p-6 rounded-full"><Icon name="UserX" size={48} className="text-purple-300" /></div>
      <h3 className="text-xl font-semibold text-neutral-900">Вы не авторизованы</h3>
      <p className="text-neutral-500 text-sm text-center max-w-sm">Войдите через Telegram, чтобы видеть информацию о своём профиле и заказах.</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Icon name="AlertCircle" size={40} className="text-red-400" />
      <p className="text-neutral-500 text-sm">{error}</p>
    </div>
  );

  const isAdmin = profile?.position === "admin";
  const isCourier = profile?.position === "courier";
  const registeredDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="max-w-3xl">
      {/* Шапка профиля */}
      <div className="flex items-center gap-5 mb-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-20 h-20 object-cover rounded-full ring-4 ring-purple-100 shrink-0" />
        ) : (
          <div className="bg-purple-600 w-20 h-20 flex items-center justify-center text-white text-3xl font-bold shrink-0 rounded-full">
            {(profile?.first_name || profile?.username || "U")[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 className={`text-2xl font-bold ${isAdmin || isCourier ? "text-green-500" : "text-neutral-900"}`}>
            {profile?.first_name || `@${profile?.username}`}
          </h3>
          <p className="text-neutral-400 text-sm">@{profile?.username}</p>
          {(isAdmin || isCourier) && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${isAdmin ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {isAdmin ? "Администратор" : "Курьер"}
            </span>
          )}
        </div>
      </div>

      {isAdmin && <AdminPanel />}
      {isCourier && !isAdmin && <CourierPanel />}

      {!isAdmin && !isCourier && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 md:mb-10">
            <div className="border border-neutral-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="CalendarDays" size={18} className="text-purple-500" />
                <span className="text-xs sm:text-sm text-neutral-500 uppercase tracking-wide">Регистрация</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-neutral-900">{registeredDate}</p>
            </div>
            <div className="border border-neutral-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="ShoppingBag" size={18} className="text-purple-500" />
                <span className="text-xs sm:text-sm text-neutral-500 uppercase tracking-wide">Заказов</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{profile?.orders_count ?? 0}</p>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Icon name="ClipboardList" size={20} className="text-purple-500" />
              История заказов
            </h4>
            {orders.length === 0 ? (
              <div className="border border-dashed border-neutral-200 p-10 text-center">
                <Icon name="ShoppingCart" size={36} className="text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-400 text-sm">Заказов пока нет</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((order) => {
                  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-neutral-100 text-neutral-600" };
                  const date = new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
                  const isOpen = expandedId === order.id;
                  return (
                    <div key={order.id} className="border border-neutral-100 overflow-hidden">
                      <button className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : order.id)}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-neutral-700">Заказ #{order.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-sm text-neutral-400">{date}</p>
                        </div>
                        <p className="font-bold text-neutral-900 shrink-0">{order.total ? `${order.total.toLocaleString("ru-RU")} ₽` : "—"}</p>
                        <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={18} className="text-neutral-400 shrink-0" />
                      </button>
                      {isOpen && (
                        <div className="border-t border-neutral-100 px-5 py-4 bg-neutral-50">
                          {order.address && (
                            <p className="text-xs text-neutral-500 flex items-center gap-1 mb-3">
                              <Icon name="MapPin" size={12} className="text-neutral-400" /> {order.address}
                            </p>
                          )}
                          {order.items?.length > 0 ? (
                            <div className="flex flex-col gap-2 mb-3">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-neutral-700">{item.name} × {item.qty}</span>
                                  <span className="text-neutral-500">{(item.price * item.qty).toLocaleString("ru-RU")} ₽</span>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-neutral-400 mb-3">Состав не указан</p>}
                          {order.note && (
                            <p className="text-xs text-neutral-500 border-t border-neutral-200 pt-2 mt-2">
                              <span className="font-medium">Примечание:</span> {order.note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="border border-neutral-100 p-5 flex items-center gap-3 text-sm text-neutral-500">
        <Icon name="Shield" size={18} className="text-purple-400 shrink-0" />
        Ваши данные защищены и не передаются третьим лицам
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────
interface FeaturedProps {
  onRegisterOpenProfile?: (fn: () => void) => void;
}

export default function Featured({ onRegisterOpenProfile }: FeaturedProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Ассортимент");

  const openProfile = () => setActiveTab("Профиль");
  useEffect(() => {
    onRegisterOpenProfile?.(openProfile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="catalog" className="min-h-screen bg-white px-4 sm:px-6 py-14 sm:py-20">
      <div className="max-w-5xl mx-auto">
        <h3 className="uppercase mb-3 text-xs sm:text-sm tracking-widest text-neutral-500">Всё, что нужно</h3>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-neutral-900 mb-8 sm:mb-12 leading-tight">
          Вейп-культура<br />без компромиссов
        </h2>

        {/* Tabs — горизонтальный скролл на мобильных */}
        <div className="flex gap-1 mb-8 sm:mb-10 border-b border-neutral-200 items-center overflow-x-auto scrollbar-none -mx-1 px-1">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="shrink-0 mr-1 text-neutral-400 hover:text-purple-600 transition-colors duration-300 pb-2 p-2 touch-manipulation" title="На главную">
            <Icon name="ArrowLeft" size={18} />
          </button>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              id={tab === "Доставка" ? "delivery" : tab === "Поддержка" ? "support" : undefined}
              className={`shrink-0 px-3 sm:px-5 py-3 text-xs sm:text-sm uppercase tracking-wide transition-colors duration-300 border-b-2 -mb-[2px] flex items-center gap-1.5 touch-manipulation whitespace-nowrap ${
                activeTab === tab ? "border-purple-600 text-purple-600 font-semibold" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>
              {tab === "Профиль" && <Icon name="User" size={13} />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Ассортимент" && <CatalogTab />}
        {activeTab === "Доставка" && <StaticSection sectionKey="delivery" />}
        {activeTab === "Поддержка" && <StaticSection sectionKey="support" />}
        {activeTab === "Профиль" && <ProfileTab />}
      </div>
    </div>
  );
}