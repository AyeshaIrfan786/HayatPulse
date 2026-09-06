import { useEffect, useState } from "react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";
import { SelectField } from "@/components/shared/SelectField";

export function BhuDispatcherModule() {
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
      setError("⚠️ Village and schedule time are required.");
      return;
    }
    const { error: insertError } = await supabase.from("bhu_visits").insert({
      ...form,
      van_id: form.van_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage("✅ BHU visit successfully scheduled!");
      setForm({ van_id: "", village: "", scheduled_at: "", services: "" });
      await load();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-4xl shadow-inner">
            🚑
          </div>
          <div>
            <p className="eyebrow text-emerald-600 font-bold tracking-wide uppercase text-sm">Rural Health Coordination</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-800">Mobile BHU Dispatcher</h1>
            <p className="mt-2 max-w-2xl text-slate-500 text-sm">
              Assign health vans to villages. Clear visual indicators help you track fleet availability and upcoming medical visits.
            </p>
          </div>
        </div>

        {/* Scheduling Section - Highlighted in Green for Action */}
        <section className="rounded-3xl border-2 border-emerald-500/20 bg-emerald-50/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl" aria-hidden="true">📅</span>
            <h2 className="font-display text-2xl font-bold text-emerald-900">Schedule a New Visit</h2>
          </div>
          
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
            <SelectField
              label="Select Van 🚐"
              value={form.van_id}
              onChange={(value) => setForm({ ...form, van_id: value })}
              options={["", ...vans.map((van) => String(van.id))]}
            />
            <Field
              label="Destination Village 🏡 *"
              value={form.village}
              onChange={(value) => setForm({ ...form, village: value })}
            />
            <Field
              label="Date & Time ⏰ *"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(value) => setForm({ ...form, scheduled_at: value })}
            />
            <Field
              label="Medical Services 🩺"
              value={form.services}
              onChange={(value) => setForm({ ...form, services: value })}
            />
          </div>
          
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => void schedule()}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 py-3.5 text-base font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Dispatch Van</span>
              <span aria-hidden="true">➡️</span>
            </button>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Fleet Section - Blue Themed */}
          <section className="rounded-3xl border-t-4 border-t-blue-500 border-l border-r border-b border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl" aria-hidden="true">🚐</span>
              <h2 className="font-display text-2xl font-bold text-slate-800">Available Fleet</h2>
            </div>
            <div className="space-y-4">
              {vans.map((van, index) => (
                <div key={String(van.id ?? index)} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-blue-50/50">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xl">
                    🚐
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-lg">{String(van.van_name ?? "Unnamed van")}</p>
                    <p className="text-sm text-slate-500 font-medium">Driver: {String(van.driver_name ?? "Unassigned")}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      {String(van.status ?? "Available")}
                    </span>
                  </div>
                </div>
              ))}
              {vans.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                  No vans found in the system.
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Visits Section - Teal/Orange Themed */}
          <section className="rounded-3xl border-t-4 border-t-teal-500 border-l border-r border-b border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl" aria-hidden="true">🛣️</span>
              <h2 className="font-display text-2xl font-bold text-slate-800">Upcoming Village Visits</h2>
            </div>
            <div className="space-y-4">
              {visits.map((visit, index) => (
                <div key={String(visit.id ?? index)} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-teal-50/50">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xl">
                    🏡
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-lg">{String(visit.village)}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true">⏰</span> 
                        {visit.scheduled_at ? new Date(String(visit.scheduled_at)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "TBD"}
                      </span>
                      {visit.services && (
                        <span className="flex items-center gap-1">
                          <span aria-hidden="true">🩺</span> {String(visit.services)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse"></span>
                      {String(visit.status ?? "Scheduled")}
                    </span>
                  </div>
                </div>
              ))}
              {visits.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                  No upcoming visits scheduled.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}