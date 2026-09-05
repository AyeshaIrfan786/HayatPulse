import { useEffect, useState} from "react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";
import { supabase } from "@/lib/supabase";
import { useMemo } from "react";
import {Plus, Bell, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

// Pakistan EPI schedule vaccines — used as quick-pick suggestions only;
// operators can still type any custom vaccine name.
const EPI_VACCINE_SUGGESTIONS = [
  "BCG",
  "OPV-0",
  "Pentavalent-1",
  "Pentavalent-2",
  "Pentavalent-3",
  "PCV-1",
  "PCV-2",
  "PCV-3",
  "IPV",
  "Rotavirus-1",
  "Rotavirus-2",
  "Measles-1",
  "Measles-2",
];

type ImmunizationPatient = {
  id: string;
  child_name: string;
  guardian_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  district: string | null;
  created_at: string | null;
};

type VaccineEvent = {
  id: string;
  patient_id: string;
  vaccine_name: string;
  administered_at: string | null;
  next_due_at: string | null;
  status: string;
  created_at: string | null;
  immunization_patients?: { child_name: string } | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function VaccineChildImmunizationModule() {
  const module = getModule(16)!;
  const [patients, setPatients] = useState<ImmunizationPatient[]>([]);
  const [events, setEvents] = useState<VaccineEvent[]>([]);
  const [form, setForm] = useState({
    child_name: "",
    guardian_name: "",
    phone: "",
    date_of_birth: "",
    district: "",
  });
  const [eventForm, setEventForm] = useState({
    patient_id: "",
    vaccine_name: "",
    next_due_at: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingChild, setSavingChild] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const loadPatients = async () => {
    const { data, error: queryError } = await supabase
      .from("immunization_patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setPatients((data ?? []) as ImmunizationPatient[]);
  };

  const loadEvents = async () => {
    const { data, error: queryError } = await supabase
      .from("vaccine_events")
      .select("*, immunization_patients(child_name)")
      .order("next_due_at", { ascending: true });
    if (queryError) setError(queryError.message);
    else setEvents((data ?? []) as VaccineEvent[]);
  };

  useEffect(() => {
    void loadPatients();
    void loadEvents();
    const channel = supabase
      .channel("hayatpulse-immunization")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "immunization_patients" },
        () => void loadPatients(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vaccine_events" },
        () => void loadEvents(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const saveChild = async () => {
    setError("");
    setMessage("");
    if (!form.child_name.trim()) {
      setError("Child name is required.");
      return;
    }
    setSavingChild(true);
    const { error: insertError } = await supabase
      .from("immunization_patients")
      .insert({ ...form, date_of_birth: form.date_of_birth || null });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Child added to the live immunization registry.");
      setForm({ child_name: "", guardian_name: "", phone: "", date_of_birth: "", district: "" });
      await loadPatients();
    }
    setSavingChild(false);
  };

  const saveEvent = async () => {
    setError("");
    setMessage("");
    if (!eventForm.patient_id) {
      setError("Choose which child this vaccine is for.");
      return;
    }
    if (!eventForm.vaccine_name.trim()) {
      setError("Vaccine name is required.");
      return;
    }
    setSavingEvent(true);
    const { error: insertError } = await supabase.from("vaccine_events").insert({
      patient_id: eventForm.patient_id,
      vaccine_name: eventForm.vaccine_name.trim(),
      next_due_at: eventForm.next_due_at || null,
      status: "scheduled",
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Vaccine added to the calendar.");
      setEventForm({ patient_id: eventForm.patient_id, vaccine_name: "", next_due_at: "" });
      await loadEvents();
    }
    setSavingEvent(false);
  };

  const markReminderSent = async (eventId: string) => {
    setError("");
    const { error: updateError } = await supabase
      .from("vaccine_events")
      .update({ status: "reminder_sent" })
      .eq("id", eventId);
    if (updateError) setError(updateError.message);
    else await loadEvents();
  };

  const markAdministered = async (eventId: string) => {
    setError("");
    const { error: updateError } = await supabase
      .from("vaccine_events")
      .update({ status: "administered", administered_at: todayISO() })
      .eq("id", eventId);
    if (updateError) setError(updateError.message);
    else await loadEvents();
  };

  const dueSoonCutoff = daysFromToday(7);
  const dueAndOverdue = useMemo(
    () =>
      events
        .filter((event) => event.status !== "administered" && event.next_due_at)
        .filter((event) => (event.next_due_at as string) <= dueSoonCutoff)
        .sort((a, b) => (a.next_due_at ?? "").localeCompare(b.next_due_at ?? "")),
    [events, dueSoonCutoff],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live immunization registry</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Child immunization tracker.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Register children, schedule vaccines on a live calendar, and track who is due or
            overdue for their next dose.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Register a child</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field
              label="Child name *"
              value={form.child_name}
              onChange={(value) => setForm({ ...form, child_name: value })}
            />
            <Field
              label="Guardian"
              value={form.guardian_name}
              onChange={(value) => setForm({ ...form, guardian_name: value })}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Field
              label="Date of birth"
              type="date"
              value={form.date_of_birth}
              onChange={(value) => setForm({ ...form, date_of_birth: value })}
            />
            <Field
              label="District"
              value={form.district}
              onChange={(value) => setForm({ ...form, district: value })}
            />
          </div>
          <button
            onClick={() => void saveChild()}
            disabled={savingChild}
            className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {savingChild ? "Adding…" : "Add child"}
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Schedule a vaccine</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-sm font-medium">Child *</span>
              <select
                value={eventForm.patient_id}
                onChange={(event) => setEventForm({ ...eventForm, patient_id: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              >
                <option value="">Select a child…</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.child_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Vaccine name *</span>
              <input
                type="text"
                list="epi-vaccine-suggestions"
                value={eventForm.vaccine_name}
                onChange={(event) =>
                  setEventForm({ ...eventForm, vaccine_name: event.target.value })
                }
                placeholder="e.g. Pentavalent-1"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              <datalist id="epi-vaccine-suggestions">
                {EPI_VACCINE_SUGGESTIONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <Field
              label="Next due date"
              type="date"
              value={eventForm.next_due_at}
              onChange={(value) => setEventForm({ ...eventForm, next_due_at: value })}
            />
          </div>
          <button
            onClick={() => void saveEvent()}
            disabled={savingEvent || patients.length === 0}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-4" /> {savingEvent ? "Saving…" : "Add to calendar"}
          </button>
          {patients.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Register a child above before scheduling a vaccine.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Bell className="size-5" />
            <h2 className="font-display text-2xl font-bold">Due &amp; overdue reminders</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Shows every scheduled vaccine due within 7 days or already overdue. Flagging a
            reminder here marks it in the live registry — actually dispatching an SMS still needs
            a backend SMS gateway (see Module 2).
          </p>
          <div className="mt-5 space-y-3">
            {dueAndOverdue.map((event) => {
              const isOverdue = (event.next_due_at as string) < todayISO();
              return (
                <div
                  key={event.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    isOverdue
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  <div>
                    <p className="font-semibold">
                      {event.immunization_patients?.child_name ?? "Unknown child"} —{" "}
                      {event.vaccine_name}
                    </p>
                    <p
                      className={`mt-1 flex items-center gap-1.5 text-sm ${
                        isOverdue
                          ? "text-red-700 dark:text-red-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <CalendarClock className="size-3.5" />
                      {isOverdue ? "Overdue since" : "Due"} {event.next_due_at}
                      {event.status === "reminder_sent" && " · reminder flagged"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void markReminderSent(event.id)}
                      disabled={event.status === "reminder_sent"}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      <Bell className="size-3.5" />
                      {event.status === "reminder_sent" ? "Reminder flagged" : "Flag reminder"}
                    </button>
                    <button
                      onClick={() => void markAdministered(event.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      <CheckCircle2 className="size-3.5" /> Mark administered
                    </button>
                  </div>
                </div>
              );
            })}
            {dueAndOverdue.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing due or overdue in the next 7 days.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Registered children</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => {
              const childEvents = events.filter((event) => event.patient_id === patient.id);
              return (
                <article
                  key={patient.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <p className="font-semibold">{patient.child_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Guardian: {patient.guardian_name ?? "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {patient.district ?? "District unavailable"} · DOB{" "}
                    {patient.date_of_birth ?? "—"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {childEvents.length} vaccine{childEvents.length === 1 ? "" : "s"} on calendar
                  </p>
                </article>
              );
            })}
            {patients.length === 0 && (
              <p className="text-sm text-muted-foreground">No children returned by Supabase.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}