// Client for the Apps Script web app. Plain-text POST avoids a CORS preflight.
export interface ApiConfig {
  url: string;
  key: string;
}

export type Op = { op: 'put'; collection: string; doc: { id: string } } | { op: 'delete'; collection: string; id: string };

export class ApiError extends Error {
  kind: 'config' | 'network' | 'unauthorized' | 'server';
  constructor(kind: ApiError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

const STORE_KEY = 'debt-tracker:api'; // connection settings only, never financial data

export function loadConfig(): ApiConfig | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const c = raw ? (JSON.parse(raw) as Partial<ApiConfig>) : {};
    const url = c.url || envUrl;
    return url && c.key ? { url, key: c.key } : null;
  } catch {
    return null;
  }
}

export function saveConfig(c: ApiConfig) {
  localStorage.setItem(STORE_KEY, JSON.stringify(c));
}

async function call<T>(action: string, payload: Record<string, unknown> = {}, cfg = loadConfig(), timeoutMs = 25000): Promise<T> {
  if (!cfg) throw new ApiError('config', 'Hubungkan aplikasi ke Google Sheet di Pengaturan (URL dan kunci API).');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key: cfg.key, ...payload }),
      signal: ctl.signal,
    });
  } catch {
    throw new ApiError('network', 'Tidak bisa menghubungi Google Sheet. Periksa koneksi dan URL.');
  } finally {
    clearTimeout(timer);
  }
  let body: { ok: boolean; error?: string } & Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('server', 'Respons server tidak valid. Pastikan deployment Apps Script berakses "Anyone".');
  }
  if (!body.ok) {
    if (body.error === 'unauthorized') throw new ApiError('unauthorized', 'Kunci API salah.');
    throw new ApiError('server', body.error ?? 'Kesalahan server.');
  }
  return body as unknown as T;
}

export const api = {
  ping: (cfg?: ApiConfig) => call<{ ok: true }>('ping', {}, cfg ?? loadConfig()),
  list: (collections?: string[]) => call<{ data: Record<string, Record<string, unknown>[]> }>('list', collections ? { collections } : {}),
  /** All ops are validated first and applied together (one write cycle under a script lock). */
  batch: (ops: Op[]) => call<{ applied: number }>('batch', { ops }),
  replaceAll: (data: Record<string, unknown[]>) => call<{ counts: Record<string, number> }>('replaceAll', { data }),
};
