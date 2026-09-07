import { useEffect, useState } from "react";
import { 
  LocateFixed, 
  MapPin, 
  RefreshCw, 
  Send, 
  AlertTriangle, 
  Phone, 
  Navigation, 
  Waves, 
  Users, 
  Radio, 
  Clock, 
  CheckCircle2, 
  ShieldAlert 
} from "lucide-react";
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

  const criticalCount = pins.filter((p) => p.severity === "critical").length;
  const totalTrapped = pins.reduce((acc, p) => acc + (p.people_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <ModuleHeader title={module.title} category={module.category} icon={MapPin} />

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 lg:px-10">
        
        {/* Urgent Live Emergency Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 border-2 border-sky-600 p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Waves className="size-48" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3.5 py-1 text-xs font-black uppercase text-white shadow-md tracking-wider">
                <Radio className="size-3.5 animate-pulse" />
                Live Emergency Dispatch Grid
              </div>
              <h1 className="mt-3 font-display text-3xl font-black md:text-4xl flex items-center gap-3">
                <Waves className="size-8 text-sky-300" />
                Flood Rescue Command Center
              </h1>
              <p className="mt-2 max-w-xl text-sky-100 text-sm font-medium">
                Create a rescue request in the connected <code className="bg-sky-950 text-sky-200 px-1.5 py-0.5 rounded border border-sky-700">flood_pins</code> table. Real-time updates coordinate emergency teams in affected water zones.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-2xl bg-red-950/80 border-2 border-red-500 px-5 py-3 text-center min-w-[110px] shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">Critical SOS</p>
                <p className="text-3xl font-black text-red-400 mt-0.5">{criticalCount}</p>
              </div>
              <div className="rounded-2xl bg-sky-950/80 border-2 border-sky-400 px-5 py-3 text-center min-w-[110px] shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Trapped People</p>
                <p className="text-3xl font-black text-sky-300 mt-0.5">{totalTrapped}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          
          {/* Rescue Pin Request Form */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-lg relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-sm">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-800">New Request</h2>
              </div>
              
              <button
                onClick={useLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 text-xs font-bold text-sky-700 shadow-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {locating ? (
                  <RefreshCw className="size-3.5 animate-spin text-sky-600" />
                ) : (
                  <LocateFixed className="size-3.5 text-sky-600" />
                )}
                Use My Location
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Reporter Name 👤"
                value={form.reporter_name}
                onChange={(value) => setField("reporter_name", value)}
              />
              <Field
                label="Phone Number 📞"
                value={form.phone}
                onChange={(value) => setField("phone", value)}
              />
              <Field
                label="People Count * 👥"
                type="number"
                value={form.people_count}
                onChange={(value) => setField("people_count", value)}
              />
              
              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  Severity * <AlertTriangle className="size-3 text-amber-500" />
                </span>
                <select
                  value={form.severity}
                  onChange={(event) =>
                    setField("severity", event.target.value as FloodForm["severity"])
                  }
                  className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 transition-all"
                >
                  <option value="low">🟢 Low (Need non-urgent assistance)</option>
                  <option value="medium">🟡 Medium (Trapped / Rising Water)</option>
                  <option value="critical">🔴 Critical (Immediate Life Threat)</option>
                </select>
              </label>

              <Field
                label="Latitude * 🌐"
                value={form.latitude}
                onChange={(value) => setField("latitude", value)}
              />
              <Field
                label="Longitude * 🌐"
                value={form.longitude}
                onChange={(value) => setField("longitude", value)}
              />
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Rescue & Hazard Notes 📝
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 transition-all"
                placeholder="Water level height, access route, medical conditions, trapped on roof/boat required..."
              />
            </label>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2"
              >
                <AlertTriangle className="size-4 text-red-600 shrink-0" />
                {error}
              </p>
            )}
            
            {message && (
              <p
                role="status"
                className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 flex items-center gap-2"
              >
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                {message}
              </p>
            )}

            <button
              onClick={() => void submitPin()}
              disabled={saving}
              className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit Live Rescue Pin
            </button>
          </section>

          {/* Real-time Rescue Requests Queue */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="eyebrow text-sky-600 font-bold uppercase tracking-wider text-xs">Shared Queue</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Radio className="size-5 text-red-600 animate-pulse" />
                  Open Rescue Requests
                </h2>
              </div>
              <button
                onClick={() => void loadPins()}
                disabled={loadingPins}
                aria-label="Refresh rescue pins"
                className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${loadingPins ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>

            <div className="mt-6 space-y-4 overflow-y-auto max-h-[620px] pr-1">
              {pins.length === 0 && !loadingPins && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  <Waves className="size-8 mx-auto mb-2 text-slate-400" />
                  No active rescue pins logged in the grid.
                </div>
              )}

              {pins.map((pin) => {
                const isCritical = pin.severity === "critical";
                const isMedium = pin.severity === "medium";

                return (
                  <article 
                    key={pin.id} 
                    className={`rounded-2xl border-2 p-4 transition-all shadow-sm ${
                      isCritical
                        ? "border-red-500 bg-red-50/60"
                        : isMedium
                        ? "border-amber-400 bg-amber-50/50"
                        : "border-slate-200 bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                              isCritical
                                ? "bg-red-600 text-white animate-pulse"
                                : isMedium
                                ? "bg-amber-500 text-slate-950"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {isCritical && <AlertTriangle className="size-3" />}
                            {pin.severity ?? "unknown"}
                          </span>

                          <span className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                            <Users className="size-4 text-sky-600" />
                            {pin.people_count ?? 0} {pin.people_count === 1 ? "person" : "people"}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500 font-medium">
                          Reporter: <span className="font-bold text-slate-800">{pin.reporter_name || "Anonymous"}</span>
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-200 border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {pin.status || "pending"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                      {pin.notes || "No additional hazard notes provided."}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-sky-700 font-bold">
                        <MapPin className="size-3.5 text-sky-600 shrink-0" />
                        {pin.latitude}, {pin.longitude}
                      </div>

                      <div className="flex items-center gap-2">
                        {pin.phone && (
                          <a
                            href={`tel:${pin.phone}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
                          >
                            <Phone className="size-3.5" /> Call
                          </a>
                        )}
                        {pin.latitude && pin.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${pin.latitude},${pin.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
                          >
                            <Navigation className="size-3.5" /> Map
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="size-3" />
                      {pin.created_at
                        ? new Date(pin.created_at).toLocaleString()
                        : "Time unavailable"}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
