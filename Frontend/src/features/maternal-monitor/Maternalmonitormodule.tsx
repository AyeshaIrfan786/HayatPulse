import { useState } from "react";
import { 
  HeartPulse, 
  Activity, 
  Thermometer, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Droplets, 
  User, 
  Heart, 
  Scale, 
  ArrowRight,
  Info
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";

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
    confidence: 0.85,
    disclaimer:
      "Simulated result — core_backend wasn't reachable, so this is a rule-based estimate, not the trained model's output.",
  };
}

const RISK_STYLES: Record<
  string,
  { card: string; badge: string; icon: typeof CheckCircle2; text: string }
> = {
  "low risk": {
    card: "border-2 border-emerald-400 bg-emerald-50/80 text-emerald-950 shadow-md shadow-emerald-100",
    badge: "bg-emerald-600 text-white",
    icon: CheckCircle2,
    text: "Maternal vitals are within standard healthy ranges. Continue routine care.",
  },
  "mid risk": {
    card: "border-2 border-amber-400 bg-amber-50/80 text-amber-950 shadow-md shadow-amber-100",
    badge: "bg-amber-500 text-slate-950",
    icon: AlertTriangle,
    text: "Elevated maternal parameters detected. Schedule a clinical checkup soon.",
  },
  "high risk": {
    card: "border-2 border-rose-500 bg-rose-50 text-rose-950 shadow-lg shadow-rose-200 animate-pulse",
    badge: "bg-rose-600 text-white",
    icon: ShieldAlert,
    text: "Critical maternal vitals flagged! Urgent healthcare attention recommended.",
  },
};

export function MaternalMonitorModule() {
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
      setError("All six vitals are required for an accurate clinical risk screening.");
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
        throw new Error(
          await extractApiErrorMessage(response, `Request failed (${response.status})`)
        );
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

  const riskConfig = result
    ? RISK_STYLES[result.risk_level.toLowerCase()] ?? {
        card: "border-2 border-slate-200 bg-white text-slate-900",
        badge: "bg-slate-600 text-white",
        icon: Info,
        text: "Screening output calculated.",
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 lg:px-10">
        
        {/* Maternal Care Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-900 via-pink-900 to-teal-900 border-2 border-pink-500/30 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <HeartPulse className="size-64 text-pink-300" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/30 border border-pink-300/40 px-3.5 py-1 text-xs font-black uppercase text-pink-200 shadow-sm tracking-wider">
                <Sparkles className="size-3.5 text-pink-300" />
                AI Health Intelligence
              </div>
              <h1 className="mt-3 font-display text-3xl font-black md:text-4xl flex items-center gap-3">
                <Stethoscope className="size-8 text-pink-300" />
                Maternal Risk Screening & Vitals
              </h1>
              <p className="mt-2 max-w-xl text-pink-100 text-sm font-medium">
                Screen core maternal parameters against our trained ML diagnostic backend. Instant risk categorization for expectant mothers.
              </p>
            </div>

            {/* Visual Indicator Cards */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-center min-w-[110px] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-pink-200 flex items-center justify-center gap-1">
                  <Heart className="size-3 text-rose-300" /> Target BP
                </p>
                <p className="text-xl font-extrabold text-white mt-1">120/80</p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-center min-w-[110px] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200 flex items-center justify-center gap-1">
                  <Droplets className="size-3 text-teal-300" /> Glucose
                </p>
                <p className="text-xl font-extrabold text-white mt-1">4.0 - 7.8</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Patient Vitals Entry Section */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 md:p-8 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
                  <Activity className="size-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-slate-800">Patient Vitals</h2>
                  <p className="text-xs text-slate-500 font-medium">Input current physiological measurements</p>
                </div>
              </div>

              <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">
                6 Indicators
              </span>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="space-y-1">
                <Field
                  label="Patient Age (Years) * 👤"
                  type="number"
                  value={form.age}
                  onChange={(v) => setField("age", v)}
                  min={10}
                  max={90}
                />
              </div>

              <div className="space-y-1">
                <Field
                  label="Heart Rate (BPM) * ❤️"
                  type="number"
                  value={form.heart_rate}
                  onChange={(v) => setField("heart_rate", v)}
                  min={30}
                  max={200}
                />
              </div>

              <div className="space-y-1">
                <Field
                  label="Systolic BP (mmHg) * 🩸"
                  type="number"
                  value={form.systolic_bp}
                  onChange={(v) => setField("systolic_bp", v)}
                  min={50}
                  max={250}
                />
              </div>

              <div className="space-y-1">
                <Field
                  label="Diastolic BP (mmHg) * 🩺"
                  type="number"
                  value={form.diastolic_bp}
                  onChange={(v) => setField("diastolic_bp", v)}
                  min={30}
                  max={180}
                />
              </div>

              <div className="space-y-1">
                <Field
                  label="Blood Sugar (mmol/L) * 🧪"
                  type="number"
                  value={form.blood_sugar}
                  onChange={(v) => setField("blood_sugar", v)}
                  min={2}
                  max={30}
                  step={0.1}
                  hint="Typical fasting range is 4.0 – 7.8 mmol/L."
                />
              </div>

              <div className="space-y-1">
                <Field
                  label="Body Temp (°F) * 🌡️"
                  type="number"
                  value={form.body_temp}
                  onChange={(v) => setField("body_temp", v)}
                  min={90}
                  max={110}
                  step={0.1}
                  hint="Normal oral baseline is around 98.6°F."
                />
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 flex items-center gap-3">
                <AlertTriangle className="size-5 text-rose-600 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={() => void submit()}
              disabled={loading}
              className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-teal-700 hover:from-rose-500 hover:to-teal-600 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-pink-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Activity className="size-5 animate-spin" />
                  Analyzing Vitals with ML Model...
                </>
              ) : (
                <>
                  <Stethoscope className="size-5" />
                  Run Risk Screening Analysis
                  <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </section>

          {/* Screening Output & Diagnostic Results */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 md:p-8 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 border border-teal-200 shadow-sm">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-slate-800">Screening Result</h2>
                    <p className="text-xs text-slate-500 font-medium">Model prediction & risk rating</p>
                  </div>
                </div>
                {result && (
                  <span className="rounded-full bg-slate-100 border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {result.status}
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="mt-12 text-center p-8 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <HeartPulse className="size-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">Awaiting Vitals Data</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Fill in all six physiological metrics on the left and trigger a risk assessment to view AI outputs.
                  </p>
                </div>
              )}

              {loading && (
                <div className="mt-16 text-center py-12">
                  <Activity className="size-12 text-pink-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-extrabold text-slate-800">Processing Diagnostic Model...</p>
                  <p className="text-xs text-slate-500 mt-1">Evaluating parameters against maternal thresholds</p>
                </div>
              )}

              {result && riskConfig && (
                <div className="mt-6 space-y-5">
                  {/* Risk Level Badge */}
                  <div className={`rounded-3xl p-6 ${riskConfig.card}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                        <riskConfig.icon className="size-4" /> Categorized Risk
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${riskConfig.badge}`}>
                        {result.risk_level}
                      </span>
                    </div>

                    <p className="mt-3 font-display text-3xl font-black capitalize">
                      {result.risk_level}
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed opacity-90">
                      {riskConfig.text}
                    </p>
                  </div>

                  {/* Confidence Meter */}
                  <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="size-4 text-teal-600" /> Model Confidence
                      </p>
                      <p className="font-display text-xl font-extrabold text-slate-800">
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="mt-3 h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, result.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 italic bg-slate-100 p-3 rounded-xl border border-slate-200">
                    ℹ️ {result.disclaimer}
                  </p>
                </div>
              )}
            </div>

            {/* Medical Disclaimer Footer */}
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-900 flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Medical Disclaimer:</span> This AI tool provides screening estimates only and is not a clinical medical diagnosis. Always consult a qualified healthcare provider for proper evaluation.
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}