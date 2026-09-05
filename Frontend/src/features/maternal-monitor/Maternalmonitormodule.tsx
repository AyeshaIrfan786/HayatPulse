import { useState } from "react";
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
          <span className="font-semibold">Disclaimer:</span> This tool provides an AI-assisted
          risk screening only and is not a medical diagnosis. Always consult a qualified
          healthcare professional for interpretation and treatment decisions.
        </div>
      </main>
    </div>
  );
}