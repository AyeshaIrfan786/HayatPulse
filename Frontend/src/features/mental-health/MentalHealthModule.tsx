import { useRef, useState, useEffect } from "react";
import {
  Send,
  PhoneCall,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  RefreshCw,
  Wind,
  ShieldAlert,
  LifeBuoy,
  Trash2,
  Bot,
  User,
  Activity,
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL } from "@/lib/groq";
import { TriageChatMessage } from "@/lib/groq";

// ============================================================
// MODULE 8 — Urdu Mental Health Companion (AI-powered via Groq)
// ============================================================

const CRISIS_KEYWORDS = [
  "kill myself", "end my life", "suicide", "want to die", "harm myself",
  "hurt myself", "no reason to live", "better off dead", "end it all",
  "khudkushi", "khud kushi", "marna chahta", "marna chahti", "khatam kar",
  "zindagi khatam", "jeena nahi chahta", "jeena nahi chahti",
  "khud ko nuksan", "apne aap ko nuksan",
];

function containsCrisisLanguage(text: string) {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

const MENTAL_HEALTH_HELPLINES = [
  { name: "Umang Pakistan (24/7 Suicide Prevention)", numbers: ["0317-4288665", "0311-7786264", "0310-9990828"] },
  { name: "Taskeen Health Initiative", numbers: ["0316-8275336", "0317-1719452"] },
  { name: "Rozan Counseling Helpline (Mon–Fri, 9am–5pm)", numbers: ["0304-1111741", "051-2890505"] },
];

const QUICK_STARTER_PROMPTS = [
  "Aaj boht ziada zehni dabao (stress) ho raha hai...",
  "I feel completely overwhelmed and anxious right now.",
  "Khamoshi aur akelapan lag raha hai, baat karni hai...",
  "How can I instantly calm down my rapid heart rate?",
];

const MENTAL_HEALTH_SYSTEM_PROMPT = `You are talking to someone as a mature, emotionally grounded older sibling would - the kind of person people go to because they actually listen and give real, thoughtful responses, not because they say comforting-sounding things. This is for HayatPulse AI, used in Pakistan. You are NOT a therapist, psychiatrist, or doctor, and must never pretend to be one.

TONE - THIS IS THE MOST IMPORTANT PART:
- Talk like a real person, not a script. Vary your sentence structure completely between replies.
- BANNED PHRASES: never use generic therapy-speak clichés like "I'm here to listen", "your feelings matter", "you are worthy of love", "that must be hard", "I hear you", "you are not alone".
- React specifically to what they said, not to the general category of emotion.
- It's fine to be a little direct or even gently push back if something they say seems like a thought spiral, rather than always validating first.
- Keep it short - 1-3 sentences, under 35 words total.
- Ask at most one question, and only when it's natural.
- Only bring up talking to a trusted person/professional when it genuinely fits, phrased differently each time.
- STAY ON TOPIC: only discuss feelings and emotional wellbeing. If asked something unrelated (recipes, homework, facts), don't answer it — gently and briefly redirect back, varying how you do this each time.
- Do not repeat sentence structures or phrases you've already used earlier in this conversation.

HARD RULES:
- Reply in whichever language (Urdu or English) the person is writing in, matching their language.
- Never diagnose, never give clinical/medical advice.
- If self-harm or suicide comes up, be calm and direct, encourage reaching out to a real person immediately - do not provide methods, means, or unsafe content.
- Never be dismissive of something that's clearly serious to them.

Reply with ONLY your message text - plain text, no JSON, no markdown, no quotation marks around it.`;

async function getCompanionReply(history: TriageChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing VITE_GROQ_API_KEY).");
  }
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: MENTAL_HEALTH_SYSTEM_PROMPT }, ...history],
      temperature: 0.85,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("The Groq API key appears to be invalid.");
    if (response.status === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
    throw new Error(`AI service returned an error (status ${response.status}).`);
  }
  const data = await response.json();
  let raw = (data?.choices?.[0]?.message?.content ?? "").trim();
  raw = raw.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  return raw || "Sorry, I had trouble understanding. Could you tell me again?";
}

export function MentalHealthModule() {
  const module = getModule(8)!;
  const [messages, setMessages] = useState<TriageChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [showHelplineModal, setShowHelplineModal] = useState(false);
  const [activeTool, setActiveTool] = useState<"chat" | "breathing" | "grounding">("chat");
  const [breathingPhase, setBreathingPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Ready">("Ready");
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Breathing Exercise Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (breathingPhase !== "Ready") {
      interval = setInterval(() => {
        setBreathingTimer((prev) => {
          if (prev <= 1) {
            if (breathingPhase === "Inhale") {
              setBreathingPhase("Hold");
              return 7;
            } else if (breathingPhase === "Hold") {
              setBreathingPhase("Exhale");
              return 8;
            } else {
              setBreathingPhase("Inhale");
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingPhase]);

  const startBreathing = () => {
    setBreathingPhase("Inhale");
    setBreathingTimer(4);
  };

  const stopBreathing = () => {
    setBreathingPhase("Ready");
    setBreathingTimer(0);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text) return;
    setInput("");
    setError("");

    if (containsCrisisLanguage(text)) {
      setShowCrisisBanner(true);
    }

    const history: TriageChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setStatus("thinking");

    try {
      const reply = await getCompanionReply(history);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    setShowCrisisBanner(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-16">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <HeartPulse className="size-3.5 animate-pulse" />
              Empathetic Psychological First Aid (PFA)
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Urdu & English Emotional Companion
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A peer-level AI listener providing immediate grounding support, emotional vent space, and active Pakistani crisis intervention.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelplineModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
            >
              <PhoneCall className="size-4" />
              Emergency Helplines
            </button>
          </div>
        </div>

        {/* ALWAYS-ACCESSIBLE BILINGUAL DISCLAIMER BANNER */}
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold leading-relaxed">
                <span className="font-bold text-amber-950 dark:text-amber-100">Medical & Psychological Safety Disclaimer:</span> This AI companion offers supportive listening and is not a clinical therapist, psychiatrist, or medical doctor. It cannot diagnose or treat mental health conditions.
              </p>
              <p className="font-sans leading-relaxed text-right dir-rtl text-amber-950 dark:text-amber-100 font-medium" dir="rtl">
                <strong>نفسیاتی و طبی ڈسکلیمر:</strong> یہ اے آئی ساتھی صرف جذباتی اور ذہنی تعاون کے لیے ہے۔ یہ کوئی کلینیکل معالج یا ڈاکٹر نہیں ہے اور طبی تشخیص یا علاج فراہم نہیں کر سکتا۔
              </p>
            </div>
          </div>
        </div>

        {/* TRIGGERED CRISIS BANNER */}
        {(showCrisisBanner || showHelplineModal) && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/10 p-5 shadow-md text-rose-800 dark:text-rose-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-6 text-rose-600 animate-bounce" />
                <h3 className="font-display font-bold text-base">You Are Not Alone · immediate Pakistani Support Available</h3>
              </div>
              <button
                onClick={() => {
                  setShowCrisisBanner(false);
                  setShowHelplineModal(false);
                }}
                className="text-xs font-semibold underline text-rose-700 hover:text-rose-900 dark:text-rose-300"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs font-medium">
              If you or someone you know is experiencing acute distress or self-harm thoughts, please reach out directly to verified Pakistani mental health specialists right now:
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {MENTAL_HEALTH_HELPLINES.map((h) => (
                <div key={h.name} className="rounded-xl bg-background/90 border border-rose-200 p-3 shadow-sm dark:border-rose-900/50">
                  <p className="font-semibold text-xs text-foreground">{h.name}</p>
                  <div className="mt-2 space-y-1">
                    {h.numbers.map((num) => (
                      <a
                        key={num}
                        href={`tel:${num.replace(/[^0-9]/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400 block"
                      >
                        <PhoneCall className="size-3" />
                        {num}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
              <span>National Disaster / Rescue: Rescue 1122</span>
              <span>Edhi Ambulance: 115</span>
              <span>Chhipa Ambulance: 1020</span>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS: CHAT vs BREATHING vs GROUNDING */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3">
          <button
            onClick={() => setActiveTool("chat")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTool === "chat"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Sparkles className="size-3.5" />
            AI Companion Chat
          </button>
          <button
            onClick={() => setActiveTool("breathing")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTool === "breathing"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Wind className="size-3.5" />
            4-7-8 Breathing Tool
          </button>
          <button
            onClick={() => setActiveTool("grounding")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTool === "grounding"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Activity className="size-3.5" />
            5-4-3-2-1 Grounding
          </button>
        </div>

        {/* TAB 1: AI COMPANION CHAT */}
        {activeTool === "chat" && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
            
            {/* Header / Clear Actions */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-teal-600" />
                <h2 className="font-display text-base font-bold">Encrypted Emotional Vent Space</h2>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-600 transition-colors"
                  title="Clear current session"
                >
                  <Trash2 className="size-3.5" />
                  Reset Chat
                </button>
              )}
            </div>

            {/* Quick Starter Prompts */}
            {messages.length === 0 && (
              <div className="space-y-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select a starter thought or type anything in Urdu / English:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => void send(prompt)}
                      className="text-left rounded-xl border border-border bg-background p-3 text-xs text-foreground/90 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Feed */}
            <div className="min-h-[300px] max-h-[480px] overflow-y-auto space-y-3 pr-2 pt-2">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end items-start gap-2">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-teal-600 px-4 py-3 text-xs sm:text-sm text-white shadow-sm">
                      {m.content}
                    </div>
                    <div className="size-7 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 text-teal-800 dark:text-teal-200">
                      <User className="size-4" />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start items-start gap-2">
                    <div className="size-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                      <Bot className="size-4" />
                    </div>
                    <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tl-xs border border-border bg-surface p-4 text-xs sm:text-sm leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                )
              )}

              {status === "thinking" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <RefreshCw className="size-3.5 animate-spin text-teal-600" />
                  AI companion is formulating a thoughtful response…
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Input Form */}
            <div className="pt-2 flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Type your feelings in Urdu or English (e.g., 'Aaj boht pareshani hai')..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
              <button
                onClick={() => void send()}
                disabled={status === "thinking" || !input.trim()}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 active:scale-95"
              >
                <Send className="size-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 2: 4-7-8 BREATHING EXERCISE WIDGET */}
        {activeTool === "breathing" && (
          <section className="rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-sm">
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="font-display text-xl font-bold">4-7-8 Panic Reduction Breathing</h2>
              <p className="text-xs text-muted-foreground">
                Inhale through nose for 4s, Hold for 7s, Exhale slowly through mouth for 8s. Proven to reduce rapid heart rates during anxiety spikes.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <div
                className={`size-44 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
                  breathingPhase === "Inhale"
                    ? "scale-110 border-teal-500 bg-teal-500/10 text-teal-600"
                    : breathingPhase === "Hold"
                    ? "scale-105 border-amber-500 bg-amber-500/10 text-amber-600"
                    : breathingPhase === "Exhale"
                    ? "scale-95 border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">{breathingPhase}</span>
                {breathingPhase !== "Ready" && (
                  <span className="mt-1 font-display text-4xl font-bold">{breathingTimer}s</span>
                )}
              </div>
            </div>

            <div>
              {breathingPhase === "Ready" ? (
                <button
                  onClick={startBreathing}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
                >
                  <Wind className="size-4" />
                  Begin Breathing Cycle
                </button>
              ) : (
                <button
                  onClick={stopBreathing}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary transition-all"
                >
                  Stop Exercise
                </button>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: 5-4-3-2-1 GROUNDING TECHNIQUE */}
        {activeTool === "grounding" && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold">5-4-3-2-1 Sensory Grounding Technique</h2>
              <p className="text-xs text-muted-foreground">
                If you feel detached, overwhelmed, or experiencing a panic attack, look around your immediate environment and name:
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5 pt-2">
              <div className="rounded-xl border border-border bg-background p-4 text-center space-y-1">
                <span className="font-display text-2xl font-bold text-teal-600">5</span>
                <p className="text-xs font-semibold">Things you SEE</p>
                <p className="text-[11px] text-muted-foreground">Look at surrounding furniture, light, objects.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center space-y-1">
                <span className="font-display text-2xl font-bold text-teal-600">4</span>
                <p className="text-xs font-semibold">Things you TOUCH</p>
                <p className="text-[11px] text-muted-foreground">Feel your clothes, chair texture, or floor.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center space-y-1">
                <span className="font-display text-2xl font-bold text-teal-600">3</span>
                <p className="text-xs font-semibold">Things you HEAR</p>
                <p className="text-[11px] text-muted-foreground">Listen for fan hum, traffic, or footsteps.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center space-y-1">
                <span className="font-display text-2xl font-bold text-teal-600">2</span>
                <p className="text-xs font-semibold">Things you SMELL</p>
                <p className="text-[11px] text-muted-foreground">Notice air scent, tea, or rain aroma.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center space-y-1">
                <span className="font-display text-2xl font-bold text-teal-600">1</span>
                <p className="text-xs font-semibold">Thing you TASTE</p>
                <p className="text-[11px] text-muted-foreground">Sip cold water or taste mint/gum.</p>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}