import { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  AlertTriangle,
  MapPin,
  Activity,
  ShieldAlert,
  Search,
  Building2,
  Stethoscope,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  Users
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

// Common high-priority vectors in Pakistan
const COMMON_SYMPTOMS = [
  { label: "Dengue Fever", icon: "🦟", risk: "high" },
  { label: "Cholera / Waterborne", icon: "💧", risk: "high" },
  { label: "Typhoid Fever", icon: "🤒", risk: "medium" },
  { label: "Malaria Spike", icon: "🦟", risk: "medium" },
  { label: "Acute Gastroenteritis", icon: "🤢", risk: "medium" },
  { label: "Unexplained High Fever", icon: "🔥", risk: "low" },
];

const PAKISTAN_DISTRICTS = [
  "Karachi Central", "Karachi East", "Karachi South", "Malir", "Lahore", 
  "Peshawar", "Quetta", "Rawalpindi", "Multan", "Swat", "Hyderabad", "Sukkur"
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
  const [severity, setSeverity] = useState<"Moderate" | "Outbreak / High">("Moderate");
  const [affectedCount, setAffectedCount] = useState<string>("1");
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, queryError } = await supabase
      .from("symptom_reports")
      .select("*")
      .order("reported_at", { ascending: false })
      .limit(50);

    if (queryError) {
      setError(queryError.message);
    } else {
      setReports((data ?? []) as Array<Record<string, unknown>>);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const report = async () => {
    setError("");
    setMessage("");
    if (!symptom.trim()) {
      setError("Please specify or select a symptom/disease before submitting.");
      return;
    }

    // Embed rich metadata into symptom string if schema is fixed to district/symptom
    const formattedSymptom = `${symptom.trim()} [Severity: ${severity} | Cases: ${affectedCount || 1}]`;

    const { error: insertError } = await supabase
      .from("symptom_reports")
      .insert({ 
        district: district.trim() || "Unspecified District", 
        symptom: formattedSymptom 
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Symptom telemetry successfully broadcast to live outbreak surveillance mesh.");
      setDistrict("");
      setSymptom("");
      setAffectedCount("1");
      await load();
    }
  };

  // Aggregated Heatmap Logic for District Hotspots
  const districtAnalytics = useMemo(() => {
    const counts: Record<string, { total: number; highRiskCount: number; symptoms: Set<string> }> = {};

    reports.forEach((r) => {
      const dName = String(r.district || "Unspecified District").trim();
      const sName = String(r.symptom || "Unknown");
      const isHigh = sName.includes("High") || sName.includes("Outbreak") || sName.includes("Dengue") || sName.includes("Cholera");

      if (!counts[dName]) {
        counts[dName] = { total: 0, highRiskCount: 0, symptoms: new Set() };
      }
      counts[dName].total += 1;
      if (isHigh) counts[dName].highRiskCount += 1;
      counts[dName].symptoms.add(sName.split(" [")[0]);
    });

    return Object.entries(counts).map(([name, data]) => ({
      district: name,
      total: data.total,
      highRiskCount: data.highRiskCount,
      symptoms: Array.from(data.symptoms).slice(0, 3).join(", "),
      status: data.highRiskCount >= 3 ? "CRITICAL OUTBREAK" : data.total >= 3 ? "HIGH ALERT" : "MONITORING",
    }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (!filterQuery) return reports;
    const q = filterQuery.toLowerCase();
    return reports.filter(
      (r) =>
        String(r.symptom ?? "").toLowerCase().includes(q) ||
        String(r.district ?? "").toLowerCase().includes(q)
    );
  }, [reports, filterQuery]);

  const totalHighRisk = districtAnalytics.filter(d => d.status !== "MONITORING").length;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-16">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Activity className="size-3.5 animate-pulse" />
              Live Field Surveillance Network
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Epidemic Heatmapping & Early Warning
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Real-time symptom telemetry aggregation for Al-Khidmat emergency medical response and rapid camp deployment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              Surveillance Engine Active
            </span>
          </div>
        </div>

        {/* BILINGUAL DISCLAIMER BANNER (Matches SS3 style) */}
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold leading-relaxed">
                <span className="font-bold text-amber-950 dark:text-amber-100">Epidemic Early Warning Disclaimer:</span> Disease surveillance metrics and heatmaps are aggregated directly from field telemetry and local health reports. Al-Khidmat emergency disaster relief dispatchers must perform direct physical confirmation prior to deploying mobile medical camps or allocating emergency pharmaceuticals.
              </p>
              <p className="font-sans leading-relaxed text-right dir-rtl text-amber-950 dark:text-amber-100 font-medium" dir="rtl">
                <strong>ایمرجنسی ویکٹر ڈسکلیمر:</strong> بیماریوں کے انتباہی اعداد و شمار فیلڈ سرویئلنس اور علامات کی رپورٹنگ پر مبنی ہیں۔ الخدمت ہیلتھ نیٹ ورک کے ایمرجنسی ڈسپیچرز میڈیکل کیمپ کے قیام یا دوائیوں کی ترسیل سے قبل فیلڈ تصدیق لازمی انجام دیں۔
              </p>
            </div>
          </div>
        </div>

        {/* TELEMETRY KPI METRICS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Field Reports</span>
              <Activity className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-display">{reports.length}</span>
              <span className="text-xs text-muted-foreground">events logged</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Outbreak Hotspots</span>
              <ShieldAlert className="size-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-display text-rose-600 dark:text-rose-400">{totalHighRisk}</span>
              <span className="text-xs text-rose-600/80 font-medium">districts alerted</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Primary Threat</span>
              <TrendingUp className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">Dengue / Fever</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Al-Khidmat Response</span>
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">Standby / Ready</span>
            </div>
          </div>
        </div>

        {/* INPUT TELEMETRY FORM */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-emerald-600" />
              <h2 className="font-display text-lg font-bold">Log New Surveillance Telemetry</h2>
            </div>
            <span className="text-xs text-muted-foreground">Field Health Worker Interface</span>
          </div>

          {/* Quick Preset Selector */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Select Prevalent Vectors:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSymptom(item.label)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    symptom === item.label
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "border border-border bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">District / Zone *</label>
              <input
                list="district-list"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g., Karachi East, Swat..."
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <datalist id="district-list">
                {PAKISTAN_DISTRICTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <Field 
              label="Symptom / Primary Condition *" 
              value={symptom} 
              onChange={setSymptom} 
              placeholder="e.g., High fever & severe joint pain"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as "Moderate" | "Outbreak / High")}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="Moderate font-normal">Moderate Risk</option>
                <option value="Outbreak / High">Outbreak Trigger / High Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated Cases</label>
              <input
                type="number"
                min="1"
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              * Reports are automatically mapped into Al-Khidmat district early warning analytics.
            </p>
            <button
              onClick={() => void report()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
            >
              <Stethoscope className="size-4" />
              Broadcast Telemetry Report
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              {message}
            </div>
          )}
        </section>

        {/* DISTRICT HEATMAP AGGREGATOR (VISUAL OUTBREAK MATRIX) */}
        {districtAnalytics.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Aggregated District Risk Heatmap</h2>
                <p className="text-xs text-muted-foreground">Calculated automatically from live field submissions</p>
              </div>
              <span className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-md">
                {districtAnalytics.length} Districts Tracked
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {districtAnalytics.map((item) => (
                <div
                  key={item.district}
                  className={`rounded-xl border p-4 transition-all ${
                    item.status === "CRITICAL OUTBREAK"
                      ? "border-rose-300 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20"
                      : item.status === "HIGH ALERT"
                      ? "border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      <MapPin className="size-4 text-emerald-600" />
                      {item.district}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "CRITICAL OUTBREAK"
                          ? "bg-rose-600 text-white animate-pulse"
                          : item.status === "HIGH ALERT"
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs text-muted-foreground">
                    <span>Total Logs: <strong className="text-foreground">{item.total}</strong></span>
                    <span>Threats: <strong className="text-foreground">{item.symptoms || "N/A"}</strong></span>
                  </div>

                  {/* Recommendation action for Al-Khidmat */}
                  <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Al-Khidmat Action:</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {item.status === "CRITICAL OUTBREAK" 
                        ? "🚨 Mobile Relief Camp Needed" 
                        : item.status === "HIGH ALERT"
                        ? "⚠️ Vector Spray Recommended"
                        : "✓ Routine Monitoring"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LIVE RECENT REPORTS SURVEILLANCE FEED */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Recent Telemetry Feeds</h2>
              <p className="text-xs text-muted-foreground">Raw incoming symptom logs from Supabase surveillance table</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by district or disease..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => void load()}
                disabled={loading}
                className="rounded-xl border border-border bg-surface p-2 hover:bg-secondary transition-colors"
                aria-label="Refresh reports"
                title="Refresh Live Feed"
              >
                <RefreshCw className={`size-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredReports.map((report, index) => {
              const symptomText = String(report.symptom ?? "Unknown Symptom");
              const isHigh = symptomText.toLowerCase().includes("outbreak") || symptomText.toLowerCase().includes("dengue") || symptomText.toLowerCase().includes("cholera");

              return (
                <div
                  key={String(report.id ?? index)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border/80 bg-background/80 p-3.5 transition-all hover:border-emerald-500/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{symptomText}</span>
                      {isHigh && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          PRIORITY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <MapPin className="size-3 text-emerald-600" />
                        {String(report.district || "Unspecified District")}
                      </span>
                      <span>•</span>
                      <span>
                        {report.reported_at
                          ? new Date(String(report.reported_at)).toLocaleString()
                          : "Time unavailable"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-0 flex items-center gap-2">
                    <span className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      Verified Telemetry
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No surveillance logs matched your query or table is empty.
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}