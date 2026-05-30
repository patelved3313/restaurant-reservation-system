"use client";

import { ReservationStatus } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import {
  createReservationAction,
  deleteReservationAction,
  updateReservationAction,
  updateReservationStatusAction,
} from "@/app/dashboard/actions";
import { formatDate, statusLabel } from "@/lib/format";

type LocationOption = {
  id: string;
  name: string;
};

export type ReservationRowData = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  phoneNumber: string;
  partySize: number;
  date: string;
  time: string;
  locationId: string;
  locationName: string;
  status: ReservationStatus;
  notes: string | null;
};

type Filter = "all" | "today" | "upcoming" | "completed" | "cancelled";
type ConfirmIntent =
  | { type: "cancel"; reservation: ReservationRowData }
  | { type: "delete"; reservation: ReservationRowData };

const pageSize = 8;
const baseControl =
  "inline-flex h-10 shrink-0 items-center justify-center rounded px-4 text-xs font-black uppercase tracking-[0.14em] transition";
const blackControl = `${baseControl} bg-neutral-950 text-white hover:bg-neutral-800`;
const secondaryControl = `${baseControl} border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-100`;
const deleteControl = `${baseControl} bg-red-700 text-white hover:bg-red-800`;
const reservationTimeError = "Reservation time must be between 09:00 and 22:00.";

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getReservationTimeError(time: string) {
  if (!time) {
    return "";
  }

  const minutes = timeToMinutes(time);
  const opens = timeToMinutes("09:00");
  const closes = timeToMinutes("22:00");

  return minutes < opens || minutes >= closes ? reservationTimeError : "";
}

export function ReservationsManager({
  reservations,
  locations,
  initialMessage,
  initialError,
}: {
  reservations: ReservationRowData[];
  locations: LocationOption[];
  initialMessage?: string;
  initialError?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(initialMessage || initialError || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  const editingReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === editingId) ?? null,
    [editingId, reservations],
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" && reservation.date >= today,
  ).length;
  const completedCount = reservations.filter(
    (reservation) => reservation.status === "COMPLETED",
  ).length;
  const cancelledCount = reservations.filter(
    (reservation) => reservation.status === "CANCELLED",
  ).length;
  const todayCount = reservations.filter(
    (reservation) => reservation.date === today,
  ).length;

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "today" && reservation.date === today) ||
        (filter === "upcoming" &&
          reservation.status === "CONFIRMED" &&
          reservation.date >= today) ||
        (filter === "completed" && reservation.status === "COMPLETED") ||
        (filter === "cancelled" && reservation.status === "CANCELLED");
      const searchable = [
        reservation.customerName,
        reservation.customerEmail ?? "",
        reservation.phoneNumber,
        reservation.locationName,
        reservation.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, query, reservations, today]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedReservations = filteredReservations.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function openCreateModal() {
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEditModal(reservationId: string) {
    setEditingId(reservationId);
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

      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
            Admin dashboard
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
            Reservations
          </h1>
        </div>
        <button type="button" onClick={openCreateModal} className={blackControl}>
          + New Reservation
        </button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today" value={todayCount} detail="Reservations on the floor" />
        <MetricCard label="Upcoming" value={upcomingCount} detail="Confirmed future covers" />
        <MetricCard label="Completed" value={completedCount} detail="Finished service records" />
        <MetricCard label="Cancelled" value={cancelledCount} detail="Removed from service" />
      </section>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-neutral-950">
              {filteredReservations.length}{" "}
              {filteredReservations.length === 1 ? "reservation" : "reservations"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "today", "upcoming", "completed", "cancelled"] as Filter[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFilter(item);
                      setPage(1);
                    }}
                    className={filter === item ? blackControl : secondaryControl}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          </div>
          <label className="block w-full text-xs font-black uppercase tracking-[0.18em] text-neutral-500 lg:w-96">
            Search reservations
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by guest, phone, location, or notes"
              className="mt-2 h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold normal-case tracking-normal text-neutral-950 outline-none transition focus:border-neutral-950"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-panel">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
              <tr className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {pagedReservations.map((reservation) => (
                <tr
                  key={reservation.id}
                  className="align-top transition hover:bg-neutral-50"
                >
                  <td className="px-6 py-5">
                    <p className="whitespace-nowrap font-black tracking-tight text-neutral-950">
                      {reservation.customerName}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-sm font-bold text-neutral-500">
                      {reservation.phoneNumber}
                    </p>
                    {reservation.customerEmail ? (
                      <p className="mt-1 whitespace-nowrap text-sm font-bold text-neutral-500">
                        {reservation.customerEmail}
                      </p>
                    ) : null}
                    {reservation.notes ? (
                      <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                        {reservation.notes}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-5 text-sm font-black">{reservation.partySize}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold">
                    {formatDate(reservation.date)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold">
                    {reservation.time}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold">
                    {reservation.locationName}
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={reservation.status} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(reservation.id)}
                        className={secondaryControl}
                      >
                        Edit
                      </button>
                      {reservation.status !== "COMPLETED" ? (
                        <StatusAction
                          id={reservation.id}
                          status="COMPLETED"
                          label="Complete"
                        />
                      ) : null}
                      {reservation.status !== "CANCELLED" ? (
                        <button
                          type="button"
                          onClick={() => setConfirmIntent({ type: "cancel", reservation })}
                          className={secondaryControl}
                        >
                          Cancel
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmIntent({ type: "delete", reservation })}
                        className={deleteControl}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-lg font-black text-neutral-950">
                      No reservations found.
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-500">
                      Adjust your search or create a new reservation.
                    </p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className={`mt-5 ${blackControl}`}
                    >
                      + New Reservation
                    </button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-neutral-500">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className={`${secondaryControl} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className={`${secondaryControl} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <ReservationFormModal
        isOpen={isFormOpen}
        reservation={editingReservation}
        locations={locations}
        onClose={() => {
          setIsFormOpen(false);
          setEditingId(null);
        }}
      />
      <ConfirmDialog intent={confirmIntent} onClose={() => setConfirmIntent(null)} />
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="min-h-36 rounded-lg border border-neutral-200 bg-white p-6 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_60px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <p className="mt-5 text-5xl font-black tracking-tight text-neutral-950">{value}</p>
      <p className="mt-3 text-sm font-bold text-neutral-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const isConfirmed = status === "CONFIRMED";
  const isCancelled = status === "CANCELLED";

  return (
    <span
      className={`inline-flex h-8 items-center rounded border px-3 text-xs font-black uppercase tracking-[0.14em] ${
        isConfirmed
          ? "border-neutral-950 bg-neutral-950 text-white"
          : isCancelled
            ? "border-neutral-300 bg-white text-neutral-500"
            : "border-neutral-200 bg-neutral-100 text-neutral-700"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function StatusAction({
  id,
  status,
  label,
}: {
  id: string;
  status: ReservationStatus;
  label: string;
}) {
  return (
    <form action={updateReservationStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={blackControl}>{label}</button>
    </form>
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
    ? "Are you sure you want to delete this reservation? This action cannot be undone."
    : "Are you sure you want to cancel this reservation?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-panel transition duration-200">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
          Confirm action
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-neutral-950">
          {intent.reservation.customerName}
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryControl}>
            Cancel
          </button>
          {isDelete ? (
            <form action={deleteReservationAction}>
              <input type="hidden" name="id" value={intent.reservation.id} />
              <button className={deleteControl}>Delete</button>
            </form>
          ) : (
            <form action={updateReservationStatusAction}>
              <input type="hidden" name="id" value={intent.reservation.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <button className={deleteControl}>Cancel</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ReservationFormModal({
  isOpen,
  reservation,
  locations,
  onClose,
}: {
  isOpen: boolean;
  reservation: ReservationRowData | null;
  locations: LocationOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-panel transition duration-200">
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
              Reservation book
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
              {reservation ? "Edit reservation" : "New reservation"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={secondaryControl}>
            Close
          </button>
        </div>
        <div className="max-h-[calc(92vh-104px)] overflow-y-auto px-6 py-6">
          <ReservationForm
            reservation={reservation}
            locations={locations}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={(formData) => {
              startTransition(async () => {
                if (reservation) {
                  await updateReservationAction(formData);
                } else {
                  await createReservationAction(formData);
                }
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ReservationForm({
  reservation,
  locations,
  isPending,
  onCancel,
  onSubmit,
}: {
  reservation: ReservationRowData | null;
  locations: LocationOption[];
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [time, setTime] = useState(reservation?.time ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({
    time: getReservationTimeError(reservation?.time ?? ""),
  });
  const timeError = fieldErrors.time;
  const isTimeInvalid = Boolean(timeError);

  function updateFieldError(name: string, error: string) {
    setFieldErrors((current) => {
      if (current[name] === error) {
        return current;
      }

      return { ...current, [name]: error };
    });
  }

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextTime = event.target.value;
    setTime(nextTime);
    updateFieldError("time", getReservationTimeError(nextTime));
  }

  function handleSubmit(formData: FormData) {
    const nextTime = String(formData.get("time") ?? "");
    const nextTimeError = getReservationTimeError(nextTime);

    if (nextTimeError) {
      setTime(nextTime);
      updateFieldError("time", nextTimeError);
      return;
    }

    onSubmit(formData);
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="id" value={reservation?.id ?? ""} />
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          name="customerName"
          label="Customer name"
          defaultValue={reservation?.customerName ?? ""}
          required
        />
        <Field
          name="customerEmail"
          label="Customer email"
          type="email"
          defaultValue={reservation?.customerEmail ?? ""}
        />
        <Field
          name="phoneNumber"
          label="Phone number"
          defaultValue={reservation?.phoneNumber ?? ""}
          required
        />
        <Field
          name="partySize"
          label="Party size"
          type="number"
          min="1"
          defaultValue={reservation?.partySize ?? ""}
          required
        />
        <label className="block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
          Status
          <select
            name="status"
            defaultValue={reservation?.status ?? "CONFIRMED"}
            className="mt-2 h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-950 outline-none transition focus:border-neutral-950"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <Field
          name="date"
          label="Date"
          type="date"
          defaultValue={reservation?.date ?? ""}
          required
        />
        <ValidatedField
          name="time"
          label="Time"
          type="time"
          value={time}
          onChange={handleTimeChange}
          error={timeError}
          required
        />
      </div>
      <label className="mt-5 block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
        Location
        <select
          name="locationId"
          defaultValue={reservation?.locationId ?? ""}
          required
          className="mt-2 h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-950 outline-none transition focus:border-neutral-950"
        >
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-5 block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
        Notes
        <textarea
          name="notes"
          rows={5}
          defaultValue={reservation?.notes ?? ""}
          className="mt-2 w-full rounded border border-neutral-300 bg-white px-3 py-3 text-sm font-bold text-neutral-950 outline-none transition focus:border-neutral-950"
        />
      </label>
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryControl}>
          Cancel
        </button>
        <button
          disabled={isPending || isTimeInvalid}
          className={`${blackControl} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {isPending ? "Saving" : reservation ? "Save changes" : "Create reservation"}
        </button>
      </div>
    </form>
  );
}

function ValidatedField({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
      {label}
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`mt-2 h-10 w-full rounded border bg-white px-3 text-sm font-bold text-neutral-950 outline-none transition focus:border-neutral-950 ${
          error ? "border-red-700 focus:border-red-700" : "border-neutral-300"
        } ${className}`}
      />
      {error ? (
        <p className="mt-2 text-sm font-black normal-case tracking-normal text-red-700">
          {error}
        </p>
      ) : null}
    </label>
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
