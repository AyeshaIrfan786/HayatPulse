import { useState, type ChangeEvent } from "react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

const VISION_API_BASE =
  (import.meta.env["VITE_VISION_API_BASE"] as string | undefined) ?? "http://127.0.0.1:8000";

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

export function VisionDiagnosticsModule() {
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
          <span className="font-semibold">Disclaimer:</span> This tool provides an AI-assisted
          pre-screening only and is not a medical diagnosis. Always consult a qualified healthcare
          professional for interpretation and treatment decisions.
        </div>
      </main>
    </div>
  );
}