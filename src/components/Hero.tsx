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

      <div className="relative z-10 text-center text-white px-4 w-full max-w-4xl mx-auto">
        <p className="text-purple-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm mb-3 sm:mb-4">Премиальный вейп-магазин</p>
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 sm:mb-6">
          FLAVORCLOUDS
        </h1>
        <p className="text-base sm:text-lg md:text-xl max-w-xl mx-auto opacity-80 mb-8 px-2">
          Широкий ассортимент вейпов, жидкостей и аксессуаров. Быстрая доставка по всей России.
        </p>
        <button
          onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-8 py-3.5 uppercase tracking-wide text-sm transition-colors duration-300 touch-manipulation"
        >
          Смотреть ассортимент
        </button>
      </div>
    </div>
  );
}