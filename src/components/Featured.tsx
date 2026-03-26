import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/7b024c21-5cd0-4f27-b3e7-6fd2f6449619";

const TABS = ["Ассортимент", "Доставка", "Поддержка", "Профиль"] as const;
type Tab = typeof TABS[number];

const delivery = [
  { title: "Курьер по городу", desc: "Доставка в день заказа при оформлении до 16:00. Бесплатно от 2 000 ₽.", icon: "Bike" },
  { title: "СДЭК / Почта России", desc: "Доставка по всей России. Срок 1–7 дней в зависимости от региона.", icon: "Package" },
  { title: "Самовывоз", desc: "Забери заказ в нашем магазине без ожидания. Адрес в Telegram.", icon: "MapPin" },
  { title: "Оплата", desc: "Наличные, карта, СБП, перевод на карту. Оплата при получении.", icon: "CreditCard" },
];

const support = [
  { title: "Telegram-чат", desc: "Ответим в течение 15 минут с 9:00 до 23:00 ежедневно.", icon: "Send" },
  { title: "Подбор устройства", desc: "Поможем выбрать вейп под ваш стиль, вкус и бюджет. Бесплатно.", icon: "Search" },
  { title: "Гарантия", desc: "14 дней на возврат. Гарантийный ремонт на все pod-системы.", icon: "ShieldCheck" },
  { title: "FAQ", desc: "Ответы на частые вопросы: как заправить, как обслуживать, что выбрать.", icon: "HelpCircle" },
];

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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  active: boolean;
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

// ─── Ассортимент с корзиной ──────────────────────────────────────────────────
function CatalogTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_products" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setProducts(d.products.filter((p: Product) => p.active));
      })
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === p.id);
      if (existing) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));

  const changeQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("tg_session");
    if (!token) { setOrderError("Войдите через Telegram для оформления заказа"); return; }
    setOrdering(true);
    setOrderError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({
          action: "create_order",
          items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
          address,
          note,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка");
      setOrderDone(true);
      setCart([]);
      setTimeout(() => { setOrderOpen(false); setOrderDone(false); setAddress(""); setNote(""); }, 3000);
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setOrdering(false);
    }
  };

  const categories = [...new Set(products.map((p) => p.category))];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Icon name="Loader" size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Корзина (плашка) */}
      {cart.length > 0 && !orderOpen && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon name="ShoppingCart" size={20} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              {cartCount} товар(а) · {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            onClick={() => setOrderOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors"
          >
            Оформить заказ
          </button>
        </div>
      )}

      {/* Форма заказа */}
      {orderOpen && (
        <div className="mb-8 border border-purple-200 p-6 bg-purple-50">
          <h4 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Icon name="ShoppingBag" size={20} className="text-purple-600" />
            Оформление заказа
          </h4>

          {orderDone ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Icon name="CheckCircle" size={48} className="text-green-500" />
              <p className="text-green-700 font-semibold text-lg">Заказ оформлен!</p>
              <p className="text-neutral-500 text-sm">Мы уведомим вас в Telegram о статусе доставки.</p>
            </div>
          ) : (
            <form onSubmit={handleOrder} className="flex flex-col gap-4">
              {/* Состав */}
              <div className="flex flex-col gap-2">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-white border border-neutral-100 px-4 py-2">
                    <span className="flex-1 text-sm text-neutral-800">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => changeQty(c.id, -1)} className="w-6 h-6 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100">−</button>
                      <span className="text-sm w-5 text-center">{c.qty}</span>
                      <button type="button" onClick={() => changeQty(c.id, 1)} className="w-6 h-6 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100">+</button>
                    </div>
                    <span className="text-sm font-semibold text-neutral-800 w-20 text-right">{(c.price * c.qty).toLocaleString("ru-RU")} ₽</span>
                    <button type="button" onClick={() => removeFromCart(c.id)} className="text-neutral-300 hover:text-red-400 transition-colors">
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
                <div className="text-right text-sm font-bold text-neutral-900 pr-2">Итого: {total.toLocaleString("ru-RU")} ₽</div>
              </div>

              {/* Адрес */}
              <input
                type="text"
                placeholder="Адрес доставки (улица, дом, квартира)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors bg-white"
              />
              <input
                type="text"
                placeholder="Комментарий к заказу (необязательно)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors bg-white"
              />

              {orderError && <p className="text-red-500 text-sm">{orderError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={ordering}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 uppercase tracking-wide text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {ordering && <Icon name="Loader" size={14} className="animate-spin" />}
                  {ordering ? "Отправляем..." : "Подтвердить заказ"}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderOpen(false)}
                  className="px-4 py-3 border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Назад
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Каталог по категориям */}
      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h4 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">{cat}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.filter((p) => p.category === cat).map((p) => (
              <div key={p.id} className="border border-neutral-100 p-5 hover:border-purple-300 hover:shadow-sm transition-all duration-300 group flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-50 group-hover:bg-purple-100 p-3 transition-colors duration-300 shrink-0">
                    <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={20} className="text-purple-600" fallback="Package" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-neutral-900 text-sm mb-1">{p.name}</h5>
                    <p className="text-neutral-500 text-xs leading-relaxed">{p.description}</p>
                  </div>
                  <span className="text-purple-600 font-bold text-sm shrink-0">{p.price.toLocaleString("ru-RU")} ₽</span>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  className="w-full bg-neutral-900 hover:bg-purple-600 text-white py-2 text-xs uppercase tracking-wide transition-colors duration-300"
                >
                  В корзину
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Панель администратора ────────────────────────────────────────────────────
function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string; first_name?: string; position: string }[]>([]);
  const [tab, setTab] = useState<"products" | "users" | "orders">("products");
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

  // Форма добавления товара
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", category: "", icon: "Package" });
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg("");
    const res = await api({ action: "add_product", ...newProduct, price: Number(newProduct.price) });
    if (res.ok) {
      setAddMsg("✅ Товар добавлен");
      setNewProduct({ name: "", description: "", price: "", category: "", icon: "Package" });
      load();
    } else {
      setAddMsg(`❌ ${res.error}`);
    }
    setAddLoading(false);
  };

  // Изменение цены
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleUpdatePrice = async (id: number) => {
    await api({ action: "update_product", id, price: Number(editPrice) });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    await api({ action: "delete_product", id });
    load();
  };

  // Назначение должности
  const [posUsername, setPosUsername] = useState("");
  const [posPosition, setPosPosition] = useState("courier");
  const [posMsg, setPosMsg] = useState("");

  const handleSetPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api({ action: "set_position", username: posUsername, position: posPosition });
    if (res.ok) {
      setPosMsg(`✅ @${res.username} — ${POSITION_LABELS[posPosition] || posPosition}`);
      setPosUsername("");
      load();
    } else {
      setPosMsg(`❌ ${res.error}`);
    }
  };

  const handleComplete = async (orderId: number) => {
    await api({ action: "complete_order", order_id: orderId });
    load();
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Icon name="Loader" size={28} className="animate-spin text-green-500" /></div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-full"><Icon name="ShieldCheck" size={22} className="text-green-600" /></div>
        <h3 className="text-xl font-bold text-green-600">Панель администратора</h3>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-100">
        {(["products", "users", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm uppercase tracking-wide border-b-2 -mb-[2px] transition-colors ${
              tab === t ? "border-green-500 text-green-600 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            {t === "products" ? "Товары" : t === "users" ? "Сотрудники" : "Заказы"}
          </button>
        ))}
      </div>

      {/* Товары */}
      {tab === "products" && (
        <div className="flex flex-col gap-6">
          {/* Добавить */}
          <form onSubmit={handleAddProduct} className="border border-green-100 p-5 bg-green-50 flex flex-col gap-3">
            <h4 className="font-semibold text-green-800 text-sm uppercase tracking-wide">Добавить товар</h4>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Название" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              <input required placeholder="Цена ₽" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              <input placeholder="Категория" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
              <input placeholder="Иконка (Package, Zap...)" value={newProduct.icon} onChange={(e) => setNewProduct({ ...newProduct, icon: e.target.value })}
                className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
            </div>
            <input placeholder="Описание" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-400" />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={addLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors">
                {addLoading ? "Добавляем..." : "Добавить"}
              </button>
              {addMsg && <span className="text-sm text-neutral-600">{addMsg}</span>}
            </div>
          </form>

          {/* Список */}
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className={`border px-4 py-3 flex items-center gap-3 ${p.active ? "border-neutral-100" : "border-red-100 bg-red-50 opacity-60"}`}>
                <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-neutral-400" fallback="Package" />
                <span className="flex-1 text-sm text-neutral-800 font-medium">{p.name}</span>
                <span className="text-xs text-neutral-400">{p.category}</span>

                {editingId === p.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                      className="border border-neutral-200 px-2 py-1 text-sm w-24 focus:outline-none" autoFocus />
                    <button onClick={() => handleUpdatePrice(p.id)} className="text-green-600 text-xs font-medium hover:underline">Сохранить</button>
                    <button onClick={() => setEditingId(null)} className="text-neutral-400 text-xs hover:underline">Отмена</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(p.id); setEditPrice(String(p.price)); }}
                    className="text-sm font-bold text-purple-600 hover:underline">{p.price.toLocaleString("ru-RU")} ₽</button>
                )}

                {p.active && (
                  <button onClick={() => handleDelete(p.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Сотрудники */}
      {tab === "users" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={handleSetPosition} className="border border-green-100 p-5 bg-green-50 flex flex-col gap-3">
            <h4 className="font-semibold text-green-800 text-sm uppercase tracking-wide">Назначить должность</h4>
            <div className="flex gap-3">
              <input required placeholder="@username" value={posUsername} onChange={(e) => setPosUsername(e.target.value)}
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

      {/* Заказы */}
      {tab === "orders" && (
        <div className="flex flex-col gap-3">
          {allOrders.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-8">Заказов ещё нет</p>
          )}
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
                  <button
                    onClick={() => handleComplete(o.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs uppercase tracking-wide transition-colors"
                  >
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

// ─── Панель курьера ───────────────────────────────────────────────────────────
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
                <button
                  onClick={() => handleComplete(o.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors flex items-center gap-2"
                >
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

// ─── Профиль ──────────────────────────────────────────────────────────────────
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
        if (avatarData.ok && avatarData.avatar_url) {
          setAvatarUrl(avatarData.avatar_url);
          localStorage.setItem("tg_avatar", avatarData.avatar_url);
        }
      })
      .catch(() => setError("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center py-20"><Icon name="Loader" size={32} className="animate-spin text-purple-600" /></div>;

  if (error === "not_logged_in") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="bg-purple-50 p-6 rounded-full"><Icon name="UserX" size={48} className="text-purple-300" /></div>
        <h3 className="text-xl font-semibold text-neutral-900">Вы не авторизованы</h3>
        <p className="text-neutral-500 text-sm text-center max-w-sm">Войдите через Telegram, чтобы видеть информацию о своём профиле и заказах.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Icon name="AlertCircle" size={40} className="text-red-400" />
        <p className="text-neutral-500 text-sm">{error}</p>
      </div>
    );
  }

  const registeredDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const isAdmin = profile?.position === "admin";
  const isCourier = profile?.position === "courier";

  return (
    <div className="max-w-2xl">
      {/* Аватар и имя */}
      <div className="flex items-center gap-5 mb-10">
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

      {/* Admin/Courier panels */}
      {isAdmin && <AdminPanel />}
      {isCourier && !isAdmin && <CourierPanel />}

      {!isAdmin && !isCourier && (
        <>
          {/* Статистика */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="border border-neutral-100 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="CalendarDays" size={20} className="text-purple-500" />
                <span className="text-sm text-neutral-500 uppercase tracking-wide">Дата регистрации</span>
              </div>
              <p className="text-lg font-semibold text-neutral-900">{registeredDate}</p>
            </div>
            <div className="border border-neutral-100 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="ShoppingBag" size={20} className="text-purple-500" />
                <span className="text-sm text-neutral-500 uppercase tracking-wide">Доставлено заказов</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{profile?.orders_count ?? 0}</p>
            </div>
          </div>

          {/* История заказов */}
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
                      <button
                        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : order.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-neutral-700">Заказ #{order.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-sm text-neutral-400">{date}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-neutral-900">{order.total ? `${order.total.toLocaleString("ru-RU")} ₽` : "—"}</p>
                        </div>
                        <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={18} className="text-neutral-400 shrink-0" />
                      </button>
                      {isOpen && (
                        <div className="border-t border-neutral-100 px-5 py-4 bg-neutral-50">
                          {order.address && (
                            <p className="text-xs text-neutral-500 flex items-center gap-1 mb-3">
                              <Icon name="MapPin" size={12} className="text-neutral-400" /> {order.address}
                            </p>
                          )}
                          {order.items && order.items.length > 0 ? (
                            <div className="flex flex-col gap-2 mb-3">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-neutral-700">{item.name} × {item.qty}</span>
                                  <span className="text-neutral-500">{(item.price * item.qty).toLocaleString("ru-RU")} ₽</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-neutral-400 mb-3">Состав заказа не указан</p>
                          )}
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

// ─── Главный компонент ────────────────────────────────────────────────────────
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

  const staticItems = activeTab === "Доставка" ? delivery : support;

  return (
    <div id="catalog" className="min-h-screen bg-white px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <h3 className="uppercase mb-4 text-sm tracking-widest text-neutral-500">Всё, что нужно</h3>
        <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-12 leading-tight">
          Вейп-культура<br />без компромиссов
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-neutral-200 items-center flex-wrap">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mr-2 text-neutral-400 hover:text-purple-600 transition-colors duration-300 pb-2"
            title="На главную"
          >
            <Icon name="ArrowLeft" size={20} />
          </button>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              id={tab === "Доставка" ? "delivery" : tab === "Поддержка" ? "support" : undefined}
              className={`px-6 py-3 text-sm uppercase tracking-wide transition-colors duration-300 border-b-2 -mb-[2px] flex items-center gap-2 ${
                activeTab === tab
                  ? "border-purple-600 text-purple-600 font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab === "Профиль" && <Icon name="User" size={14} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "Ассортимент" && <CatalogTab />}
        {activeTab === "Профиль" && <ProfileTab />}
        {(activeTab === "Доставка" || activeTab === "Поддержка") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {staticItems.map((item) => (
              <div
                key={item.title}
                className="border border-neutral-100 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-purple-50 group-hover:bg-purple-100 p-3 transition-colors duration-300">
                    <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={22} className="text-purple-600" fallback="Package" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-900 mb-1">{item.title}</h4>
                    <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
