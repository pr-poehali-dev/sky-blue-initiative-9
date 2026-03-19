import { useState } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/7b024c21-5cd0-4f27-b3e7-6fd2f6449619";

interface TelegramAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: { username: string; first_name?: string }, token: string) => void;
}

export default function TelegramAuthModal({ open, onClose, onSuccess }: TelegramAuthModalProps) {
  const [step, setStep] = useState<"start" | "username" | "code">("start");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка отправки кода");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", username, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Неверный код");
      localStorage.setItem("tg_session", data.token);
      localStorage.setItem("tg_user", JSON.stringify(data.user));
      onSuccess?.(data.user, data.token);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка верификации");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("start");
    setUsername("");
    setCode("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white w-full max-w-md mx-4 p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors">
          <Icon name="X" size={20} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-[#229ED9] w-16 h-16 flex items-center justify-center">
            <Icon name="Send" size={32} className="text-white" />
          </div>
        </div>

        {step === "start" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Войти через Telegram</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Укажите ваш username в Telegram. Бот отправит вам код подтверждения.<br />
              <span className="text-purple-600 font-medium">Сначала напишите боту любое сообщение!</span>
            </p>
            <button
              onClick={() => setStep("username")}
              className="w-full bg-[#229ED9] hover:bg-[#1a8bc4] text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300 flex items-center justify-center gap-2"
            >
              <Icon name="Send" size={16} />
              Продолжить с Telegram
            </button>
          </>
        )}

        {step === "username" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Ваш Telegram</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Введите ваш username (например, @ivan_petrov)
            </p>
            <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                required
                autoFocus
              />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300 flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="Loader" size={16} className="animate-spin" /> : null}
                {loading ? "Отправляем..." : "Получить код"}
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Код из Telegram</h2>
            <p className="text-neutral-500 text-center text-sm mb-8">
              Проверьте сообщения от бота в Telegram — там 5-значный код
            </p>
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                maxLength={5}
                className="border border-neutral-200 px-4 py-3 text-sm text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-purple-500 transition-colors"
                required
                autoFocus
              />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 uppercase tracking-wide text-sm transition-colors duration-300 flex items-center justify-center gap-2"
              >
                {loading ? <Icon name="Loader" size={16} className="animate-spin" /> : null}
                {loading ? "Проверяем..." : "Войти"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("username"); setError(""); setCode(""); }}
                className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors text-center"
              >
                Изменить username
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
