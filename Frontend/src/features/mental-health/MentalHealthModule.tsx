import { useRef, useState, ChangeEvent, DragEvent} from "react";
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

// NOTE: these helpline numbers were provided by a team member as
// verified/active Pakistani mental-health resources. Please do a final
// cross-check (official website/social media) before relying on them
// in front of real users, since contact numbers can change over time.
const MENTAL_HEALTH_HELPLINES = [
  { name: "Umang Pakistan (24/7 Suicide Prevention)", numbers: ["0317-4288665", "0311-7786264", "0310-9990828"] },
  { name: "Taskeen Health Initiative", numbers: ["0316-8275336", "0317-1719452"] },
  { name: "Rozan Counseling Helpline (Mon–Fri, 9am–5pm)", numbers: ["0304-1111741", "051-2890505"] },
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
  const [error, setError] = useState("");

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError("");
    if (containsCrisisLanguage(text)) setShowCrisisBanner(true);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">AI companion — emotional support only</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Talk it through.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            This is not a therapist and cannot diagnose. For serious concerns, please reach out
            to a trusted person or professional.
          </p>
        </div>

        {showCrisisBanner && (
          <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 text-red-700 dark:text-red-300">
            <p className="mb-3 font-semibold">
              You are not alone. If you&apos;re thinking about harming yourself, please contact
              one of these numbers right now:
            </p>
            <div className="space-y-2 text-sm">
              {MENTAL_HEALTH_HELPLINES.map((h) => (
                <div key={h.name}>
                  <span className="font-semibold">{h.name}:</span> {h.numbers.join(" / ")}
                </div>
              ))}
              <div>
                <span className="font-semibold">Emergency:</span> Rescue 1122 · Edhi Foundation 115
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground"
              >
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-surface p-4 text-sm"
              >
                {m.content}
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
            placeholder="Type here…"
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
          />
          <button
            onClick={() => void send()}
            disabled={status === "thinking" || !input.trim()}
            className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
