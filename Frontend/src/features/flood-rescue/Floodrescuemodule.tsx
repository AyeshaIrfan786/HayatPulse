import { useEffect, useState } from "react";
import { LocateFixed, MapPin, RefreshCw, Send } from "lucide-react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";

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

export function FloodRescueModule() {
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