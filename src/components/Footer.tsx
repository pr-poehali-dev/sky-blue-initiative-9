export default function Footer() {
  return (
    <div
      className="relative h-[400px] sm:h-[600px] lg:h-[800px] max-h-[800px]"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative h-[calc(100vh+400px)] sm:h-[calc(100vh+600px)] lg:h-[calc(100vh+800px)] -top-[100vh]">
        <div className="h-[400px] sm:h-[600px] lg:h-[800px] sticky top-[calc(100vh-400px)] sm:top-[calc(100vh-600px)] lg:top-[calc(100vh-800px)]">
          <div className="bg-neutral-900 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 h-full w-full flex flex-col justify-between">
            <div className="flex shrink-0 gap-8 sm:gap-12 lg:gap-20">
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-1 sm:mb-2 uppercase text-purple-400 text-xs sm:text-sm">Магазин</h3>
                <a href="#catalog" className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base">
                  Ассортимент
                </a>
                <a href="#delivery" className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base">
                  Доставка
                </a>
                <a href="#support" className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base">
                  Поддержка
                </a>
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-1 sm:mb-2 uppercase text-purple-400 text-xs sm:text-sm">Контакты</h3>
                <a
                  href="https://t.me/vapezone_shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base"
                >
                  Telegram
                </a>
                <a href="#" className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base">
                  Instagram
                </a>
                <a href="#" className="text-white hover:text-purple-400 transition-colors duration-300 text-sm sm:text-base">
                  ВКонтакте
                </a>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
              <h1 className="text-[18vw] sm:text-[16vw] lg:text-[14vw] leading-[0.8] mt-4 sm:mt-6 lg:mt-10 text-white font-bold tracking-tight">
                FLAVORCLOUDS
              </h1>
              <p className="text-neutral-500 text-sm sm:text-base">{new Date().getFullYear()} FlavorClouds. 18+</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}