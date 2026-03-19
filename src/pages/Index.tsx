import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Featured from "@/components/Featured";
import Promo from "@/components/Promo";
import Footer from "@/components/Footer";
import TelegramAuthModal from "@/components/TelegramAuthModal";

const Index = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; first_name?: string } | null>(null);
  const openProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tg_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tg_session");
    localStorage.removeItem("tg_user");
    setUser(null);
  };

  const handleProfileClick = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => openProfileRef.current?.(), 400);
  };

  return (
    <main className="min-h-screen">
      <Header
        onAuthClick={() => setAuthOpen(true)}
        user={user}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
      />
      <Hero />
      <Featured onRegisterOpenProfile={(fn) => { openProfileRef.current = fn; }} />
      <Promo />
      <Footer />
      <TelegramAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </main>
  );
};

export default Index;
