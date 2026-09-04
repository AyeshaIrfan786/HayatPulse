import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { getModule } from "@/lib/modules";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { HospitalMeshModule } from "@/features/icu/HospitalMeshModule";
import { GsmFallbackModule } from "@/features/gsm-fallback/GsmFallbackModule";
import { PakSignPortalModule } from "@/features/psl-portal/PakSignPortalModule";

export const Route = createFileRoute("/module/$moduleId")({
  ssr: false,
  component: ModuleWorkspace,
});

// ------------------------------------------------------------
// Minimal ambient types for the (non-standard) Web Speech API.
// Not part of the default TS DOM lib — only what this file uses.
// Speech recognition currently ships in Chrome/Edge/Android WebView;
// unsupported browsers fall back to text input only.
// ------------------------------------------------------------
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultLike[] & { length: number };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type FloodForm = {
  reporter_name: string;
  phone: string;
  people_count: string;
  severity: "low" | "medium" | "critical";
  notes: string;
  latitude: string;
  longitude: string;
};

type FloodPin = {
  id: string;
  reporter_name: string | null;
  phone: string | null;
  people_count: number | null;
  severity: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  created_at: string | null;
};

const initialFloodForm: FloodForm = {
  reporter_name: "",
  phone: "",
  people_count: "",
  severity: "medium",
  notes: "",
  latitude: "",
  longitude: "",
};

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

function FloodRescueModule() {
  const module = getModule(13)!;
  const [pins, setPins] = useState<FloodPin[]>([]);
  const [form, setForm] = useState<FloodForm>(initialFloodForm);
  const [loadingPins, setLoadingPins] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPins = async () => {
    setLoadingPins(true);
    const { data, error: queryError } = await supabase
      .from("flood_pins")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setPins((data ?? []) as FloodPin[]);
    setLoadingPins(false);
  };

  useEffect(() => {
    void loadPins();
    const channel = supabase
      .channel("hayatpulse-flood-rescue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flood_pins" },
        () => void loadPins(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const setField = <K extends keyof FloodForm>(field: K, value: FloodForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device. Enter coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setField("latitude", position.coords.latitude.toFixed(6));
        setField("longitude", position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Enter coordinates manually.");
        setLocating(false);
      },
    );
  };

  const submitPin = async () => {
    setError("");
    setMessage("");
    if (!form.people_count || !form.latitude || !form.longitude) {
      setError("People count, latitude, and longitude are required.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("flood_pins").insert({
      reporter_name: form.reporter_name || null,
      phone: form.phone || null,
      people_count: Number(form.people_count),
      severity: form.severity,
      notes: form.notes || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      status: "pending",
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Rescue pin submitted to the live Supabase grid.");
      setForm(initialFloodForm);
      await loadPins();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={MapPin} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live Supabase module</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Drop a rescue pin.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Create a rescue request in the connected <code>flood_pins</code> table. Other
            authenticated operators see updates through realtime events.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">New request</h2>
              <button
                onClick={useLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {locating ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="size-3.5" />
                )}{" "}
                Use my location
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Reporter name"
                value={form.reporter_name}
                onChange={(value) => setField("reporter_name", value)}
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) => setField("phone", value)}
              />
              <Field
                label="People count *"
                type="number"
                value={form.people_count}
                onChange={(value) => setField("people_count", value)}
              />
              <label className="block">
                <span className="text-sm font-medium">Severity *</span>
                <select
                  value={form.severity}
                  onChange={(event) =>
                    setField("severity", event.target.value as FloodForm["severity"])
                  }
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <Field
                label="Latitude *"
                value={form.latitude}
                onChange={(value) => setField("latitude", value)}
              />
              <Field
                label="Longitude *"
                value={form.longitude}
                onChange={(value) => setField("longitude", value)}
              />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
                placeholder="Water level, access route, medical needs…"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
              >
                {message}
              </p>
            )}
            <button
              onClick={() => void submitPin()}
              disabled={saving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}{" "}
              Submit live rescue pin
            </button>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Shared queue</p>
                <h2 className="mt-2 font-display text-2xl font-bold">Open rescue requests</h2>
              </div>
              <button
                onClick={() => void loadPins()}
                disabled={loadingPins}
                aria-label="Refresh rescue pins"
                className="rounded-full border border-border bg-surface p-3 disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${loadingPins ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {pins.length === 0 && !loadingPins && (
                <p className="rounded-2xl bg-surface p-5 text-sm text-muted-foreground">
                  No rescue pins have been submitted yet.
                </p>
              )}
              {pins.map((pin) => (
                <article key={pin.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {pin.people_count ?? 0} people · {pin.severity ?? "unknown"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pin.reporter_name || "Anonymous reporter"} · {pin.status || "pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                      {pin.status || "pending"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {pin.notes || "No additional notes."}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Coordinates: {pin.latitude}, {pin.longitude} ·{" "}
                    {pin.created_at
                      ? new Date(pin.created_at).toLocaleString()
                      : "Time unavailable"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        step={step}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const ROOM_ADJECTIVES = ["sehat", "shifa", "hayat", "amal", "nusrat", "rahat"];
const ROOM_WORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateRoomCode() {
  const adjective = ROOM_ADJECTIVES[Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += ROOM_WORD_CHARS[Math.floor(Math.random() * ROOM_WORD_CHARS.length)];
  }
  return `${adjective}-${suffix}`;
}

function normalizeRoomCode(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

function isValidRoomCode(input: string) {
  const normalized = normalizeRoomCode(input);
  return normalized.length >= 3 && normalized.length <= 50 && /^[a-z0-9-]+$/.test(normalized);
}

function buildJitsiRoomName(code: string) {
  return `HayatPulseTeleclinic-${normalizeRoomCode(code)}`;
}

const JITSI_SCRIPT_SRC = "https://meet.jit.si/external_api.js";

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi script.")));
      return;
    }
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi script."));
    document.body.appendChild(script);
  });
}

function TeleClinicModule() {
  const module = getModule(11)!;
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "in-call">("idle");
  const [audioOnly, setAudioOnly] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any | null>(null);

  const startCall = async (code: string) => {
    setError("");
    if (!isValidRoomCode(code)) {
      setError("Enter a valid room code (letters, numbers, and dashes, 3-50 characters).");
      return;
    }
    setStatus("loading");
    try {
      await loadJitsiScript();
      const JitsiMeetExternalAPI = (window as unknown as { JitsiMeetExternalAPI: any })
        .JitsiMeetExternalAPI;
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      const api = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: buildJitsiRoomName(code),
        parentNode: containerRef.current ?? undefined,
        width: "100%",
        height: "100%",
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: audioOnly },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
      apiRef.current = api;
      setStatus("in-call");
    } catch {
      setError("Could not start the video call. Check your internet connection and try again.");
      setStatus("idle");
    }
  };

  const endCall = () => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    setStatus("idle");
    setRoomCode("");
    setJoinCode("");
  };

  const toggleAudioOnly = () => {
    const next = !audioOnly;
    setAudioOnly(next);
    if (apiRef.current) {
      apiRef.current.executeCommand("toggleVideo");
    }
  };

  useEffect(() => {
    return () => {
      if (apiRef.current) apiRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live video module — no server required</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Connect a rural unit to a specialist.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Uses Jitsi Meet&apos;s free public server, loaded directly from their CDN. No account,
            API key, or backend service is required for this call to work.
          </p>
        </div>

        {status !== "in-call" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-bold">Create consultation room</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Generates a short room code you can read aloud over a phone call.
              </p>
              <button
                onClick={() => {
                  const code = generateRoomCode();
                  setRoomCode(code);
                  void startCall(code);
                }}
                disabled={status === "loading"}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {status === "loading" ? "Connecting…" : "Create consultation room"}
              </button>
              {roomCode && (
                <p className="mt-4 font-mono text-sm text-muted-foreground">
                  Room code: <span className="font-semibold text-foreground">{roomCode}</span>
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-bold">Join a room</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the code shared with you by the other party.
              </p>
              <div className="mt-6 flex gap-3">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="sehat-x7k2m"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
                />
                <button
                  onClick={() => void startCall(joinCode)}
                  disabled={status === "loading"}
                  className="shrink-0 rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  Join room
                </button>
              </div>
            </section>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {status === "in-call" && (
          <section className="rounded-3xl border border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Room: <span className="font-mono">{roomCode || joinCode}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={toggleAudioOnly}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold"
                >
                  {audioOnly ? "Turn video on" : "Audio only"}
                </button>
                <button
                  onClick={endCall}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  End call
                </button>
              </div>
            </div>
            <div
              ref={(node) => {
                containerRef.current = node;
              }}
              className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
            />
          </section>
        )}

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          Uses the free public Jitsi server — fine for pilot use, but a private/self-hosted Jitsi
          deployment is recommended before handling real patient consultations at scale.
        </div>
      </main>
    </div>
  );
}

const VISION_API_BASE =
  (import.meta.env["VITE_VISION_API_BASE"] as string | undefined) ?? "http://127.0.0.1:8000";
const MATERNAL_API_BASE =
  (import.meta.env["VITE_MATERNAL_API_BASE"] as string | undefined) ?? "http://127.0.0.1:8000";

async function extractApiErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  const detail = body?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI/Pydantic validation errors: [{ loc: [...], msg: "...", type: "..." }]
    return detail
      .map((item: { loc?: (string | number)[]; msg?: string }) => {
        const field = item.loc?.filter((part) => part !== "body").join(".") ?? "value";
        return `${field}: ${item.msg ?? "invalid value"}`;
      })
      .join("; ");
  }
  return fallback;
}

type VisionModality = "xray" | "skin" | "eye";

const VISION_MODALITIES: { key: VisionModality; label: string }[] = [
  { key: "xray", label: "Chest X-ray" },
  { key: "skin", label: "Skin lesion" },
  { key: "eye", label: "Eye / cataract" },
];

type VisionResult = {
  status: string;
  module: string;
  finding: string;
  confidence: number;
  disclaimer: string;
};

const VISION_FINDINGS: Record<VisionModality, { finding: string; confidence: number }[]> = {
  xray: [
    { finding: "No acute abnormality detected", confidence: 0.94 },
    { finding: "Possible mild opacity — left lower lobe", confidence: 0.78 },
  ],
  skin: [
    { finding: "Benign-appearing lesion", confidence: 0.88 },
    { finding: "Irregular borders detected — flag for review", confidence: 0.69 },
  ],
  eye: [
    { finding: "No signs of cataract", confidence: 0.91 },
    { finding: "Early lens clouding detected", confidence: 0.73 },
  ],
};

// Client-side fallback used whenever core_backend isn't reachable, so the
// module stays usable without a locally running FastAPI server.
function simulateVisionResult(modality: VisionModality): VisionResult {
  const pool = VISION_FINDINGS[modality];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    status: "simulated",
    module: modality,
    finding: pick.finding,
    confidence: pick.confidence,
    disclaimer:
      "Simulated result — core_backend wasn't reachable, so this is a demo screening, not a real model output.",
  };
}

function VisionDiagnosticsModule() {
  const module = getModule(5)!;
  const [modality, setModality] = useState<VisionModality>("xray");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState("");

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  };

  const submit = async () => {
    if (!file) {
      setError("Choose an image to analyse first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${VISION_API_BASE}/api/vision/${modality}`, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        throw new Error(await extractApiErrorMessage(response, `Request failed (${response.status})`));
      }
      const data = (await response.json()) as VisionResult;
      setResult(data);
    } catch {
      // core_backend isn't reachable (not running, wrong URL, CORS, etc.) —
      // fall back to a simulated result so the module stays usable.
      setResult(simulateVisionResult(modality));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Connected to core_backend ML models</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Run a pre-screening scan.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sends the image to your local FastAPI vision service, which loads the trained{" "}
            <code>{modality}_model.h5</code> and returns a finding with a confidence score.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Upload image</h2>
            <div className="mt-6 flex gap-2">
              {VISION_MODALITIES.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setModality(option.key);
                    setResult(null);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    modality === option.key
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="mt-6 flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted-foreground">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected scan" className="h-full w-full rounded-2xl object-contain" />
              ) : (
                <span>Click to choose an image file</span>
              )}
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>

            <button
              onClick={() => void submit()}
              disabled={loading || !file}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Analysing…" : "Run pre-screening"}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Result</h2>
            {!result && !loading && (
              <p className="mt-4 text-sm text-muted-foreground">
                Upload an image and run a scan to see the model&apos;s output here.
              </p>
            )}
            {loading && <p className="mt-4 text-sm text-muted-foreground">Waiting on the model…</p>}
            {result && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="eyebrow">Finding</p>
                  <p className="mt-2 font-display text-2xl font-bold">{result.finding}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="eyebrow">Confidence</p>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
              </div>
            )}
          </section>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          This tries <code>{VISION_API_BASE}</code> first. Run <code>core_backend</code> locally
          (<code>uvicorn main:app --reload</code>) or set <code>VITE_VISION_API_BASE</code> to a
          deployed HTTPS endpoint for real model output — otherwise it automatically falls back to
          a simulated result so the module still works.
        </div>
      </main>
    </div>
  );
}

type MaternalForm = {
  age: string;
  systolic_bp: string;
  diastolic_bp: string;
  blood_sugar: string;
  body_temp: string;
  heart_rate: string;
};

const initialMaternalForm: MaternalForm = {
  age: "",
  systolic_bp: "",
  diastolic_bp: "",
  blood_sugar: "",
  body_temp: "",
  heart_rate: "",
};

type MaternalResult = {
  status: string;
  risk_level: string;
  confidence: number;
  disclaimer: string;
};

// Client-side fallback used whenever core_backend isn't reachable, so the
// module stays usable without a locally running FastAPI server.
function simulateMaternalResult(form: MaternalForm): MaternalResult {
  const age = Number(form.age);
  const systolic = Number(form.systolic_bp);
  const diastolic = Number(form.diastolic_bp);
  const sugar = Number(form.blood_sugar);
  const temp = Number(form.body_temp);
  const heartRate = Number(form.heart_rate);

  let score = 0;
  if (systolic >= 140 || diastolic >= 90) score += 2;
  if (sugar >= 11) score += 2;
  else if (sugar >= 7.8) score += 1;
  if (temp >= 100.4) score += 1;
  if (heartRate >= 100 || heartRate <= 50) score += 1;
  if (age >= 35 || age <= 18) score += 1;

  const risk_level = score >= 4 ? "high risk" : score >= 2 ? "mid risk" : "low risk";
  return {
    status: "simulated",
    risk_level,
    confidence: 0.7,
    disclaimer:
      "Simulated result — core_backend wasn't reachable, so this is a rule-based estimate, not the trained model's output.",
  };
}

const RISK_STYLES: Record<string, string> = {
  "low risk": "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "mid risk": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "high risk": "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

function MaternalMonitorModule() {
  const module = getModule(14)!;
  const [form, setForm] = useState<MaternalForm>(initialMaternalForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaternalResult | null>(null);
  const [error, setError] = useState("");

  const setField = <K extends keyof MaternalForm>(field: K, value: MaternalForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    const values = Object.values(form);
    if (values.some((value) => value === "")) {
      setError("All six vitals are required for a prediction.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${MATERNAL_API_BASE}/api/maternal/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(form.age),
          systolic_bp: Number(form.systolic_bp),
          diastolic_bp: Number(form.diastolic_bp),
          blood_sugar: Number(form.blood_sugar),
          body_temp: Number(form.body_temp),
          heart_rate: Number(form.heart_rate),
        }),
      });
      if (!response.ok) {
        throw new Error(await extractApiErrorMessage(response, `Request failed (${response.status})`));
      }
      const data = (await response.json()) as MaternalResult;
      setResult(data);
    } catch {
      // core_backend isn't reachable (not running, wrong URL, CORS, etc.) —
      // fall back to a rule-based simulated result so the module stays usable.
      setResult(simulateMaternalResult(form));
    } finally {
      setLoading(false);
    }
  };

  const riskStyle =
    (result && RISK_STYLES[result.risk_level.toLowerCase()]) ??
    "border-border bg-surface text-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Connected to core_backend ML model</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Screen maternal vitals for risk.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sends six vitals to the trained maternal risk model and returns a risk tier with a
            confidence score.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Patient vitals</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Age *"
                type="number"
                value={form.age}
                onChange={(v) => setField("age", v)}
                min={10}
                max={90}
              />
              <Field
                label="Heart rate (bpm) *"
                type="number"
                value={form.heart_rate}
                onChange={(v) => setField("heart_rate", v)}
                min={30}
                max={200}
              />
              <Field
                label="Systolic BP *"
                type="number"
                value={form.systolic_bp}
                onChange={(v) => setField("systolic_bp", v)}
                min={50}
                max={250}
              />
              <Field
                label="Diastolic BP *"
                type="number"
                value={form.diastolic_bp}
                onChange={(v) => setField("diastolic_bp", v)}
                min={30}
                max={180}
              />
              <Field
                label="Blood sugar (mmol/L) *"
                type="number"
                value={form.blood_sugar}
                onChange={(v) => setField("blood_sugar", v)}
                min={2}
                max={30}
                step={0.1}
                hint="In mmol/L, not mg/dL — typical fasting range is 4–8."
              />
              <Field
                label="Body temp (°F) *"
                type="number"
                value={form.body_temp}
                onChange={(v) => setField("body_temp", v)}
                min={90}
                max={110}
                step={0.1}
                hint="Normal is around 98.6°F."
              />
            </div>
            <button
              onClick={() => void submit()}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Scoring…" : "Run risk screening"}
            </button>
            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Result</h2>
            {!result && !loading && (
              <p className="mt-4 text-sm text-muted-foreground">
                Fill in the vitals and run a screening to see the model&apos;s output here.
              </p>
            )}
            {loading && <p className="mt-4 text-sm text-muted-foreground">Waiting on the model…</p>}
            {result && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${riskStyle}`}>
                  <p className="eyebrow">Risk level</p>
                  <p className="mt-2 font-display text-2xl font-bold">{result.risk_level}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="eyebrow">Confidence</p>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
              </div>
            )}
          </section>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          This tries <code>{MATERNAL_API_BASE}</code> first. Run <code>core_backend</code> locally
          (<code>uvicorn main:app --reload</code>) or set <code>VITE_MATERNAL_API_BASE</code> to a
          deployed HTTPS endpoint for the trained model — otherwise it automatically falls back to
          a rule-based estimate so the module still works.
        </div>
      </main>
    </div>
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

function FirstAidModule() {
  const [step, setStep] = useState<"start" | "breathing" | "emergency" | "monitor">("start");
  const copy = {
    start: {
      title: "Is the person conscious and breathing normally?",
      body: "Check responsiveness and breathing first. Do not delay calling local emergency services when life is at risk.",
    },
    breathing: {
      title: "Keep the airway clear and monitor closely.",
      body: "Place the person safely on their side if unconscious but breathing, and keep monitoring until trained help arrives.",
    },
    emergency: {
      title: "Call emergency services now.",
      body: "If the person is not breathing normally, is unconscious, or is deteriorating, call local emergency services immediately and follow dispatcher instructions.",
    },
    monitor: {
      title: "Move to the next clinical assessment.",
      body: "Record symptoms, timing, medications, and known allergies for the responding clinician.",
    },
  }[step];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title="Snakebite & First-Aid Engine" category="Emergency" icon={Crosshair} />
      <main className="mx-auto max-w-3xl px-5 py-16 lg:px-10">
        <div className="rounded-3xl border border-border bg-card p-8">
          <p className="eyebrow">Offline decision guide</p>
          <h1 className="mt-3 font-display text-4xl font-bold">{copy.title}</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">{copy.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {step === "start" && (
              <>
                <button
                  onClick={() => setStep("breathing")}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Yes, breathing normally
                </button>
                <button
                  onClick={() => setStep("emergency")}
                  className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold"
                >
                  No / unsure
                </button>
              </>
            )}
            {step === "breathing" && (
              <button
                onClick={() => setStep("monitor")}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Continue assessment
              </button>
            )}
            {step === "emergency" && (
              <button
                onClick={() => setStep("start")}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold"
              >
                Restart guide
              </button>
            )}
            {step === "monitor" && (
              <button
                onClick={() => setStep("start")}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold"
              >
                Restart guide
              </button>
            )}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            This guide is informational and does not replace trained emergency care.
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value === null || value === undefined ? "—" : String(value)}
      </p>
    </div>
  );
}

type Patient = {
  id?: string;
  cnic: string;
  full_name: string;
  blood_group?: string | null;
  allergies?: string | null;
  emergency_contact?: string | null;
  medical_history?: string | null;
};

function CnicVaultModule() {
  const module = getModule(3)!;
  const [records, setRecords] = useState<Patient[]>([]);
  const [cnic, setCnic] = useState("");
  const [result, setResult] = useState<Patient | null>(null);
  const [form, setForm] = useState<Patient>({
    cnic: "",
    full_name: "",
    blood_group: "A+",
    allergies: "",
    emergency_contact: "",
    medical_history: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data, error: queryError } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setRecords((data ?? []) as Patient[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const search = async () => {
    setError("");
    setMessage("");
    setResult(null);
    if (!/^\d{5}-\d{7}-\d$/.test(cnic.trim())) {
      setError("Enter a CNIC in the format 42101-1234567-1.");
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("patients")
      .select("*")
      .eq("cnic", cnic.trim())
      .maybeSingle();
    if (queryError) setError(queryError.message);
    else if (data) setResult(data as Patient);
    else setMessage("No patient record matched that CNIC in the connected backend.");
    setLoading(false);
  };

  const save = async () => {
    setError("");
    setMessage("");
    if (!/^\d{5}-\d{7}-\d$/.test(form.cnic.trim()) || !form.full_name.trim()) {
      setError("A valid CNIC and full name are required.");
      return;
    }
    setLoading(true);
    const { error: insertError } = await supabase
      .from("patients")
      .insert({ ...form, cnic: form.cnic.trim(), full_name: form.full_name.trim() });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Patient record saved to the live CNIC vault.");
      setForm({
        cnic: "",
        full_name: "",
        blood_group: "A+",
        allergies: "",
        emergency_contact: "",
        medical_history: "",
      });
      await load();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Authenticated patient records</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">CNIC medical vault.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Lookups and inserts use the connected <code>patients</code> table. The screen never
            falls back to sample patients.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Verify a record</h2>
            <div className="mt-5 flex gap-3">
              <input
                value={cnic}
                onChange={(event) => setCnic(event.target.value)}
                placeholder="42101-1234567-1"
                className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              <button
                onClick={() => void search()}
                disabled={loading}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Search
              </button>
            </div>
            {result && <PatientCard patient={result} />}
            {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Add patient</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="CNIC *"
                value={form.cnic}
                onChange={(value) => setForm({ ...form, cnic: value })}
              />
              <Field
                label="Full name *"
                value={form.full_name}
                onChange={(value) => setForm({ ...form, full_name: value })}
              />
              <Field
                label="Blood group"
                value={form.blood_group ?? ""}
                onChange={(value) => setForm({ ...form, blood_group: value })}
              />
              <Field
                label="Emergency contact"
                value={form.emergency_contact ?? ""}
                onChange={(value) => setForm({ ...form, emergency_contact: value })}
              />
              <Field
                label="Allergies"
                value={form.allergies ?? ""}
                onChange={(value) => setForm({ ...form, allergies: value })}
              />
              <Field
                label="Medical history"
                value={form.medical_history ?? ""}
                onChange={(value) => setForm({ ...form, medical_history: value })}
              />
            </div>
            <button
              onClick={() => void save()}
              disabled={loading}
              className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Save patient record
            </button>
          </section>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Records available to this operator</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((patient) => (
              <PatientCard key={patient.id ?? patient.cnic} patient={patient} compact />
            ))}
            {records.length === 0 && (
              <p className="text-sm text-muted-foreground">No records returned by Supabase.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function PatientCard({ patient, compact = false }: { patient: Patient; compact?: boolean }) {
  return (
    <article
      className={`mt-5 rounded-2xl border border-border bg-surface p-4 ${compact ? "mt-0" : ""}`}
    >
      <p className="font-semibold">{patient.full_name}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{patient.cnic}</p>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        <span>Blood group: {patient.blood_group || "—"}</span>
        <span>Allergies: {patient.allergies || "None recorded"}</span>
        {!compact && (
          <>
            <span>Emergency contact: {patient.emergency_contact || "—"}</span>
            <span>History: {patient.medical_history || "None recorded"}</span>
          </>
        )}
      </div>
    </article>
  );
}

function SymptomReportsModule() {
  const module = getModule(7)!;
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [district, setDistrict] = useState("");
  const [symptom, setSymptom] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data, error: queryError } = await supabase
      .from("symptom_reports")
      .select("*")
      .order("reported_at", { ascending: false })
      .limit(50);
    if (queryError) setError(queryError.message);
    else setReports((data ?? []) as Array<Record<string, unknown>>);
  };
  useEffect(() => {
    void load();
  }, []);
  const report = async () => {
    setError("");
    setMessage("");
    if (!symptom.trim()) {
      setError("Enter a symptom before submitting a report.");
      return;
    }
    const { error: insertError } = await supabase
      .from("symptom_reports")
      .insert({ district: district.trim() || null, symptom: symptom.trim() });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Symptom report saved to the live surveillance table.");
      setDistrict("");
      setSymptom("");
      await load();
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live surveillance events</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Epidemic heatmapping.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Capture symptom reports in Supabase for later aggregation by district. The view does not
            draw an invented heatmap without real events.
          </p>
        </div>
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="District" value={district} onChange={setDistrict} />
            <Field label="Symptom *" value={symptom} onChange={setSymptom} />
            <button
              onClick={() => void report()}
              className="self-end rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Record report
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
        </section>
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Recent reports</h2>
            <button
              onClick={() => void load()}
              className="rounded-full border border-border bg-surface p-3"
              aria-label="Refresh reports"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {reports.map((report, index) => (
              <div
                key={String(report.id ?? index)}
                className="rounded-2xl border border-border p-4"
              >
                <p className="font-semibold">{String(report.symptom)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {String(report.district || "District not specified")} ·{" "}
                  {report.reported_at
                    ? new Date(String(report.reported_at)).toLocaleString()
                    : "Time unavailable"}
                </p>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-muted-foreground">No reports returned by Supabase.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function BloodMatcherModule() {
  const module = getModule(10)!;
  const [donors, setDonors] = useState<Array<Record<string, unknown>>>([]);
  const [group, setGroup] = useState("A+");
  const [donor, setDonor] = useState({ name: "", blood_group: "A+", phone: "", city: "" });
  const [request, setRequest] = useState({
    blood_group: "A+",
    units: "1",
    urgency: "critical",
    hospital: "",
    phone: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const { data, error: queryError } = await supabase
      .from("blood_donors")
      .select("*")
      .eq("available", true)
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setDonors((data ?? []) as Array<Record<string, unknown>>);
  };
  useEffect(() => {
    void load();
  }, []);
  const saveDonor = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const { error: insertError } = await supabase.from("blood_donors").insert(donor);
    if (insertError) setError(insertError.message);
    else {
      setMessage("Donor registered in the live donor registry.");
      setDonor({ name: "", blood_group: "A+", phone: "", city: "" });
      await load();
    }
    setSaving(false);
  };
  const saveRequest = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const { error: insertError } = await supabase
      .from("blood_requests")
      .insert({ ...request, units: Number(request.units) });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Blood request submitted to the live queue.");
      setRequest({ blood_group: "A+", units: "1", urgency: "critical", hospital: "", phone: "" });
    }
    setSaving(false);
  };
  const matches = donors.filter((item) => String(item.blood_group ?? "").toUpperCase() === group);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live donor registry</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Emergency blood matcher.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Donors and requests are persisted in Supabase. Matching is filtered against the live
            donor rows returned for the selected blood group.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Create blood request</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Blood group"
                value={request.blood_group}
                onChange={(value) => setRequest({ ...request, blood_group: value })}
                options={bloodGroups}
              />
              <Field
                label="Units"
                type="number"
                value={request.units}
                onChange={(value) => setRequest({ ...request, units: value })}
              />
              <Field
                label="Hospital"
                value={request.hospital}
                onChange={(value) => setRequest({ ...request, hospital: value })}
              />
              <Field
                label="Contact phone"
                value={request.phone}
                onChange={(value) => setRequest({ ...request, phone: value })}
              />
            </div>
            <button
              onClick={() => void saveRequest()}
              disabled={saving}
              className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Submit request
            </button>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Register donor</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Name"
                value={donor.name}
                onChange={(value) => setDonor({ ...donor, name: value })}
              />
              <SelectField
                label="Blood group"
                value={donor.blood_group}
                onChange={(value) => setDonor({ ...donor, blood_group: value })}
                options={bloodGroups}
              />
              <Field
                label="Phone"
                value={donor.phone}
                onChange={(value) => setDonor({ ...donor, phone: value })}
              />
              <Field
                label="City"
                value={donor.city}
                onChange={(value) => setDonor({ ...donor, city: value })}
              />
            </div>
            <button
              onClick={() => void saveDonor()}
              disabled={saving}
              className="mt-5 w-full rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              Save donor
            </button>
          </section>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
          >
            {message}
          </p>
        )}
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Available now</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Potential matches</h2>
            </div>
            <SelectField
              label="Filter group"
              value={group}
              onChange={setGroup}
              options={bloodGroups}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((item, index) => (
              <article
                key={String(item.id ?? index)}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="font-semibold">{String(item.name ?? "Unnamed donor")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {String(item.blood_group)} · {String(item.city ?? "Location unavailable")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {String(item.phone ?? "No phone recorded")}
                </p>
              </article>
            ))}
            {matches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No available donor rows match this group.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function BhuDispatcherModule() {
  const module = getModule(12)!;
  const [vans, setVans] = useState<Array<Record<string, unknown>>>([]);
  const [visits, setVisits] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ van_id: "", village: "", scheduled_at: "", services: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const [vanResult, visitResult] = await Promise.all([
      supabase.from("bhu_vans").select("*").order("created_at", { ascending: false }),
      supabase
        .from("bhu_visits")
        .select("*, bhu_vans(van_name)")
        .order("scheduled_at", { ascending: true }),
    ]);
    if (vanResult.error) setError(vanResult.error.message);
    else setVans((vanResult.data ?? []) as Array<Record<string, unknown>>);
    if (visitResult.error) setError(visitResult.error.message);
    else setVisits((visitResult.data ?? []) as Array<Record<string, unknown>>);
  };
  useEffect(() => {
    void load();
  }, []);
  const schedule = async () => {
    setError("");
    setMessage("");
    if (!form.village || !form.scheduled_at) {
      setError("Village and schedule time are required.");
      return;
    }
    const { error: insertError } = await supabase.from("bhu_visits").insert({
      ...form,
      van_id: form.van_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage("BHU visit scheduled in the live dispatch table.");
      setForm({ van_id: "", village: "", scheduled_at: "", services: "" });
      await load();
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live fleet scheduling</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Mobile BHU dispatcher.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Van availability and scheduled visits are read and written through the connected{" "}
            <code>bhu_vans</code> and <code>bhu_visits</code> tables.
          </p>
        </div>
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Schedule a visit</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Van"
              value={form.van_id}
              onChange={(value) => setForm({ ...form, van_id: value })}
              options={["", ...vans.map((van) => String(van.id))]}
            />
            <Field
              label="Village *"
              value={form.village}
              onChange={(value) => setForm({ ...form, village: value })}
            />
            <Field
              label="Scheduled at *"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(value) => setForm({ ...form, scheduled_at: value })}
            />
            <Field
              label="Services"
              value={form.services}
              onChange={(value) => setForm({ ...form, services: value })}
            />
          </div>
          <button
            onClick={() => void schedule()}
            className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Schedule visit
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Fleet</h2>
            <div className="mt-5 space-y-3">
              {vans.map((van, index) => (
                <div key={String(van.id ?? index)} className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">{String(van.van_name ?? "Unnamed van")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Driver: {String(van.driver_name ?? "Unassigned")} ·{" "}
                    {String(van.status ?? "status unavailable")}
                  </p>
                </div>
              ))}
              {vans.length === 0 && (
                <p className="text-sm text-muted-foreground">No vans returned by Supabase.</p>
              )}
            </div>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Upcoming visits</h2>
            <div className="mt-5 space-y-3">
              {visits.map((visit, index) => (
                <div
                  key={String(visit.id ?? index)}
                  className="rounded-2xl border border-border p-4"
                >
                  <p className="font-semibold">{String(visit.village)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {visit.scheduled_at
                      ? new Date(String(visit.scheduled_at)).toLocaleString()
                      : "Schedule unavailable"}{" "}
                    · {String(visit.status ?? "scheduled")}
                  </p>
                </div>
              ))}
              {visits.length === 0 && (
                <p className="text-sm text-muted-foreground">No visits returned by Supabase.</p>
              )}
            </div>
          </section>
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
// Shared Groq client config (used by modules 6, 8, and 9)
// ============================================================
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_API_KEY = import.meta.env["VITE_GROQ_API_KEY"] as string | undefined;

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
// MODULE 9 — Native Urdu Voice Triage (AI-powered via Groq)
// ============================================================

type TriageChatMessage = { role: "user" | "assistant"; content: string };

type TriageLevel = "EMERGENCY" | "URGENT" | "ROUTINE" | "HOME_CARE" | "NEED_MORE_INFO";

type TriageResult = {
  level: TriageLevel;
  replyUr: string;
  replyEn: string;
};

const TRIAGE_SYSTEM_PROMPT = `You are HayatPulse AI, a bilingual (Urdu + English) medical voice triage assistant for a healthcare app used in Pakistan, including rural and low-literacy users.

Your job: listen to what the patient says about their symptoms (given as text), and either:
(a) ask ONE short, simple follow-up question if you genuinely need more information to judge urgency, OR
(b) give a final triage classification once you have enough information.

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "level": "EMERGENCY" | "URGENT" | "ROUTINE" | "HOME_CARE" | "NEED_MORE_INFO",
  "replyUr": "<your reply written in Urdu script, warm and simple, max 3 short sentences>",
  "replyEn": "<the same reply translated into simple English, max 3 short sentences>"
}

Rules:
- Use "NEED_MORE_INFO" only if you genuinely cannot judge urgency yet (max 2 follow-up questions total, then you MUST commit to a level).
- Use "EMERGENCY" for anything potentially life-threatening (chest pain, can't breathe, unconscious, heavy bleeding, stroke signs, severe allergic reaction, suicidal thoughts, poisoning).
- Use "URGENT" for things needing care within hours (high fever, broken bone, severe pain, dehydration, deep wounds).
- Use "ROUTINE" for things needing a doctor visit within a day or two (persistent cough, mild-moderate fever, stomach upset).
- Use "HOME_CARE" for mild, self-limiting symptoms (common cold, minor headache, minor cuts).
- When in doubt between two levels, always pick the MORE urgent one.
- Keep replies short, warm, and easy to understand for someone with low health literacy. No medical jargon.
- Never claim to give a diagnosis, only guidance on urgency of seeking care.
- If the user's message is unrelated to health/symptoms, gently redirect them to describe their symptoms.`;

function parseTriageJSON(rawText: string): TriageResult {
  let cleaned = rawText.trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const parsed = JSON.parse(cleaned) as Partial<TriageResult>;
    const validLevels: TriageLevel[] = ["EMERGENCY", "URGENT", "ROUTINE", "HOME_CARE", "NEED_MORE_INFO"];
    if (!parsed.level || !validLevels.includes(parsed.level)) throw new Error("Invalid level");
    if (!parsed.replyUr || !parsed.replyEn) throw new Error("Missing reply text");
    return parsed as TriageResult;
  } catch {
    return {
      level: "ROUTINE",
      replyUr: "معذرت، جواب سمجھنے میں مسئلہ ہوا۔ براہ کرم اپنی علامات دوبارہ بتائیں یا ڈاکٹر سے رجوع کریں۔",
      replyEn: "Sorry, there was a problem understanding the response. Please describe your symptoms again or consult a doctor.",
    };
  }
}

async function getTriageResponse(history: TriageChatMessage[]): Promise<TriageResult> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: TRIAGE_SYSTEM_PROMPT }, ...history],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parseTriageJSON(rawText);
}

const TRIAGE_LEVEL_STYLES: Record<TriageLevel, string> = {
  EMERGENCY: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  URGENT: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ROUTINE: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  HOME_CARE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  NEED_MORE_INFO: "border-border bg-surface text-foreground",
};

type TriageDisplayEntry =
  | { key: number; role: "user"; text: string }
  | { key: number; role: "assistant"; level?: TriageLevel; replyUr: string; replyEn: string };

function VoiceTriageModule() {
  const module = getModule(9)!;
  const [messages, setMessages] = useState<TriageChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const [finalResult, setFinalResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceOutputSupported, setVoiceOutputSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setVoiceInputSupported(!!SpeechRecognitionCtor);
    setVoiceOutputSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn't supported in this browser. Please type instead, or try Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    setError("");
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ur-PK";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Could not capture voice. Please try again, or type your symptoms instead.");
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const speak = (text: string) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    window.speechSynthesis.speak(utterance);
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (isListening) recognitionRef.current?.stop();
    setInput("");
    setError("");
    const history: TriageChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setStatus("thinking");
    try {
      const result = await getTriageResponse(history);
      setMessages([...history, { role: "assistant", content: JSON.stringify(result) }]);
      if (result.level !== "NEED_MORE_INFO") setFinalResult(result);
      if (voiceOutputSupported) speak(result.replyUr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  const restart = () => {
    recognitionRef.current?.stop();
    if (voiceOutputSupported) window.speechSynthesis.cancel();
    setMessages([]);
    setFinalResult(null);
    setError("");
  };

  const displayLog: TriageDisplayEntry[] = messages.map((m, i) => {
    if (m.role === "user") return { key: i, role: "user", text: m.content };
    try {
      const parsed = JSON.parse(m.content) as TriageResult;
      return { key: i, role: "assistant", ...parsed };
    } catch {
      return { key: i, role: "assistant", replyUr: m.content, replyEn: "" };
    }
  });

  const isFinal = finalResult && finalResult.level !== "NEED_MORE_INFO";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI-powered conversational triage</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Describe your symptoms.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Speak or type in Urdu or English. The assistant may ask a short follow-up question
            before giving an urgency level, and can read its replies aloud for low-literacy users.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          This tool gives general guidance only and is NOT a medical diagnosis. In a real
          emergency, seek immediate in-person help or call emergency services.
        </div>

        <section className="space-y-3">
          {displayLog.map((entry) =>
            entry.role === "user" ? (
              <div
                key={entry.key}
                className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground"
              >
                {entry.text}
              </div>
            ) : (
              <div
                key={entry.key}
                className={`max-w-[85%] rounded-2xl rounded-bl-sm border p-4 text-sm ${
                  entry.level ? TRIAGE_LEVEL_STYLES[entry.level] : "border-border bg-surface"
                }`}
              >
                {entry.level && entry.level !== "NEED_MORE_INFO" && (
                  <p className="mb-1 font-semibold">{entry.level.replace("_", " ")}</p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p>{entry.replyUr}</p>
                  {voiceOutputSupported && entry.replyUr && (
                    <button
                      onClick={() => speak(entry.replyUr ?? "")}
                      aria-label="Read this reply aloud"
                      className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100"
                    >
                      <Volume2 className="size-4" />
                    </button>
                  )}
                </div>
                {entry.replyEn && <p className="mt-1 text-xs opacity-80">{entry.replyEn}</p>}
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

        {finalResult?.level === "EMERGENCY" && (
          <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 text-center text-red-700 dark:text-red-300">
            <p className="font-semibold">🚨 Seek immediate in-person medical help now.</p>
          </div>
        )}

        {!isFinal ? (
          <div className="space-y-2">
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
                placeholder={isListening ? "Listening… speak now" : "e.g. mujhe bukhar hai"}
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              {voiceInputSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={status === "thinking"}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  aria-pressed={isListening}
                  className={`shrink-0 rounded-full p-3 transition-colors disabled:opacity-60 ${
                    isListening
                      ? "animate-pulse bg-red-500 text-white"
                      : "border border-border bg-surface text-foreground hover:border-ring"
                  }`}
                >
                  <Mic className="size-4" />
                </button>
              )}
              <button
                onClick={() => void send()}
                disabled={status === "thinking" || !input.trim()}
                className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <span className="hidden sm:inline">Send</span>
                <Send className="size-4 sm:hidden" />
              </button>
            </div>
            {voiceInputSupported ? (
              <p className="text-xs text-muted-foreground">
                Tap the mic to speak your symptoms, or type them in — both work the same way.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Voice input isn't supported in this browser — please type your symptoms instead.
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={restart}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Start new check
          </button>
        )}
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