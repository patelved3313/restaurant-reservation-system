import { saveProfileAction } from "@/app/dashboard/actions";
import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const auth = await requireAuthContext();
  const profile =
    auth.role === "ADMIN"
      ? await prisma.restaurantProfile.findFirst({ orderBy: { createdAt: "asc" } })
      : await prisma.restaurantProfile.findFirst({
          where: { id: { in: auth.restaurantIds } },
          orderBy: { createdAt: "asc" },
        });
  const params = searchParams ? await searchParams : {};

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
        Restaurant settings
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
        Profile
      </h1>

      <form
        action={saveProfileAction}
        className="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-panel"
      >
        <input type="hidden" name="id" value={profile?.id ?? ""} />
        {params.success || params.error ? (
          <p className="mb-5 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-700">
            {params.success ?? params.error}
          </p>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="name" label="Restaurant name" defaultValue={profile?.name ?? ""} required />
          <Field name="slug" label="Slug" defaultValue={profile?.slug ?? "restaurant"} required />
          <Field name="phone" label="Phone" defaultValue={profile?.phone ?? ""} />
          <Field name="email" label="Email" type="email" defaultValue={profile?.email ?? ""} />
          <Field name="website" label="Website" type="url" defaultValue={profile?.website ?? ""} />
          <Field name="address" label="Primary address" defaultValue={profile?.address ?? ""} />
        </div>
        <label className="mt-5 block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
          Internal notes
          <textarea
            name="notes"
            rows={5}
            defaultValue={profile?.notes ?? ""}
            className="mt-2 w-full rounded border border-neutral-300 bg-white px-3 py-3 text-sm font-bold text-neutral-950 outline-none focus:border-neutral-950"
          />
        </label>
        <button className="mt-6 rounded bg-neutral-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-neutral-800">
          Save profile
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
      {label}
      <input
        {...props}
        className="mt-2 h-11 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-950 outline-none focus:border-neutral-950"
      />
    </label>
  );
}
