import { ShieldCheck } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-neutral-950">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-neutral-200 bg-neutral-950 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
              ReserveOS
            </p>
            <h1 className="text-2xl font-black tracking-tight">Admin login</h1>
          </div>
        </div>

        <form
          action="/api/auth/login"
          method="post"
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-panel"
        >
          <label className="block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="mt-2 h-12 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold tracking-tight text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>
          <label className="mt-5 block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
            Password
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold tracking-tight text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>
          <button className="mt-6 h-12 w-full rounded bg-neutral-950 px-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800">
            Sign in
          </button>
          <LoginError searchParams={searchParams} />
        </form>
      </section>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};

  if (!params?.error) {
    return null;
  }

  return (
    <p className="mt-4 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-700">
      Invalid admin credentials.
    </p>
  );
}
