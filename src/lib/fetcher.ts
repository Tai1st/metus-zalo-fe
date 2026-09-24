export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResult<T>;
  if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { cache: "no-store" }));
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "DELETE" | "PUT" | "PATCH",
  body?: unknown,
): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return parse<T>(await fetch(path, { method: "POST", body: form }));
}
