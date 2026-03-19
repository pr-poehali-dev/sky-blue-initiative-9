import { useState } from "react";
import Icon from "@/components/ui/icon";

interface TelegramAuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TelegramAuthModal({ open, onClose }: TelegramAuthModalProps) {
  const [step, setStep] = useState<"start" | "phone" | "code">("start");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  if (!open) return null;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("code");
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: подключить реальную авторизацию через Telegram
    onClose();
    setStep("start");
    setPhone("");
    setCode("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md mx-4 p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors">
          <Icon name="X" size={20} />
        </button>

        {/* Telegram icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#229ED9] w-16 h-16 flex items-center justify-center">
            <Icon name="Send" size={32} className="text-white" />
          </div>
        </div>

        {step === "start" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Войти через Telegram</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Укажите номер телефона, привязанный к Telegram. Мы отправим вам код подтверждения.
            </p>
            <button
              onClick={() => setStep("phone")}
              className="w-full bg-[#229ED9] hover:bg-[#1a8bc4] text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300 flex items-center justify-center gap-2"
            >
              <Icon name="Send" size={16} />
              Продолжить с Telegram
            </button>
          </>
        )}

        {step === "phone" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Ваш номер</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Введите номер телефона в международном формате
            </p>
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
              <input
                type="tel"
                placeholder="+7 900 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300"
              >
                Получить код
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Код из Telegram</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Введите код, который пришёл вам в Telegram на номер <span className="text-neutral-900 font-medium">{phone}</span>
            </p>
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={5}
                className="border border-neutral-200 px-4 py-3 text-sm text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300"
              >
                Войти
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors text-center"
              >
                Изменить номер
              </button>
            </form>
          </>
        )}

        <p className="text-neutral-400 text-xs text-center mt-6">
          Только для лиц старше 18 лет
        </p>
      </div>
    </div>
  );
}
