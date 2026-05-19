const CLIENT_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CLIENT_API_BASE}${path}`, {
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data as T;
}

export async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${CLIENT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data as T;
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CLIENT_API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data as T;
}
