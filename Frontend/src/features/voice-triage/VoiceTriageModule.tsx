import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2 } from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, type TriageChatMessage } from "@/lib/groq";

// ------------------------------------------------------------
// unsupported browsers fall back to text input only.
// -----------------------------------------------------------
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultLike[] & { length: number };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type TriageLevel = "EMERGENCY" | "URGENT" | "ROUTINE" | "HOME_CARE" | "NEED_MORE_INFO";

type TriageResult = {
  level: TriageLevel;
  replyUr: string;
  replyEn: string;
};

const TRIAGE_SYSTEM_PROMPT = `You are HayatPulse AI, a bilingual (Urdu + English) medical voice triage assistant for a healthcare app used in Pakistan, including rural and low-literacy users.

Your job: listen to what the patient says about their symptoms (given as text), and either:
(a) ask ONE short, simple follow-up question if you genuinely need more information to judge urgency, OR
(b) give a final triage classification once you have enough information.

You must ALWAYS reply with ONLY a valid JSON object, nothing else, no markdown, no code fences. The JSON must have exactly this shape:
{
  "level": "EMERGENCY" | "URGENT" | "ROUTINE" | "HOME_CARE" | "NEED_MORE_INFO",
  "replyUr": "<your reply written in Urdu script, warm and simple, max 3 short sentences>",
  "replyEn": "<the same reply translated into simple English, max 3 short sentences>"
}

Rules:
- Use "NEED_MORE_INFO" only if you genuinely cannot judge urgency yet (max 2 follow-up questions total, then you MUST commit to a level).
- Use "EMERGENCY" for anything potentially life-threatening (chest pain, can't breathe, unconscious, heavy bleeding, stroke signs, severe allergic reaction, suicidal thoughts, poisoning).
- Use "URGENT" for things needing care within hours (high fever, broken bone, severe pain, dehydration, deep wounds).
- Use "ROUTINE" for things needing a doctor visit within a day or two (persistent cough, mild-moderate fever, stomach upset).
- Use "HOME_CARE" for mild, self-limiting symptoms (common cold, minor headache, minor cuts).
- When in doubt between two levels, always pick the MORE urgent one.
- Keep replies short, warm, and easy to understand for someone with low health literacy. No medical jargon.
- Never claim to give a diagnosis, only guidance on urgency of seeking care.
- If the user's message is unrelated to health/symptoms, gently redirect them to describe their symptoms.`;

function parseTriageJSON(rawText: string): TriageResult {
  let cleaned = rawText.trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const parsed = JSON.parse(cleaned) as Partial<TriageResult>;
    const validLevels: TriageLevel[] = ["EMERGENCY", "URGENT", "ROUTINE", "HOME_CARE", "NEED_MORE_INFO"];
    if (!parsed.level || !validLevels.includes(parsed.level)) throw new Error("Invalid level");
    if (!parsed.replyUr || !parsed.replyEn) throw new Error("Missing reply text");
    return parsed as TriageResult;
  } catch {
    return {
      level: "ROUTINE",
      replyUr: "معذرت، جواب سمجھنے میں مسئلہ ہوا۔ براہ کرم اپنی علامات دوبارہ بتائیں یا ڈاکٹر سے رجوع کریں۔",
      replyEn: "Sorry, there was a problem understanding the response. Please describe your symptoms again or consult a doctor.",
    };
  }
}

async function getTriageResponse(history: TriageChatMessage[]): Promise<TriageResult> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: TRIAGE_SYSTEM_PROMPT }, ...history],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  const rawText = (data?.choices?.[0]?.message?.content ?? "").trim();
  return parseTriageJSON(rawText);
}

const TRIAGE_LEVEL_STYLES: Record<TriageLevel, string> = {
  EMERGENCY: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  URGENT: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ROUTINE: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  HOME_CARE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  NEED_MORE_INFO: "border-border bg-surface text-foreground",
};

type TriageDisplayEntry =
  | { key: number; role: "user"; text: string }
  | { key: number; role: "assistant"; level?: TriageLevel; replyUr: string; replyEn: string };

export function VoiceTriageModule() {
  const module = getModule(9)!;
  const [messages, setMessages] = useState<TriageChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const [finalResult, setFinalResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceOutputSupported, setVoiceOutputSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setVoiceInputSupported(!!SpeechRecognitionCtor);
    setVoiceOutputSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn't supported in this browser. Please type instead, or try Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    setError("");
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ur-PK";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Could not capture voice. Please try again, or type your symptoms instead.");
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const speak = (text: string) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    window.speechSynthesis.speak(utterance);
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (isListening) recognitionRef.current?.stop();
    setInput("");
    setError("");
    const history: TriageChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setStatus("thinking");
    try {
      const result = await getTriageResponse(history);
      setMessages([...history, { role: "assistant", content: JSON.stringify(result) }]);
      if (result.level !== "NEED_MORE_INFO") setFinalResult(result);
      if (voiceOutputSupported) speak(result.replyUr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  const restart = () => {
    recognitionRef.current?.stop();
    if (voiceOutputSupported) window.speechSynthesis.cancel();
    setMessages([]);
    setFinalResult(null);
    setError("");
  };

  const displayLog: TriageDisplayEntry[] = messages.map((m, i) => {
    if (m.role === "user") return { key: i, role: "user", text: m.content };
    try {
      const parsed = JSON.parse(m.content) as TriageResult;
      return { key: i, role: "assistant", ...parsed };
    } catch {
      return { key: i, role: "assistant", replyUr: m.content, replyEn: "" };
    }
  });

  const isFinal = finalResult && finalResult.level !== "NEED_MORE_INFO";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI-powered conversational triage</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Describe your symptoms.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Speak or type in Urdu or English. The assistant may ask a short follow-up question
            before giving an urgency level, and can read its replies aloud for low-literacy users.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          This tool gives general guidance only and is NOT a medical diagnosis. In a real
          emergency, seek immediate in-person help or call emergency services.
        </div>

        <section className="space-y-3">
          {displayLog.map((entry) =>
            entry.role === "user" ? (
              <div
                key={entry.key}
                className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground"
              >
                {entry.text}
              </div>
            ) : (
              <div
                key={entry.key}
                className={`max-w-[85%] rounded-2xl rounded-bl-sm border p-4 text-sm ${
                  entry.level ? TRIAGE_LEVEL_STYLES[entry.level] : "border-border bg-surface"
                }`}
              >
                {entry.level && entry.level !== "NEED_MORE_INFO" && (
                  <p className="mb-1 font-semibold">{entry.level.replace("_", " ")}</p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p>{entry.replyUr}</p>
                  {voiceOutputSupported && entry.replyUr && (
                    <button
                      onClick={() => speak(entry.replyUr ?? "")}
                      aria-label="Read this reply aloud"
                      className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100"
                    >
                      <Volume2 className="size-4" />
                    </button>
                  )}
                </div>
                {entry.replyEn && <p className="mt-1 text-xs opacity-80">{entry.replyEn}</p>}
              </div>
            ),
          )}
        </section>

        {status === "thinking" && <p className="text-sm text-muted-foreground">Thinking…</p>}

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {finalResult?.level === "EMERGENCY" && (
          <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 text-center text-red-700 dark:text-red-300">
            <p className="font-semibold">🚨 Seek immediate in-person medical help now.</p>
          </div>
        )}

        {!isFinal ? (
          <div className="space-y-2">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={isListening ? "Listening… speak now" : "e.g. mujhe bukhar hai"}
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
              />
              {voiceInputSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={status === "thinking"}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  aria-pressed={isListening}
                  className={`shrink-0 rounded-full p-3 transition-colors disabled:opacity-60 ${
                    isListening
                      ? "animate-pulse bg-red-500 text-white"
                      : "border border-border bg-surface text-foreground hover:border-ring"
                  }`}
                >
                  <Mic className="size-4" />
                </button>
              )}
              <button
                onClick={() => void send()}
                disabled={status === "thinking" || !input.trim()}
                className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <span className="hidden sm:inline">Send</span>
                <Send className="size-4 sm:hidden" />
              </button>
            </div>
            {voiceInputSupported ? (
              <p className="text-xs text-muted-foreground">
                Tap the mic to speak your symptoms, or type them in — both work the same way.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Voice input isn't supported in this browser — please type your symptoms instead.
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={restart}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Start new check
          </button>
        )}
      </main>
    </div>
  );
}
