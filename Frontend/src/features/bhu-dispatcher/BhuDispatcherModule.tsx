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