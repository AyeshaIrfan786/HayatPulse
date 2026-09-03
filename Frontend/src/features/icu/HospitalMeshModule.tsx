import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Metric } from "@/components/shared/Metric";

export function HospitalMeshModule() {
  const module = getModule(1)!;
  const [hospitals, setHospitals] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("hospitals")
      .select("*")
      .order("available_icus", { ascending: false });
    if (queryError) setError(queryError.message);
    else setHospitals((data ?? []) as Array<Record<string, unknown>>);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Live Supabase table</p>
            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">ICU & bed mesh.</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Facility telemetry is read directly from <code>hospitals</code>; no sample facilities
              are injected when the table is empty.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            value={hospitals.reduce((sum, row) => sum + Number(row.available_icus ?? 0), 0)}
            label="Open ICU beds"
            loading={loading}
          />
          <StatCard value={hospitals.length} label="Facilities reporting" loading={loading} />
          <StatCard
            value={hospitals.reduce((sum, row) => sum + Number(row.ventilators ?? 0), 0)}
            label="Ventilators available"
            loading={loading}
          />
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-2xl font-bold">Facility telemetry</h2>
          </div>
          {hospitals.length === 0 && !loading && (
            <p className="p-6 text-sm text-muted-foreground">
              No hospitals have reported telemetry yet.
            </p>
          )}
          {hospitals.map((hospital, index) => (
            <div
              key={String(hospital.id ?? index)}
              className={`grid gap-3 p-5 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:items-center ${index ? "border-t border-border" : ""}`}
            >
              <div>
                <p className="font-semibold">{String(hospital.name ?? "Unnamed facility")}</p>
                <p className="text-xs text-muted-foreground">
                  {String(hospital.city ?? "Location unavailable")}
                </p>
              </div>
              <Metric label="ICU" value={hospital.available_icus} />
              <Metric label="Beds" value={hospital.available_beds} />
              <Metric label="Ventilators" value={hospital.ventilators} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}