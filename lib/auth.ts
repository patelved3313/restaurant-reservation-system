import { cookies } from "next/headers";

export const SESSION_COOKIE = "reserve_admin_session";

const encoder = new TextEncoder();

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? "admin@restaurant.com";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "password";
}

export async function createSessionToken() {
  const secret = process.env.SESSION_SECRET ?? "development-secret";
  return sha256(`${getAdminEmail()}:${getAdminPassword()}:${secret}`);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return Boolean(token && token === (await createSessionToken()));
}
