import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"]);

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center h-screen overflow-hidden"
    >
      <motion.div
        style={{ y }}
        className="absolute inset-0 w-full h-full"
      >
        <img
          src="https://cdn.poehali.dev/projects/1de4c61b-6522-4152-b99a-5b11ca7e9524/files/caa91d2f-6508-4c8b-bd2c-6906912d28cb.jpg"
          alt="Vape shop interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </motion.div>

      <div className="relative z-10 text-center text-white px-4">
        <p className="text-purple-400 uppercase tracking-[0.3em] text-sm mb-4">Премиальный вейп-магазин</p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          FLAVORCLOUDS
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto px-6 opacity-80 mb-8">
          Широкий ассортимент вейпов, жидкостей и аксессуаров. Быстрая доставка по всей России.
        </p>
        <button
          onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 uppercase tracking-wide text-sm transition-colors duration-300"
        >
          Смотреть ассортимент
        </button>
      </div>
    </div>
  );
}