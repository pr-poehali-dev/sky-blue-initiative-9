import { useState } from "react";
import Icon from "@/components/ui/icon";

interface HeaderProps {
  className?: string;
  onAuthClick?: () => void;
  onProfileClick?: () => void;
  user?: { username: string; first_name?: string; position?: string } | null;
  onLogout?: () => void;
}

export default function Header({ className, onAuthClick, onProfileClick, user, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const avatarUrl = user ? localStorage.getItem("tg_avatar") : null;

  return (
    <header className={`absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-white hover:text-purple-400 transition-colors duration-300 p-1 touch-manipulation"
            title="Наверх"
          >
            <Icon name="ArrowUp" size={20} />
          </button>
          <div className="text-white text-base sm:text-xl font-bold tracking-widest uppercase">
            FLAVORCLOUDS
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8 items-center">
          <button onClick={() => scrollTo("catalog")} className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm">
            Ассортимент
          </button>
          <button onClick={() => scrollTo("delivery")} className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm">
            Доставка
          </button>
          <button onClick={() => scrollTo("support")} className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm">
            Поддержка
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 text-white text-sm hover:opacity-80 transition-opacity touch-manipulation"
                title="Открыть профиль"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500" />
                ) : (
                  <div className="bg-purple-600 w-9 h-9 flex items-center justify-center text-xs font-bold rounded-full">
                    {(user.first_name || user.username || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className={user.position === "admin" || user.position === "courier" ? "text-green-400 font-semibold" : "opacity-80"}>
                  @{user.username}
                </span>
              </button>
              <button
                onClick={onLogout}
                className="text-neutral-400 hover:text-white transition-colors duration-300 text-xs uppercase tracking-wide"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors duration-300 flex items-center gap-2"
            >
              <Icon name="Send" size={14} />
              Войти через Telegram
            </button>
          )}
        </nav>

        {/* Mobile: user avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <button
              onClick={() => { onProfileClick?.(); setMenuOpen(false); }}
              className="touch-manipulation p-1"
              title="Профиль"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500" />
              ) : (
                <div className="bg-purple-600 w-9 h-9 flex items-center justify-center text-xs font-bold rounded-full text-white">
                  {(user.first_name || user.username || "U")[0].toUpperCase()}
                </div>
              )}
            </button>
          )}
          <button
            className="text-white p-2 touch-manipulation"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            <Icon name={menuOpen ? "X" : "Menu"} size={24} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 flex flex-col bg-black/90 backdrop-blur-md border border-white/10 overflow-hidden">
          <button onClick={() => scrollTo("catalog")} className="text-white text-sm uppercase py-4 px-5 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10 touch-manipulation">
            Ассортимент
          </button>
          <button onClick={() => scrollTo("delivery")} className="text-white text-sm uppercase py-4 px-5 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10 touch-manipulation">
            Доставка
          </button>
          <button onClick={() => scrollTo("support")} className="text-white text-sm uppercase py-4 px-5 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10 touch-manipulation">
            Поддержка
          </button>
          {user ? (
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-neutral-400 text-sm">@{user.username}</span>
              <button onClick={() => { onLogout?.(); setMenuOpen(false); }} className="text-neutral-400 hover:text-white text-xs uppercase tracking-wide py-2 px-3 touch-manipulation">
                Выйти
              </button>
            </div>
          ) : (
            <button onClick={() => { onAuthClick?.(); setMenuOpen(false); }} className="bg-purple-600 text-white py-4 px-5 text-sm uppercase flex items-center gap-2 justify-center hover:bg-purple-700 active:bg-purple-800 transition-colors touch-manipulation">
              <Icon name="Send" size={14} />
              Войти через Telegram
            </button>
          )}
        </div>
      )}
    </header>
  );
}
