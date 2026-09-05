import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { getModule } from "@/lib/modules";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GsmFallbackModule } from "@/features/gsm-fallback/GsmFallbackModule";
import { PakSignPortalModule } from "@/features/psl-portal/PakSignPortalModule";
import { VisionDiagnosticsModule } from "@/features/vision-diagnostics/VisionDiagnosticsModule";
import { MaternalMonitorModule } from "@/features/maternal-monitor/MaternalMonitorModule";
import { FloodRescueModule } from "@/features/flood-rescue/FloodRescueModule";
import { VoiceTriageModule } from "@/features/voice-triage/VoiceTriageModule";
import { BloodMatcherModule } from "@/features/blood-matcher/BloodMatcherModule";
import { TeleClinicModule } from "@/features/tele-clinic/TeleClinicModule";
import { BhuDispatcherModule } from "@/features/bhu-dispatcher/BhuDispatcherModule";
import { HospitalMeshModule } from "@/features/icu/HospitalMeshModule";
import { SymptomReportsModule } from "@/features/epidemic-heatmap/SymptomReportsModule";
import { FirstAidModule } from "@/features/first-aid/FirstAidModule";
import { CnicVaultModule } from "@/features/cnic-vault/CnicVaultModule";
import { Field } from "@/components/shared/Field";
import { SelectField } from "@/components/shared/SelectField";
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, type TriageChatMessage } from "@/lib/groq";

export const Route = createFileRoute("/module/$moduleId")({
  ssr: false,
  component: ModuleWorkspace,
});

const backendContracts: Record<number, { table?: string; endpoint?: string; note: string }> = {
  1: {
    table: "hospitals",
    note: "Live ICU beds and facility telemetry will appear when the hospitals table is exposed in this Supabase project.",
  },
  2: {
    endpoint: "SMS gateway / Edge Function",
    note: "The UI is ready for a server-side SMS provider, but no SMS Edge Function is present in the supplied project.",
  },
  3: {
    table: "patients",
    note: "CNIC history requires the patients table with row-level security policies for authenticated operators.",
  },
  4: {
    endpoint: "PSL translation service",
    note: "Camera translation requires a deployed inference endpoint; the old UI did not include a production endpoint.",
  },
  6: {
    endpoint: "Prescription OCR / drug safety API",
    note: "No OCR or drug-safety API contract was present in the old frontend or supplied backend.",
  },
  7: {
    table: "symptom_reports",
    note: "Heatmapping needs a symptom-report event table and a geospatial aggregation endpoint.",
  },
  8: {
    endpoint: "Mental-health assistant",
    note: "A server-side AI function is required so provider credentials are not exposed in the browser.",
  },
  9: {
    endpoint: "Voice triage assistant",
    note: "The old UI called Groq directly from the browser. This needs a server-side proxy before production use.",
  },
  10: {
    table: "blood_donors / blood_requests",
    note: "Donor matching requires both blood tables and authenticated insert/select policies.",
  },
  12: {
    table: "bhu_vans / bhu_visits",
    note: "Fleet dispatch requires both BHU tables and authenticated operator policies.",
  },
  15: {
    note: "This module is available as an offline clinical decision guide below; it does not invent facility or inventory data.",
  },
  16: {
    table: "immunization_patients / vaccine_events",
    note: "Immunization tracking requires patient and vaccine-event tables plus reminder delivery configuration.",
  },
};

function ModuleWorkspace() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { moduleId } = Route.useParams();
  const id = Number(moduleId);
  const module = getModule(id);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, navigate, session]);

  if (loading || !session)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  if (!module)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Module not found.
      </div>
    );

  if (id === 1) return <HospitalMeshModule />;
  if (id === 2) return <GsmFallbackModule />;
  if (id === 3) return <CnicVaultModule />;
  if (id === 4) return <PakSignPortalModule />;
  if (id === 6) return <PrescriptionSafetyModule />;
  if (id === 5) return <VisionDiagnosticsModule />;
  if (id === 7) return <SymptomReportsModule />;
  if (id === 8) return <MentalHealthModule />;
  if (id === 9) return <VoiceTriageModule />;
  if (id === 10) return <BloodMatcherModule />;
  if (id === 12) return <BhuDispatcherModule />;
  if (id === 11) return <TeleClinicModule />;
  if (id === 13) return <FloodRescueModule />;
  if (id === 14) return <MaternalMonitorModule />;
  if (id === 15) return <FirstAidModule />;
  if (id === 16) return <ImmunizationModule />;
  return <BackendStatusModule moduleId={id} />;
}

function ModuleHeader({
  title,
  category,
  icon: Icon,
}: {
  title: string;
  category: string;
  icon: LucideIcon;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 lg:px-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to console
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-surface">
            <Icon className="size-4" />
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{title}</p>
            <p className="eyebrow">{category}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function BackendStatusModule({ moduleId }: { moduleId: number }) {
  const module = getModule(moduleId)!;
  const contract = backendContracts[moduleId] ?? {
    note: "No production backend contract was present in the supplied frontend.",
  };
  const Icon = module.icon;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={Icon} />
      <main className="mx-auto max-w-4xl px-5 py-16 lg:px-10">
        <div className="rounded-3xl border border-border bg-card p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface">
            <Icon className="size-5" />
          </span>
          <p className="eyebrow mt-8">Backend contract</p>
          <h1 className="mt-3 font-display text-4xl font-bold">{module.title}</h1>
          <p className="mt-4 text-muted-foreground">{module.desc}</p>
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Waiting for a live service contract
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
              {contract.note}
            </p>
            {contract.table && (
              <p className="mt-3 font-mono text-xs text-amber-800 dark:text-amber-200">
                Expected table: {contract.table}
              </p>
            )}
            {contract.endpoint && (
              <p className="mt-3 font-mono text-xs text-amber-800 dark:text-amber-200">
                Expected endpoint: {contract.endpoint}
              </p>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Return to console <ArrowLeft className="size-4 rotate-180" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

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

function ImmunizationModule() {
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
// ============================================================
// MODULE 6 — Prescription OCR & Drug Safety (AI-powered via Groq Vision)
// ============================================================

// NOTE: this calls Groq directly from the browser using VITE_GROQ_API_KEY,
// matching the same (temporary, client-side) pattern already used by the
// Voice Triage and Mental Health modules in this file. It needs the same
// server-side proxy treatment before production use — see the note in
// backendContracts[6] above.
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

type PrescriptionAnalysis = {
  medicines: string[];
  confidence: "high" | "medium" | "low";
  notes: string;
};

const PRESCRIPTION_SYSTEM_PROMPT = `You are a careful medical prescription reader. You will be shown a photo of a handwritten or printed prescription (may be in English or Urdu/Roman Urdu).

Your job:
1. Read the image carefully and extract every distinct medicine name you can identify. Normalize each to its common generic or brand name (e.g. "Panadol" not "panadol tab 500mg bd").
2. Ignore dosage instructions, doctor details, patient details, and letterhead text — only return medicine names.
3. Judge how confident you are in your reading overall.

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "medicines": ["<medicine name>", "<medicine name>", ...],
  "confidence": "high" | "medium" | "low",
  "notes": "<one short sentence on anything illegible or uncertain, or empty string if fully clear>"
}

If you cannot read any medicine names at all, return an empty medicines array and explain why in "notes".`;

function parsePrescriptionJSON(rawText: string): PrescriptionAnalysis {
  let cleaned = rawText.trim();
  // Some reasoning-capable models prepend a <think>...</think> block before the answer.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  if (!cleaned) {
    return {
      medicines: [],
      confidence: "low",
      notes: "The AI returned an empty response. Please try again.",
    };
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<PrescriptionAnalysis>;
    const validConfidence = ["high", "medium", "low"];
    if (!Array.isArray(parsed.medicines)) throw new Error("Invalid medicines array");
    if (!parsed.confidence || !validConfidence.includes(parsed.confidence)) {
      parsed.confidence = "low";
    }
    return {
      medicines: parsed.medicines
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
      confidence: parsed.confidence as PrescriptionAnalysis["confidence"],
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return {
      medicines: [],
      confidence: "low",
      notes: "Could not understand the AI response. Try a clearer, well-lit photo.",
    };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function analyzePrescriptionImage(imageDataUrl: string): Promise<PrescriptionAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: "system", content: PRESCRIPTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this prescription and extract the medicine names." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429)
      throw new Error("Too many requests right now — please wait a moment and try again.");
    if (response.status === 404 || response.status === 400)
      throw new Error(
        "The configured vision model was rejected by Groq. Check that GROQ_VISION_MODEL matches a current model in your Groq account.",
      );
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message || "The AI service returned an error.",
    );
  }
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parsePrescriptionJSON(rawText);
}

// Reference table of well-established, high-risk multi-drug combinations.
// This is a static safety net, not an exhaustive clinical database — it
// catches common dangerous pairs by keyword so it still works even when
// OCR spells a medicine slightly differently than expected.
type InteractionRule = {
  keywordsA: string[];
  keywordsB: string[];
  severity: "severe" | "moderate";
  risk: string;
};

const DRUG_INTERACTION_RULES: InteractionRule[] = [
  {
    keywordsA: ["warfarin"],
    keywordsB: ["aspirin", "ibuprofen", "diclofenac", "naproxen"],
    severity: "severe",
    risk: "Combined blood-thinning effect — significantly raises bleeding risk.",
  },
  {
    keywordsA: ["sildenafil", "viagra", "tadalafil", "vardenafil"],
    keywordsB: ["nitrate", "nitroglycerin", "isosorbide"],
    severity: "severe",
    risk: "Can cause a sudden, severe drop in blood pressure.",
  },
  {
    keywordsA: ["tramadol", "fluoxetine", "sertraline", "paroxetine", "citalopram"],
    keywordsB: ["maoi", "phenelzine", "moclobemide", "selegiline"],
    severity: "severe",
    risk: "Risk of serotonin syndrome (agitation, high fever, rapid heart rate).",
  },
  {
    keywordsA: ["methotrexate"],
    keywordsB: ["ibuprofen", "diclofenac", "naproxen", "aspirin"],
    severity: "severe",
    risk: "NSAIDs can raise methotrexate levels to toxic amounts.",
  },
  {
    keywordsA: ["lithium"],
    keywordsB: ["ibuprofen", "diclofenac", "naproxen", "hydrochlorothiazide", "furosemide"],
    severity: "moderate",
    risk: "Can raise lithium levels and cause toxicity.",
  },
  {
    keywordsA: ["digoxin"],
    keywordsB: ["furosemide", "hydrochlorothiazide", "spironolactone"],
    severity: "moderate",
    risk: "Diuretic-induced low potassium can trigger digoxin toxicity.",
  },
  {
    keywordsA: ["clopidogrel"],
    keywordsB: ["omeprazole", "esomeprazole"],
    severity: "moderate",
    risk: "These PPIs can reduce clopidogrel's ability to prevent clots.",
  },
  {
    keywordsA: ["ciprofloxacin", "levofloxacin"],
    keywordsB: ["theophylline"],
    severity: "moderate",
    risk: "Can raise theophylline levels toward toxicity.",
  },
  {
    keywordsA: ["diazepam", "alprazolam", "clonazepam", "lorazepam"],
    keywordsB: ["tramadol", "morphine", "codeine", "oxycodone"],
    severity: "severe",
    risk: "Combined sedation raises the risk of dangerously slowed breathing.",
  },
  {
    keywordsA: ["lisinopril", "enalapril", "ramipril", "losartan"],
    keywordsB: ["spironolactone", "potassium"],
    severity: "moderate",
    risk: "Can push blood potassium to dangerously high levels.",
  },
  {
    keywordsA: ["metformin"],
    keywordsB: ["contrast dye", "iodinated contrast"],
    severity: "moderate",
    risk: "Contrast dye can worsen kidney function and raise lactic-acidosis risk with metformin.",
  },
  {
    keywordsA: ["simvastatin", "atorvastatin"],
    keywordsB: ["clarithromycin", "erythromycin"],
    severity: "moderate",
    risk: "These antibiotics can raise statin levels and muscle-damage risk.",
  },
];

type FlaggedInteraction = InteractionRule & { medicineA: string; medicineB: string };

function findInteractions(medicines: string[]): FlaggedInteraction[] {
  const flagged: FlaggedInteraction[] = [];
  for (let i = 0; i < medicines.length; i++) {
    for (let j = i + 1; j < medicines.length; j++) {
      const nameA = medicines[i].toLowerCase();
      const nameB = medicines[j].toLowerCase();
      for (const rule of DRUG_INTERACTION_RULES) {
        const aMatchesA = rule.keywordsA.some((keyword) => nameA.includes(keyword));
        const bMatchesB = rule.keywordsB.some((keyword) => nameB.includes(keyword));
        const aMatchesB = rule.keywordsA.some((keyword) => nameB.includes(keyword));
        const bMatchesA = rule.keywordsB.some((keyword) => nameA.includes(keyword));
        if ((aMatchesA && bMatchesB) || (aMatchesB && bMatchesA)) {
          flagged.push({ ...rule, medicineA: medicines[i], medicineB: medicines[j] });
        }
      }
    }
  }
  return flagged;
}

const MAX_PRESCRIPTION_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

// ------------------------------------------------------------
// Medicine guide — plain-language "what is this for" lookup,
// generated by the text model (no image needed here).
// ------------------------------------------------------------
type MedicineGuideEntry = {
  name: string;
  usedFor: string;
  category: string;
  commonSideEffects: string;
  precautions: string;
};

const MEDICINE_GUIDE_SYSTEM_PROMPT = `You are a careful, plain-language medicine information assistant for a healthcare app used in Pakistan. You will be given a list of medicine names (as read from a prescription, possibly slightly misspelled).

For EACH medicine in the list, provide a short, easy-to-understand guide covering: what it is normally used for, what category/class of drug it is, common (non-alarming) side effects, and key precautions (e.g. take with food, avoid alcohol, not for pregnant women, etc). Keep every field to one short sentence. Use simple words a non-medical person can understand. If you don't recognize a name, do your best guess based on similar-sounding known medicines, and say so briefly in "usedFor".

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "entries": [
    {
      "name": "<medicine name exactly as given>",
      "usedFor": "<one short sentence: what it treats>",
      "category": "<short drug class, e.g. 'Antibiotic (penicillin family)'>",
      "commonSideEffects": "<one short sentence>",
      "precautions": "<one short sentence>"
    }
  ]
}

Include exactly one entry per medicine given, in the same order, even if unsure.`;

function parseMedicineGuideJSON(rawText: string, medicines: string[]): MedicineGuideEntry[] {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const parsed = JSON.parse(cleaned) as { entries?: Partial<MedicineGuideEntry>[] };
    if (!Array.isArray(parsed.entries)) throw new Error("Invalid entries array");
    return parsed.entries.map((entry, index) => ({
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : medicines[index] ?? "Unknown",
      usedFor: typeof entry.usedFor === "string" && entry.usedFor.trim() ? entry.usedFor.trim() : "Not available.",
      category:
        typeof entry.category === "string" && entry.category.trim() ? entry.category.trim() : "Not available.",
      commonSideEffects:
        typeof entry.commonSideEffects === "string" && entry.commonSideEffects.trim()
          ? entry.commonSideEffects.trim()
          : "Not available.",
      precautions:
        typeof entry.precautions === "string" && entry.precautions.trim()
          ? entry.precautions.trim()
          : "Not available.",
    }));
  } catch {
    // Fall back to a stub entry per medicine so the UI can still show something useful.
    return medicines.map((name) => ({
      name,
      usedFor: "Could not fetch a guide for this medicine right now.",
      category: "Not available.",
      commonSideEffects: "Not available.",
      precautions: "Always confirm with a pharmacist or doctor.",
    }));
  }
}

async function fetchMedicineGuide(medicines: string[]): Promise<MedicineGuideEntry[]> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: MEDICINE_GUIDE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Medicines: ${JSON.stringify(medicines)}\n\nReply with the JSON object described in your instructions.`,
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429)
      throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message || "The AI service returned an error.",
    );
  }
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parseMedicineGuideJSON(rawText, medicines);
}

function PrescriptionSafetyModule() {
  const module = getModule(6)!;
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PrescriptionAnalysis | null>(null);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [newMedicine, setNewMedicine] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [guide, setGuide] = useState<MedicineGuideEntry[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);

  const interactions = findInteractions(medicines);

  const loadGuide = async () => {
    if (medicines.length === 0) {
      setGuideError("Add at least one medicine first.");
      return;
    }
    setGuideError("");
    setGuideLoading(true);
    try {
      const entries = await fetchMedicineGuide(medicines);
      setGuide(entries);
    } catch (guideErr) {
      setGuideError(guideErr instanceof Error ? guideErr.message : "Could not load the medicine guide.");
    } finally {
      setGuideLoading(false);
    }
  };

  const processFile = async (file: File) => {
    setError("");
    setResult(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (photo or scan of the prescription).");
      return;
    }
    if (file.size > MAX_PRESCRIPTION_IMAGE_BYTES) {
      setError("That image is larger than 8 MB — please choose a smaller photo.");
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setImagePreview(dataUrl);
    } catch {
      setError("Could not load that image. Please try another file.");
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  };

  const analyze = async () => {
    if (!imagePreview) {
      setError("Choose a prescription photo first.");
      return;
    }
    setError("");
    setAnalyzing(true);
    try {
      const analysis = await analyzePrescriptionImage(imagePreview);
      setResult(analysis);
      setMedicines(analysis.medicines);
      if (analysis.medicines.length === 0 && !analysis.notes) {
        setError("No medicine names could be read from this photo. Try a clearer image.");
      }
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  };

  const addMedicine = () => {
    const trimmed = newMedicine.trim();
    if (!trimmed) return;
    setMedicines((current) => [...current, trimmed]);
    setNewMedicine("");
  };

  const removeMedicine = (index: number) => {
    setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const reset = () => {
    setImagePreview("");
    setResult(null);
    setMedicines([]);
    setNewMedicine("");
    setError("");
    setIsDraggingOver(false);
    setGuide([]);
    setGuideError("");
    dragCounterRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI-assisted safety check</p>
          <h1 className="mt-3 font-display text-4xl font-bold">
            Prescription OCR &amp; drug safety.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Upload a photo of a handwritten or printed prescription. The AI reads the medicine
            names, and every pair is checked against a built-in list of well-known dangerous
            combinations.
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void handleFileChange(event)}
                className="hidden"
                id="prescription-file-input"
              />
              <label
                htmlFor="prescription-file-input"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors ${
                  isDraggingOver
                    ? "border-ring bg-ring/10"
                    : "border-border bg-surface hover:border-ring"
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Prescription preview"
                    className="max-h-56 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <Upload className="size-6 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isDraggingOver ? "Drop the photo here" : "Tap to upload, drag & drop, or take a photo"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG or PNG, up to 8 MB
                    </span>
                  </>
                )}
              </label>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <button
                onClick={() => void analyze()}
                disabled={!imagePreview || analyzing}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Reading prescription…
                  </>
                ) : (
                  "Analyze prescription"
                )}
              </button>
              <button
                onClick={reset}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold"
              >
                Clear
              </button>
              {result && (
                <p className="text-xs text-muted-foreground">
                  Reading confidence: <span className="font-semibold">{result.confidence}</span>
                  {result.notes ? ` — ${result.notes}` : ""}
                </p>
              )}
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </section>

        {(medicines.length > 0 || result) && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Detected medicines</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remove anything misread, or add a medicine the AI missed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {medicines.map((medicine, index) => (
                <span
                  key={`${medicine}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm"
                >
                  {medicine}
                  <button
                    onClick={() => removeMedicine(index)}
                    aria-label={`Remove ${medicine}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              {medicines.length === 0 && (
                <p className="text-sm text-muted-foreground">No medicines added yet.</p>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={newMedicine}
                onChange={(event) => setNewMedicine(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMedicine();
                  }
                }}
                placeholder="Add a medicine name"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              <button
                onClick={addMedicine}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
            {medicines.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => void loadGuide()}
                  disabled={guideLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {guideLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Getting medicine guide…
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-4" /> Get full medicine guide
                    </>
                  )}
                </button>
                {guideError && (
                  <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {guideError}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {guide.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Medicine guide</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What each medicine is for, in plain language. This is general information, not a
              substitute for a pharmacist or doctor.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {guide.map((entry, index) => (
                <article key={`${entry.name}-${index}`} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                    {entry.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.category}
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-medium">Used for</dt>
                      <dd className="text-muted-foreground">{entry.usedFor}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Common side effects</dt>
                      <dd className="text-muted-foreground">{entry.commonSideEffects}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Precautions</dt>
                      <dd className="text-muted-foreground">{entry.precautions}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {medicines.length >= 2 && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Contraindication check</h2>
            {interactions.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> No known dangerous
                combinations found among these medicines in our reference list.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {interactions.map((interaction, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-4 ${
                      interaction.severity === "severe"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-2 font-semibold ${
                        interaction.severity === "severe"
                          ? "text-red-700 dark:text-red-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <ShieldAlert className="size-4 shrink-0" />
                      {interaction.medicineA} + {interaction.medicineB} —{" "}
                      {interaction.severity === "severe" ? "Severe risk" : "Moderate risk"}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {interaction.risk}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          This tool is an informational aid only. OCR and the reference list are not exhaustive —
          always confirm medicines and interactions with a pharmacist or doctor before use.
        </div>
      </main>
    </div>
  );
}

// ============================================================
// MODULE 8 — Urdu Mental Health Companion (AI-powered via Groq)
// ============================================================

const CRISIS_KEYWORDS = [
  "kill myself", "end my life", "suicide", "want to die", "harm myself",
  "hurt myself", "no reason to live", "better off dead", "end it all",
  "khudkushi", "khud kushi", "marna chahta", "marna chahti", "khatam kar",
  "zindagi khatam", "jeena nahi chahta", "jeena nahi chahti",
  "khud ko nuksan", "apne aap ko nuksan",
];

function containsCrisisLanguage(text: string) {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// NOTE: these helpline numbers were provided by a team member as
// verified/active Pakistani mental-health resources. Please do a final
// cross-check (official website/social media) before relying on them
// in front of real users, since contact numbers can change over time.
const MENTAL_HEALTH_HELPLINES = [
  { name: "Umang Pakistan (24/7 Suicide Prevention)", numbers: ["0317-4288665", "0311-7786264", "0310-9990828"] },
  { name: "Taskeen Health Initiative", numbers: ["0316-8275336", "0317-1719452"] },
  { name: "Rozan Counseling Helpline (Mon–Fri, 9am–5pm)", numbers: ["0304-1111741", "051-2890505"] },
];

const MENTAL_HEALTH_SYSTEM_PROMPT = `You are talking to someone as a mature, emotionally grounded older sibling would - the kind of person people go to because they actually listen and give real, thoughtful responses, not because they say comforting-sounding things. This is for HayatPulse AI, used in Pakistan. You are NOT a therapist, psychiatrist, or doctor, and must never pretend to be one.

TONE - THIS IS THE MOST IMPORTANT PART:
- Talk like a real person, not a script. Vary your sentence structure completely between replies.
- BANNED PHRASES: never use generic therapy-speak clichés like "I'm here to listen", "your feelings matter", "you are worthy of love", "that must be hard", "I hear you", "you are not alone".
- React specifically to what they said, not to the general category of emotion.
- It's fine to be a little direct or even gently push back if something they say seems like a thought spiral, rather than always validating first.
- Keep it short - 1-3 sentences, under 35 words total.
- Ask at most one question, and only when it's natural.
- Only bring up talking to a trusted person/professional when it genuinely fits, phrased differently each time.
- STAY ON TOPIC: only discuss feelings and emotional wellbeing. If asked something unrelated (recipes, homework, facts), don't answer it — gently and briefly redirect back, varying how you do this each time.
- Do not repeat sentence structures or phrases you've already used earlier in this conversation.

HARD RULES:
- Reply in whichever language (Urdu or English) the person is writing in, matching their language.
- Never diagnose, never give clinical/medical advice.
- If self-harm or suicide comes up, be calm and direct, encourage reaching out to a real person immediately - do not provide methods, means, or unsafe content.
- Never be dismissive of something that's clearly serious to them.

Reply with ONLY your message text - plain text, no JSON, no markdown, no quotation marks around it.`;

async function getCompanionReply(history: TriageChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: MENTAL_HEALTH_SYSTEM_PROMPT }, ...history],
      temperature: 0.85,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  let raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  raw = raw.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  return raw || "Sorry, I had trouble understanding. Could you tell me again?";
}

function MentalHealthModule() {
  const module = getModule(8)!;
  const [messages, setMessages] = useState<TriageChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError("");
    if (containsCrisisLanguage(text)) setShowCrisisBanner(true);
    const history: TriageChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setStatus("thinking");
    try {
      const reply = await getCompanionReply(history);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI companion — emotional support only</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Talk it through.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            This is not a therapist and cannot diagnose. For serious concerns, please reach out
            to a trusted person or professional.
          </p>
        </div>

        {showCrisisBanner && (
          <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 text-red-700 dark:text-red-300">
            <p className="mb-3 font-semibold">
              You are not alone. If you&apos;re thinking about harming yourself, please contact
              one of these numbers right now:
            </p>
            <div className="space-y-2 text-sm">
              {MENTAL_HEALTH_HELPLINES.map((h) => (
                <div key={h.name}>
                  <span className="font-semibold">{h.name}:</span> {h.numbers.join(" / ")}
                </div>
              ))}
              <div>
                <span className="font-semibold">Emergency:</span> Rescue 1122 · Edhi Foundation 115
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground"
              >
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-surface p-4 text-sm"
              >
                {m.content}
              </div>
            ),
          )}
        </section>

        {status === "thinking" && <p className="text-sm text-muted-foreground">Thinking…</p>}

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Type here…"
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
          />
          <button
            onClick={() => void send()}
            disabled={status === "thinking" || !input.trim()}
            className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
