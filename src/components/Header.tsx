import { useState } from "react";
import Icon from "@/components/ui/icon";

interface HeaderProps {
  className?: string;
  onAuthClick?: () => void;
  user?: { username: string; first_name?: string } | null;
  onLogout?: () => void;
}

export default function Header({ className, onAuthClick, user, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header className={`absolute top-0 left-0 right-0 z-50 p-6 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-white hover:text-purple-400 transition-colors duration-300"
            title="Наверх"
          >
            <Icon name="ArrowUp" size={20} />
          </button>
          <div className="text-white text-xl font-bold tracking-widest uppercase">
            FLAVORCLOUDS
          </div>
        </div>

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
              <div className="flex items-center gap-2 text-white text-sm">
                <div className="bg-purple-600 w-7 h-7 flex items-center justify-center text-xs font-bold">
                  {(user.first_name || user.username || "U")[0].toUpperCase()}
                </div>
                <span className="opacity-80">@{user.username}</span>
              </div>
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

        <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-4 bg-black/80 p-4 backdrop-blur">
          <button onClick={() => scrollTo("catalog")} className="text-white text-sm uppercase">Ассортимент</button>
          <button onClick={() => scrollTo("delivery")} className="text-white text-sm uppercase">Доставка</button>
          <button onClick={() => scrollTo("support")} className="text-white text-sm uppercase">Поддержка</button>
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">@{user.username}</span>
              <button onClick={onLogout} className="text-neutral-400 text-xs uppercase">Выйти</button>
            </div>
          ) : (
            <button onClick={onAuthClick} className="bg-purple-600 text-white px-4 py-2 text-sm uppercase flex items-center gap-2 justify-center">
              <Icon name="Send" size={14} />
              Войти через Telegram
            </button>
          )}
        </div>
      )}
    </header>
  );
}
