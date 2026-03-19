import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/7b024c21-5cd0-4f27-b3e7-6fd2f6449619";

const TABS = ["Ассортимент", "Доставка", "Поддержка", "Профиль"] as const;
type Tab = typeof TABS[number];

const catalog = [
  { name: "Одноразовые вейпы", desc: "Топовые бренды: Elf Bar, HQD, Fumot. От 500 затяжек до 12 000+.", icon: "Zap", price: "от 350 ₽" },
  { name: "Под-системы", desc: "SMOK, Vaporesso, Uwell — надёжные устройства для любого уровня.", icon: "Wind", price: "от 1 500 ₽" },
  { name: "Жидкости", desc: "Более 200 вкусов: фрукты, ягоды, десерты, ментол. Salt и обычный nic.", icon: "Droplets", price: "от 250 ₽" },
  { name: "Аксессуары", desc: "Испарители, батарейки, кейсы, зарядки — всё для комфортного вейпинга.", icon: "Package", price: "от 100 ₽" },
];

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

interface ProfileData {
  username: string;
  first_name?: string;
  created_at: string;
  orders_count: number;
}

function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tg_session");
    if (!token) {
      setError("not_logged_in");
      setLoading(false);
      return;
    }
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ action: "profile" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setProfile(data.user);
        else setError(data.error || "Ошибка");
      })
      .catch(() => setError("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Icon name="Loader" size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (error === "not_logged_in") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="bg-purple-50 p-6 rounded-full">
          <Icon name="UserX" size={48} className="text-purple-300" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900">Вы не авторизованы</h3>
        <p className="text-neutral-500 text-sm text-center max-w-sm">
          Войдите через Telegram, чтобы видеть информацию о своём профиле и заказах.
        </p>
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

  return (
    <div className="max-w-xl">
      {/* Аватар и имя */}
      <div className="flex items-center gap-5 mb-10">
        <div className="bg-purple-600 w-20 h-20 flex items-center justify-center text-white text-3xl font-bold">
          {(profile?.first_name || profile?.username || "U")[0].toUpperCase()}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-neutral-900">
            {profile?.first_name || `@${profile?.username}`}
          </h3>
          <p className="text-neutral-400 text-sm">@{profile?.username}</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mb-8">
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
            <span className="text-sm text-neutral-500 uppercase tracking-wide">Заказов оформлено</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{profile?.orders_count ?? 0}</p>
        </div>
      </div>

      <div className="border border-neutral-100 p-5 flex items-center gap-3 text-sm text-neutral-500">
        <Icon name="Shield" size={18} className="text-purple-400 shrink-0" />
        Ваши данные защищены и не передаются третьим лицам
      </div>
    </div>
  );
}

export default function Featured() {
  const [activeTab, setActiveTab] = useState<Tab>("Ассортимент");

  const items = activeTab === "Ассортимент" ? catalog : activeTab === "Доставка" ? delivery : support;

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
        {activeTab === "Профиль" ? (
          <ProfileTab />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <div
                key={item.name ?? item.title}
                className="border border-neutral-100 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-purple-50 group-hover:bg-purple-100 p-3 transition-colors duration-300">
                    <Icon name={(item as { icon: string }).icon as Parameters<typeof Icon>[0]["name"]} size={22} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-neutral-900">{item.name ?? (item as { title: string }).title}</h4>
                      {"price" in item && (
                        <span className="text-purple-600 text-sm font-bold">{(item as { price: string }).price}</span>
                      )}
                    </div>
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
