import { useRef, useState, ChangeEvent, DragEvent} from "react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL } from "@/lib/groq";
import {Plus, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Loader2, BookOpen , ShieldAlert} from "lucide-react";
import { Upload } from "lucide-react";
// ============================================================
// MODULE 6 — Prescription OCR & Drug Safety (AI-powered via Groq Vision)
// ============================================================

// NOTE: this calls Groq directly from the browser using VITE_GROQ_API_KEY,
// matching the same (temporary, client-side) pattern already used by the
// Voice Triage and Mental Health modules in this file. It needs the same
// server-side proxy treatment before production use — see the note in
// backendContracts[6] above.
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

type PrescriptionAnalysis = {
  medicines: string[];
  confidence: "high" | "medium" | "low";
  notes: string;
};

const PRESCRIPTION_SYSTEM_PROMPT = `You are a careful medical prescription reader. You will be shown a photo of a handwritten or printed prescription (may be in English or Urdu/Roman Urdu).

Your job:
1. Read the image carefully and extract every distinct medicine name you can identify. Normalize each to its common generic or brand name (e.g. "Panadol" not "panadol tab 500mg bd").
2. Ignore dosage instructions, doctor details, patient details, and letterhead text — only return medicine names.
3. Judge how confident you are in your reading overall.

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "medicines": ["<medicine name>", "<medicine name>", ...],
  "confidence": "high" | "medium" | "low",
  "notes": "<one short sentence on anything illegible or uncertain, or empty string if fully clear>"
}

If you cannot read any medicine names at all, return an empty medicines array and explain why in "notes".`;

function parsePrescriptionJSON(rawText: string): PrescriptionAnalysis {
  let cleaned = rawText.trim();
  // Some reasoning-capable models prepend a <think>...</think> block before the answer.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  if (!cleaned) {
    return {
      medicines: [],
      confidence: "low",
      notes: "The AI returned an empty response. Please try again.",
    };
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<PrescriptionAnalysis>;
    const validConfidence = ["high", "medium", "low"];
    if (!Array.isArray(parsed.medicines)) throw new Error("Invalid medicines array");
    if (!parsed.confidence || !validConfidence.includes(parsed.confidence)) {
      parsed.confidence = "low";
    }
    return {
      medicines: parsed.medicines
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
      confidence: parsed.confidence as PrescriptionAnalysis["confidence"],
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return {
      medicines: [],
      confidence: "low",
      notes: "Could not understand the AI response. Try a clearer, well-lit photo.",
    };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function analyzePrescriptionImage(imageDataUrl: string): Promise<PrescriptionAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: "system", content: PRESCRIPTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this prescription and extract the medicine names." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429)
      throw new Error("Too many requests right now — please wait a moment and try again.");
    if (response.status === 404 || response.status === 400)
      throw new Error(
        "The configured vision model was rejected by Groq. Check that GROQ_VISION_MODEL matches a current model in your Groq account.",
      );
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message || "The AI service returned an error.",
    );
  }
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parsePrescriptionJSON(rawText);
}

// Reference table of well-established, high-risk multi-drug combinations.
// This is a static safety net, not an exhaustive clinical database — it
// catches common dangerous pairs by keyword so it still works even when
// OCR spells a medicine slightly differently than expected.
type InteractionRule = {
  keywordsA: string[];
  keywordsB: string[];
  severity: "severe" | "moderate";
  risk: string;
};

const DRUG_INTERACTION_RULES: InteractionRule[] = [
  {
    keywordsA: ["warfarin"],
    keywordsB: ["aspirin", "ibuprofen", "diclofenac", "naproxen"],
    severity: "severe",
    risk: "Combined blood-thinning effect — significantly raises bleeding risk.",
  },
  {
    keywordsA: ["sildenafil", "viagra", "tadalafil", "vardenafil"],
    keywordsB: ["nitrate", "nitroglycerin", "isosorbide"],
    severity: "severe",
    risk: "Can cause a sudden, severe drop in blood pressure.",
  },
  {
    keywordsA: ["tramadol", "fluoxetine", "sertraline", "paroxetine", "citalopram"],
    keywordsB: ["maoi", "phenelzine", "moclobemide", "selegiline"],
    severity: "severe",
    risk: "Risk of serotonin syndrome (agitation, high fever, rapid heart rate).",
  },
  {
    keywordsA: ["methotrexate"],
    keywordsB: ["ibuprofen", "diclofenac", "naproxen", "aspirin"],
    severity: "severe",
    risk: "NSAIDs can raise methotrexate levels to toxic amounts.",
  },
  {
    keywordsA: ["lithium"],
    keywordsB: ["ibuprofen", "diclofenac", "naproxen", "hydrochlorothiazide", "furosemide"],
    severity: "moderate",
    risk: "Can raise lithium levels and cause toxicity.",
  },
  {
    keywordsA: ["digoxin"],
    keywordsB: ["furosemide", "hydrochlorothiazide", "spironolactone"],
    severity: "moderate",
    risk: "Diuretic-induced low potassium can trigger digoxin toxicity.",
  },
  {
    keywordsA: ["clopidogrel"],
    keywordsB: ["omeprazole", "esomeprazole"],
    severity: "moderate",
    risk: "These PPIs can reduce clopidogrel's ability to prevent clots.",
  },
  {
    keywordsA: ["ciprofloxacin", "levofloxacin"],
    keywordsB: ["theophylline"],
    severity: "moderate",
    risk: "Can raise theophylline levels toward toxicity.",
  },
  {
    keywordsA: ["diazepam", "alprazolam", "clonazepam", "lorazepam"],
    keywordsB: ["tramadol", "morphine", "codeine", "oxycodone"],
    severity: "severe",
    risk: "Combined sedation raises the risk of dangerously slowed breathing.",
  },
  {
    keywordsA: ["lisinopril", "enalapril", "ramipril", "losartan"],
    keywordsB: ["spironolactone", "potassium"],
    severity: "moderate",
    risk: "Can push blood potassium to dangerously high levels.",
  },
  {
    keywordsA: ["metformin"],
    keywordsB: ["contrast dye", "iodinated contrast"],
    severity: "moderate",
    risk: "Contrast dye can worsen kidney function and raise lactic-acidosis risk with metformin.",
  },
  {
    keywordsA: ["simvastatin", "atorvastatin"],
    keywordsB: ["clarithromycin", "erythromycin"],
    severity: "moderate",
    risk: "These antibiotics can raise statin levels and muscle-damage risk.",
  },
];

type FlaggedInteraction = InteractionRule & { medicineA: string; medicineB: string };

function findInteractions(medicines: string[]): FlaggedInteraction[] {
  const flagged: FlaggedInteraction[] = [];
  for (let i = 0; i < medicines.length; i++) {
    for (let j = i + 1; j < medicines.length; j++) {
      const nameA = medicines[i].toLowerCase();
      const nameB = medicines[j].toLowerCase();
      for (const rule of DRUG_INTERACTION_RULES) {
        const aMatchesA = rule.keywordsA.some((keyword) => nameA.includes(keyword));
        const bMatchesB = rule.keywordsB.some((keyword) => nameB.includes(keyword));
        const aMatchesB = rule.keywordsA.some((keyword) => nameB.includes(keyword));
        const bMatchesA = rule.keywordsB.some((keyword) => nameA.includes(keyword));
        if ((aMatchesA && bMatchesB) || (aMatchesB && bMatchesA)) {
          flagged.push({ ...rule, medicineA: medicines[i], medicineB: medicines[j] });
        }
      }
    }
  }
  return flagged;
}

const MAX_PRESCRIPTION_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

// ------------------------------------------------------------
// Medicine guide — plain-language "what is this for" lookup,
// generated by the text model (no image needed here).
// ------------------------------------------------------------
type MedicineGuideEntry = {
  name: string;
  usedFor: string;
  category: string;
  commonSideEffects: string;
  precautions: string;
};

const MEDICINE_GUIDE_SYSTEM_PROMPT = `You are a careful, plain-language medicine information assistant for a healthcare app used in Pakistan. You will be given a list of medicine names (as read from a prescription, possibly slightly misspelled).

For EACH medicine in the list, provide a short, easy-to-understand guide covering: what it is normally used for, what category/class of drug it is, common (non-alarming) side effects, and key precautions (e.g. take with food, avoid alcohol, not for pregnant women, etc). Keep every field to one short sentence. Use simple words a non-medical person can understand. If you don't recognize a name, do your best guess based on similar-sounding known medicines, and say so briefly in "usedFor".

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "entries": [
    {
      "name": "<medicine name exactly as given>",
      "usedFor": "<one short sentence: what it treats>",
      "category": "<short drug class, e.g. 'Antibiotic (penicillin family)'>",
      "commonSideEffects": "<one short sentence>",
      "precautions": "<one short sentence>"
    }
  ]
}

Include exactly one entry per medicine given, in the same order, even if unsure.`;

function parseMedicineGuideJSON(rawText: string, medicines: string[]): MedicineGuideEntry[] {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const parsed = JSON.parse(cleaned) as { entries?: Partial<MedicineGuideEntry>[] };
    if (!Array.isArray(parsed.entries)) throw new Error("Invalid entries array");
    return parsed.entries.map((entry, index) => ({
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : medicines[index] ?? "Unknown",
      usedFor: typeof entry.usedFor === "string" && entry.usedFor.trim() ? entry.usedFor.trim() : "Not available.",
      category:
        typeof entry.category === "string" && entry.category.trim() ? entry.category.trim() : "Not available.",
      commonSideEffects:
        typeof entry.commonSideEffects === "string" && entry.commonSideEffects.trim()
          ? entry.commonSideEffects.trim()
          : "Not available.",
      precautions:
        typeof entry.precautions === "string" && entry.precautions.trim()
          ? entry.precautions.trim()
          : "Not available.",
    }));
  } catch {
    // Fall back to a stub entry per medicine so the UI can still show something useful.
    return medicines.map((name) => ({
      name,
      usedFor: "Could not fetch a guide for this medicine right now.",
      category: "Not available.",
      commonSideEffects: "Not available.",
      precautions: "Always confirm with a pharmacist or doctor.",
    }));
  }
}

async function fetchMedicineGuide(medicines: string[]): Promise<MedicineGuideEntry[]> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: MEDICINE_GUIDE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Medicines: ${JSON.stringify(medicines)}\n\nReply with the JSON object described in your instructions.`,
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429)
      throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  if (data?.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error.message || "The AI service returned an error.",
    );
  }
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parseMedicineGuideJSON(rawText, medicines);
}

export function PrescriptionSafetyModule() {
  const module = getModule(6)!;
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PrescriptionAnalysis | null>(null);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [newMedicine, setNewMedicine] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [guide, setGuide] = useState<MedicineGuideEntry[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);

  const interactions = findInteractions(medicines);

  const loadGuide = async () => {
    if (medicines.length === 0) {
      setGuideError("Add at least one medicine first.");
      return;
    }
    setGuideError("");
    setGuideLoading(true);
    try {
      const entries = await fetchMedicineGuide(medicines);
      setGuide(entries);
    } catch (guideErr) {
      setGuideError(guideErr instanceof Error ? guideErr.message : "Could not load the medicine guide.");
    } finally {
      setGuideLoading(false);
    }
  };

  const processFile = async (file: File) => {
    setError("");
    setResult(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (photo or scan of the prescription).");
      return;
    }
    if (file.size > MAX_PRESCRIPTION_IMAGE_BYTES) {
      setError("That image is larger than 8 MB — please choose a smaller photo.");
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setImagePreview(dataUrl);
    } catch {
      setError("Could not load that image. Please try another file.");
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  };

  const analyze = async () => {
    if (!imagePreview) {
      setError("Choose a prescription photo first.");
      return;
    }
    setError("");
    setAnalyzing(true);
    try {
      const analysis = await analyzePrescriptionImage(imagePreview);
      setResult(analysis);
      setMedicines(analysis.medicines);
      if (analysis.medicines.length === 0 && !analysis.notes) {
        setError("No medicine names could be read from this photo. Try a clearer image.");
      }
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  };

  const addMedicine = () => {
    const trimmed = newMedicine.trim();
    if (!trimmed) return;
    setMedicines((current) => [...current, trimmed]);
    setNewMedicine("");
  };

  const removeMedicine = (index: number) => {
    setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const reset = () => {
    setImagePreview("");
    setResult(null);
    setMedicines([]);
    setNewMedicine("");
    setError("");
    setIsDraggingOver(false);
    setGuide([]);
    setGuideError("");
    dragCounterRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI-assisted safety check</p>
          <h1 className="mt-3 font-display text-4xl font-bold">
            Prescription OCR &amp; drug safety.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Upload a photo of a handwritten or printed prescription. The AI reads the medicine
            names, and every pair is checked against a built-in list of well-known dangerous
            combinations.
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void handleFileChange(event)}
                className="hidden"
                id="prescription-file-input"
              />
              <label
                htmlFor="prescription-file-input"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors ${
                  isDraggingOver
                    ? "border-ring bg-ring/10"
                    : "border-border bg-surface hover:border-ring"
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Prescription preview"
                    className="max-h-56 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <Upload className="size-6 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isDraggingOver ? "Drop the photo here" : "Tap to upload, drag & drop, or take a photo"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG or PNG, up to 8 MB
                    </span>
                  </>
                )}
              </label>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <button
                onClick={() => void analyze()}
                disabled={!imagePreview || analyzing}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Reading prescription…
                  </>
                ) : (
                  "Analyze prescription"
                )}
              </button>
              <button
                onClick={reset}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold"
              >
                Clear
              </button>
              {result && (
                <p className="text-xs text-muted-foreground">
                  Reading confidence: <span className="font-semibold">{result.confidence}</span>
                  {result.notes ? ` — ${result.notes}` : ""}
                </p>
              )}
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </section>

        {(medicines.length > 0 || result) && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Detected medicines</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remove anything misread, or add a medicine the AI missed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {medicines.map((medicine, index) => (
                <span
                  key={`${medicine}-${index}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm"
                >
                  {medicine}
                  <button
                    onClick={() => removeMedicine(index)}
                    aria-label={`Remove ${medicine}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              {medicines.length === 0 && (
                <p className="text-sm text-muted-foreground">No medicines added yet.</p>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={newMedicine}
                onChange={(event) => setNewMedicine(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMedicine();
                  }
                }}
                placeholder="Add a medicine name"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              <button
                onClick={addMedicine}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
            {medicines.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => void loadGuide()}
                  disabled={guideLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {guideLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Getting medicine guide…
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-4" /> Get full medicine guide
                    </>
                  )}
                </button>
                {guideError && (
                  <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {guideError}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {guide.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Medicine guide</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What each medicine is for, in plain language. This is general information, not a
              substitute for a pharmacist or doctor.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {guide.map((entry, index) => (
                <article key={`${entry.name}-${index}`} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                    {entry.name}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.category}
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-medium">Used for</dt>
                      <dd className="text-muted-foreground">{entry.usedFor}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Common side effects</dt>
                      <dd className="text-muted-foreground">{entry.commonSideEffects}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Precautions</dt>
                      <dd className="text-muted-foreground">{entry.precautions}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {medicines.length >= 2 && (
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Contraindication check</h2>
            {interactions.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> No known dangerous
                combinations found among these medicines in our reference list.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {interactions.map((interaction, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-4 ${
                      interaction.severity === "severe"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-2 font-semibold ${
                        interaction.severity === "severe"
                          ? "text-red-700 dark:text-red-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <ShieldAlert className="size-4 shrink-0" />
                      {interaction.medicineA} + {interaction.medicineB} —{" "}
                      {interaction.severity === "severe" ? "Severe risk" : "Moderate risk"}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {interaction.risk}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          This tool is an informational aid only. OCR and the reference list are not exhaustive —
          always confirm medicines and interactions with a pharmacist or doctor before use.
        </div>
      </main>
    </div>
  );
}
