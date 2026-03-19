import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Featured from "@/components/Featured";
import Promo from "@/components/Promo";
import Footer from "@/components/Footer";
import TelegramAuthModal from "@/components/TelegramAuthModal";

const Index = () => {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <Header onAuthClick={() => setAuthOpen(true)} />
      <Hero />
      <Featured />
      <Promo />
      <Footer />
      <TelegramAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
};

export default Index;
