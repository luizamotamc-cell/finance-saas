const BASE = import.meta.env.VITE_API_URL ?? '/api';
const KEY = 'caixa.tokens';

export interface Tokens { accessToken: string; refreshToken: string }

// Nota: localStorage é simples, mas exposto a XSS. Em produção, considere
// guardar o refresh token em cookie httpOnly.
export const tokenStore = {
  get(): Tokens | null {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  },
  set(t: Tokens) { localStorage.setItem(KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(KEY); },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Query = Record<string, string | number | undefined | null>;
interface Options { method?: string; body?: unknown; query?: Query }

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const tokens = tokenStore.get();
  if (!tokens) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) return false;
    tokenStore.set(await res.json());
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(path: string, { method = 'GET', body, query }: Options = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const qstr = qs.toString();
  const url = `${BASE}${path}${qstr ? `?${qstr}` : ''}`;

  const send = () =>
    fetch(url, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(tokenStore.get() && { Authorization: `Bearer ${tokenStore.get()!.accessToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();

  if (res.status === 401 && tokenStore.get()) {
    refreshing ??= tryRefresh().finally(() => { refreshing = null; });
    if (await refreshing) {
      res = await send();
    } else {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message;
    throw new ApiError(res.status, msg ?? 'Algo deu errado. Tente novamente.');
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
