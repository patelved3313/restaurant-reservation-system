"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteLocationAction,
  saveLocationAction,
  updateLocationStatusAction,
} from "@/app/dashboard/actions";
import { dayLabels } from "@/lib/format";

type LocationHour = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type LocationCardData = {
  id: string;
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  hours: LocationHour[];
};

type Filter = "all" | "active" | "disabled";
type ConfirmIntent =
  | { type: "delete"; location: LocationCardData }
  | { type: "status"; location: LocationCardData; isActive: boolean };

const baseControl =
  "inline-flex h-10 shrink-0 items-center justify-center rounded px-4 text-xs font-black uppercase tracking-[0.14em] transition";
const blackControl = `${baseControl} bg-neutral-950 text-white hover:bg-neutral-800`;
const secondaryControl = `${baseControl} border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-100`;
const deleteControl = `${baseControl} bg-red-700 text-white hover:bg-red-800`;
const statusControl = `${baseControl} pointer-events-none border border-neutral-950 bg-neutral-950 text-white`;
const disabledStatusControl = `${baseControl} pointer-events-none border border-neutral-300 bg-white text-neutral-500`;

export function LocationsManager({
  locations,
  initialMessage,
}: {
  locations: LocationCardData[];
  initialMessage?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState(initialMessage ?? "");
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  const editingLocation = useMemo(
    () => locations.find((location) => location.id === editingId) ?? null,
    [editingId, locations],
  );

  useEffect(() => {
    if (!editingLocation && editingId) {
      setEditingId(null);
      setIsFormOpen(false);
    }
  }, [editingId, editingLocation]);

  const visibleLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && location.isActive) ||
        (filter === "disabled" && !location.isActive);
      const searchable = [
        location.name,
        location.street,
        location.city,
        location.region,
        location.postalCode,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, locations, query]);

  function openAddForm() {
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEditForm(locationId: string) {
    setEditingId(locationId);
    setIsFormOpen(true);
  }

  return (
    <>
      {toast ? (
        <div className="fixed right-5 top-5 z-30 rounded border border-neutral-200 bg-white px-4 py-3 text-sm font-black text-neutral-950 shadow-panel">
          <div className="flex items-center gap-4">
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast("")}
              className="text-xs font-black uppercase tracking-[0.14em] text-neutral-500 transition hover:text-neutral-950"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-neutral-950">
              {locations.length} {locations.length === 1 ? "location" : "locations"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "active", "disabled"] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={filter === item ? blackControl : secondaryControl}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
            <label className="block w-full text-xs font-black uppercase tracking-[0.18em] text-neutral-500 sm:w-80">
              Search locations
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or address"
                className="mt-2 h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold normal-case tracking-normal text-neutral-950 outline-none transition focus:border-neutral-950"
              />
            </label>
            <button type="button" onClick={openAddForm} className={blackControl}>
              + Add Location
            </button>
          </div>
        </div>
      </div>

      <section className="mt-6 space-y-5">
        {visibleLocations.map((location) => (
          <article
            key={location.id}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_60px_rgba(0,0,0,0.08)]"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
                  {location.timezone}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
                  {location.name}
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-neutral-500">
                  {location.street}, {location.city}, {location.region}{" "}
                  {location.postalCode}
                </p>
                {location.phone ? (
                  <p className="mt-1 text-sm font-bold text-neutral-500">{location.phone}</p>
                ) : null}
              </div>

              <div className="flex min-w-max items-center gap-2 overflow-x-auto pb-1">
                <span
                  className={
                    location.isActive ? statusControl : disabledStatusControl
                  }
                >
                  {location.isActive ? "Active" : "Disabled"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmIntent({
                      type: "status",
                      location,
                      isActive: !location.isActive,
                    })
                  }
                  className={secondaryControl}
                >
                  {location.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(location.id)}
                  className={blackControl}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmIntent({ type: "delete", location })}
                  className={deleteControl}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              {location.hours
                .slice()
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((hour) => (
                  <div
                    key={hour.id}
                    className="rounded border border-neutral-200 bg-neutral-50 px-3 py-3 transition hover:bg-white"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                      {dayLabels[hour.dayOfWeek].slice(0, 3)}
                    </p>
                    <p className="mt-2 text-sm font-black text-neutral-950">
                      {hour.isClosed ? "Closed" : `${hour.openTime} - ${hour.closeTime}`}
                    </p>
                  </div>
                ))}
            </div>
          </article>
        ))}

        {locations.length === 0 ? (
          <EmptyState message="Add your first restaurant location." onAdd={openAddForm} />
        ) : null}
        {locations.length > 0 && visibleLocations.length === 0 ? (
          <EmptyState message="No locations match your search or filter." />
        ) : null}
      </section>

      <LocationFormModal
        isOpen={isFormOpen}
        location={editingLocation}
        onClose={() => {
          setIsFormOpen(false);
          setEditingId(null);
        }}
      />
      <ConfirmDialog intent={confirmIntent} onClose={() => setConfirmIntent(null)} />
    </>
  );
}

function EmptyState({
  message,
  onAdd,
}: {
  message: string;
  onAdd?: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-panel">
      <p className="text-lg font-black tracking-tight text-neutral-950">{message}</p>
      {onAdd ? (
        <button type="button" onClick={onAdd} className={`mt-5 ${blackControl}`}>
          + Add Location
        </button>
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  intent,
  onClose,
}: {
  intent: ConfirmIntent | null;
  onClose: () => void;
}) {
  if (!intent) {
    return null;
  }

  const isDelete = intent.type === "delete";
  const message = isDelete
    ? "Are you sure you want to delete this location? This action cannot be undone."
    : intent.isActive
      ? "Are you sure you want to enable this location?"
      : "Are you sure you want to disable this location?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md translate-y-0 rounded-lg border border-neutral-200 bg-white p-6 shadow-panel transition duration-200">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
          Confirm action
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-neutral-950">
          {intent.location.name}
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryControl}>
            Cancel
          </button>
          {isDelete ? (
            <form action={deleteLocationAction}>
              <input type="hidden" name="id" value={intent.location.id} />
              <button className={deleteControl}>Delete</button>
            </form>
          ) : (
            <form action={updateLocationStatusAction}>
              <input type="hidden" name="id" value={intent.location.id} />
              <input type="hidden" name="isActive" value={String(intent.isActive)} />
              <button className={blackControl}>
                {intent.isActive ? "Enable" : "Disable"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationFormModal({
  isOpen,
  location,
  onClose,
}: {
  isOpen: boolean;
  location: LocationCardData | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-panel transition duration-200">
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
              Location setup
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
              {location ? "Edit location" : "Add location"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={secondaryControl}>
            Close
          </button>
        </div>
        <div className="max-h-[calc(92vh-104px)] overflow-y-auto px-6 py-6">
          <LocationForm
            location={location}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={(formData) => {
              startTransition(async () => {
                await saveLocationAction(formData);
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LocationForm({
  location,
  isPending,
  onCancel,
  onSubmit,
}: {
  location: LocationCardData | null;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const hours = dayLabels.map((_, dayOfWeek) => {
    const existing = location?.hours.find((hour) => hour.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      openTime: existing?.openTime ?? (dayOfWeek === 0 ? "10:00" : "09:00"),
      closeTime: existing?.closeTime ?? (dayOfWeek === 0 ? "21:00" : "22:00"),
      isClosed: existing?.isClosed ?? false,
    };
  });

  return (
    <form action={onSubmit}>
      <input type="hidden" name="id" value={location?.id ?? ""} />
      {location?.isActive ?? true ? (
        <input type="hidden" name="isActive" value="on" />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          name="name"
          label="Location name"
          defaultValue={location?.name ?? ""}
          required
        />
        <Field
          name="timezone"
          label="Timezone"
          defaultValue={location?.timezone ?? "America/New_York"}
          required
        />
        <Field
          name="street"
          label="Street"
          defaultValue={location?.street ?? ""}
          required
        />
        <Field name="phone" label="Phone" defaultValue={location?.phone ?? ""} />
        <Field
          name="city"
          label="City"
          defaultValue={location?.city ?? ""}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            name="region"
            label="State / region"
            defaultValue={location?.region ?? ""}
            required
          />
          <Field
            name="postalCode"
            label="Postal code"
            defaultValue={location?.postalCode ?? ""}
            required
          />
        </div>
      </div>

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
          Opening hours
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {hours.map((hour) => (
            <div key={hour.dayOfWeek} className="rounded border border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-black">{dayLabels[hour.dayOfWeek]}</span>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                  Closed
                  <input
                    name={`isClosed-${hour.dayOfWeek}`}
                    type="checkbox"
                    defaultChecked={hour.isClosed}
                    className="h-4 w-4 accent-black"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name={`openTime-${hour.dayOfWeek}`}
                  type="time"
                  defaultValue={hour.openTime}
                  className="h-10 rounded border border-neutral-300 px-3 text-sm font-bold outline-none transition focus:border-neutral-950"
                />
                <input
                  name={`closeTime-${hour.dayOfWeek}`}
                  type="time"
                  defaultValue={hour.closeTime}
                  className="h-10 rounded border border-neutral-300 px-3 text-sm font-bold outline-none transition focus:border-neutral-950"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryControl}>
          {location ? "Cancel edit" : "Cancel"}
        </button>
        <button disabled={isPending} className={blackControl}>
          {isPending ? "Saving" : location ? "Save changes" : "Add location"}
        </button>
      </div>
    </form>
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
        className="mt-2 h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-950 outline-none transition focus:border-neutral-950"
      />
    </label>
  );
}
