import { useState } from "react";
import Icon from "@/components/ui/icon";

interface HeaderProps {
  className?: string;
  onAuthClick?: () => void;
}

export default function Header({ className, onAuthClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header className={`absolute top-0 left-0 right-0 z-50 p-6 ${className ?? ""}`}>
      <div className="flex justify-between items-center">
        <div className="text-white text-xl font-bold tracking-widest uppercase">
          FLAVORCLOUDS
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <button
            onClick={() => scrollTo("catalog")}
            className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm"
          >
            Ассортимент
          </button>
          <button
            onClick={() => scrollTo("delivery")}
            className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm"
          >
            Доставка
          </button>
          <button
            onClick={() => scrollTo("support")}
            className="text-white hover:text-purple-400 transition-colors duration-300 uppercase text-sm"
          >
            Поддержка
          </button>
          <button
            onClick={onAuthClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm uppercase tracking-wide transition-colors duration-300 flex items-center gap-2"
          >
            <Icon name="Send" size={14} />
            Войти через Telegram
          </button>
        </nav>
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? "X" : "Menu"} size={24} />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-4 bg-black/80 p-4 backdrop-blur">
          <button onClick={() => scrollTo("catalog")} className="text-white text-sm uppercase">Ассортимент</button>
          <button onClick={() => scrollTo("delivery")} className="text-white text-sm uppercase">Доставка</button>
          <button onClick={() => scrollTo("support")} className="text-white text-sm uppercase">Поддержка</button>
          <button onClick={onAuthClick} className="bg-purple-600 text-white px-4 py-2 text-sm uppercase flex items-center gap-2 justify-center">
            <Icon name="Send" size={14} />
            Войти через Telegram
          </button>
        </div>
      )}
    </header>
  );
}