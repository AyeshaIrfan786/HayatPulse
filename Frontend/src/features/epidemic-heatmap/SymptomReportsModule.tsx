import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SymptomReportsModule() {
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
              <div key={String(report.id ?? index)} className="rounded-2xl border border-border p-4">
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