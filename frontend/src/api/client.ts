const API_BASE = import.meta.env.VITE_API_URL || "/api";

// CSRF-Token: Vorrang hat der im Speicher, Fallback auf Cookie
let csrfTokenInMemory: string | null = null;

export function setCsrfTokenFromResponse(token: string | null) {
  csrfTokenInMemory = token;
}

function getCsrfToken(): string | null {
  if (csrfTokenInMemory) return csrfTokenInMemory;
  // Fallback: Cookie (funktioniert nur bei Same-Origin)
  const match = document.cookie.match(/(?:^|;\s*)tmsa-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // CSRF-Token bei Mutationen mitsenden
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers,
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Unbekannter Fehler");
  }

  // CSRF-Token aus Response speichern (Login + /me)
  if (json?.data?.csrfToken) {
    setCsrfTokenFromResponse(json.data.csrfToken);
  }

  return json;
}
