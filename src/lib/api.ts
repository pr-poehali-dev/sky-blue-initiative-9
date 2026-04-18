const API_URL = "https://functions.poehali.dev/7b024c21-5cd0-4f27-b3e7-6fd2f6449619";

const NETWORK_ERRORS: Record<string, string> = {
  "Failed to fetch": "Нет подключения к серверу. Проверьте интернет и попробуйте снова.",
  "NetworkError": "Сетевая ошибка. Попробуйте снова.",
  "Load failed": "Нет подключения к серверу. Проверьте интернет и попробуйте снова.",
};

function humanizeError(err: unknown): string {
  if (err instanceof Error) {
    for (const [key, msg] of Object.entries(NETWORK_ERRORS)) {
      if (err.message.includes(key)) return msg;
    }
    return err.message;
  }
  return "Неизвестная ошибка. Попробуйте снова.";
}

async function fetchWithRetry(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  retries = 2,
  delayMs = 800
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeout);

    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (isAbort) throw new Error("Сервер не ответил. Попробуйте снова.");

    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(body, headers, retries - 1, delayMs * 1.5);
    }

    throw new Error(humanizeError(err));
  }
}

export async function apiCall(
  action: string,
  params: Record<string, unknown> = {},
  token?: string
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (token) headers["X-Session-Token"] = token;
  return fetchWithRetry({ action, ...params }, headers);
}
