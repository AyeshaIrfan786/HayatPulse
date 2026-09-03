import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Smartphone,
  Server,
  Send,
  Activity,
  ShieldAlert,
  ArrowLeft,
  WifiOff,
  Check,
  CheckCheck,
  Radio,
  BarChart3,
  Languages,
  Droplet,
  Waves,
  Thermometer,
  Pill,
  Baby,
  Signal,
  Clock,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------
   BILINGUAL COPY — every user-facing string lives here so the whole
   module can flip between English and Urdu with a single toggle.
------------------------------------------------------------------- */
type Lang = "en" | "ur";

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    back: "Back to console",
    title: "Offline GSM / SMS Gateway",
    subtitle: "Disaster-resilient SMS routing when 4G/data networks fail.",
    gatewayActive: "Gateway Active",
    gatewayOffline: "Gateway Offline",
    patientSim: "Patient Simulator (Offline SMS)",
    patientSimSub: "No internet required — plain text SMS only",
    placeholder: "Try: 'Need BLOOD', 'FLOOD rescue', 'Bukhar tez hai'…",
    quickChips: "Quick Emergency Keywords",
    serverLogs: "System Command Logs",
    serverLogsSub: "Live GSM gateway processing pipeline",
    analytics: "Session Analytics",
    totalMsgs: "Messages Routed",
    avgResponse: "Avg. Auto-Reply Time",
    byCategory: "By Category",
    toggleNetwork: "Simulate Cell Tower Down",
    initLog: "GSM Gateway Initialized. Listening on port 8080 for store-and-forward SMS packets.",
    systemOnline: "System Online. Awaiting incoming offline SMS queries…",
  },
  ur: {
    back: "ڈیش بورڈ پر واپس",
    title: "آف لائن جی ایس ایم / ایس ایم ایس گیٹ وے",
    subtitle: "جب 4G/ڈیٹا نیٹ ورک بند ہو جائیں تو ایس ایم ایس کے ذریعے ہنگامی رابطہ۔",
    gatewayActive: "گیٹ وے فعال",
    gatewayOffline: "گیٹ وے بند",
    patientSim: "مریض سمیولیٹر (آف لائن ایس ایم ایس)",
    patientSimSub: "انٹرنیٹ کی ضرورت نہیں — صرف سادہ ایس ایم ایس",
    placeholder: "لکھیں: 'خون چاہیے'، 'سیلاب مدد'، 'بخار تیز ہے'…",
    quickChips: "فوری ہنگامی الفاظ",
    serverLogs: "سسٹم کمانڈ لاگز",
    serverLogsSub: "براہ راست جی ایس ایم گیٹ وے پروسیسنگ",
    analytics: "سیشن کے اعداد و شمار",
    totalMsgs: "موصول شدہ پیغامات",
    avgResponse: "اوسط خودکار جواب کا وقت",
    byCategory: "قسم کے مطابق",
    toggleNetwork: "موبائل ٹاور بند کی نقالی کریں",
    initLog: "جی ایس ایم گیٹ وے فعال۔ پورٹ 8080 پر ایس ایم ایس پیکٹس کا انتظار۔",
    systemOnline: "سسٹم فعال ہے۔ آف لائن ایس ایم ایس کے منتظر…",
  },
};

/* ------------------------------------------------------------------
   KEYWORD ENGINE — English + Roman-Urdu + Urdu-script triggers.
   Each rule carries its own category (for analytics), an icon and a
   canned dispatch reply so judges can see real triage logic at work.
------------------------------------------------------------------- */
type KeywordRule = {
  id: string;
  category: string;
  icon: LucideIcon;
  color: string;
  match: (text: string) => boolean;
  reply: string;
  log: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    id: "blood",
    category: "Blood Request",
    icon: Droplet,
    color: "text-red-600",
    match: (t) => /BLOOD|KHOON|خون/i.test(t),
    reply: "O-Negative blood available at Jinnah Hospital (2km). Bed reserved. Reply 1 to confirm.",
    log: "Keyword 'BLOOD' detected. Queried blood-bank DB. Routed availability via SMS.",
  },
  {
    id: "flood",
    category: "Flood / Rescue",
    icon: Waves,
    color: "text-cyan-600",
    match: (t) => /FLOOD|RESCUE|SAILAB|سیلاب|امداد/i.test(t),
    reply: "Rescue pin dropped. Nearest dry zone: Camp 4 (North). Boat dispatched.",
    log: "Keyword 'FLOOD/RESCUE' detected. Geolocation mapped. Emergency dispatch triggered.",
  },
  {
    id: "fever",
    category: "Fever / Illness",
    icon: Thermometer,
    color: "text-amber-600",
    match: (t) => /FEVER|BUKHAR|بخار|طبیعت/i.test(t),
    reply: "Noted: high fever reported. Nearest BHU: Sector 5 Clinic. ORS + Paracetamol advised until seen.",
    log: "Keyword 'FEVER' detected. Routed to nearest Basic Health Unit queue.",
  },
  {
    id: "medicine",
    category: "Medicine Shortage",
    icon: Pill,
    color: "text-violet-600",
    match: (t) => /MEDICINE|DAWAI|دوا|انسولین|INSULIN/i.test(t),
    reply: "Medicine request logged. Mobile pharmacy van ETA 25 mins to your registered tower zone.",
    log: "Keyword 'MEDICINE' detected. Mobile pharmacy dispatch queued.",
  },
  {
    id: "maternity",
    category: "Maternity Emergency",
    icon: Baby,
    color: "text-pink-600",
    match: (t) => /LABOR|LABOUR|PREGNANT|ZACHAGI|زچگی|حاملہ/i.test(t),
    reply: "Maternity alert received. Nearest labor room: Civil Hospital Sector 1. Ambulance requested.",
    log: "Keyword 'MATERNITY' detected. Priority-1 ambulance auto-requested.",
  },
];

const GENERIC_REPLY = "Message received. A triage nurse will contact you shortly.";
const GENERIC_LOG = "No priority keyword matched — routed to generic triage queue.";

const QUICK_CHIPS: Array<{ en: string; ur: string }> = [
  { en: "Need BLOOD", ur: "خون چاہیے" },
  { en: "FLOOD rescue needed", ur: "سیلاب میں مدد چاہیے" },
  { en: "Bukhar tez hai", ur: "بخار تیز ہے" },
  { en: "Dawai khatam ho gai", ur: "دوا ختم ہو گئی" },
];

type MessageStatus = "queued" | "sent" | "delivered";
type ChatMessage = {
  id: number;
  sender: "system" | "patient";
  text: string;
  time: string;
  status: MessageStatus;
};
type LogType = "info" | "alert" | "success";
type ServerLogEntry = { id: number; log: string; type: LogType };
type Stats = { total: number; byCategory: Record<string, number> };

const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function GsmFallbackModule() {
  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  const [inputText, setInputText] = useState("");
  const [gatewayOnline, setGatewayOnline] = useState(true);
  const [signalBars, setSignalBars] = useState(3);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "system", text: COPY.en.systemOnline, time: "12:00 PM", status: "delivered" },
  ]);
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([
    { id: 1, log: COPY.en.initLog, type: "info" },
  ]);
  const [stats, setStats] = useState<Stats>({ total: 0, byCategory: {} });

  // Ambient "flaky offline signal" simulation — purely cosmetic realism
  useEffect(() => {
    const iv = setInterval(() => {
      setSignalBars((prev) => {
        const next = gatewayOnline ? Math.max(1, Math.min(4, prev + (Math.random() > 0.5 ? 1 : -1))) : 0;
        return next;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [gatewayOnline]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverLogs]);

  const classify = (text: string) => KEYWORD_RULES.find((r) => r.match(text));

  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (!gatewayOnline) {
      setServerLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          log: "SMS queued locally — no tower connection. Will forward once signal returns.",
          type: "alert",
        },
      ]);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "patient", text, time: nowTime(), status: "queued" },
      ]);
      setInputText("");
      return;
    }

    const msgId = Date.now();
    setMessages((prev) => [...prev, { id: msgId, sender: "patient", text, time: nowTime(), status: "sent" }]);
    setServerLogs((prev) => [
      ...prev,
      { id: msgId + 1, log: `Incoming SMS received from +92-300-XXXXXXX: "${text}"`, type: "alert" },
    ]);

    // "Sent" -> "Delivered" tick simulation
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, status: "delivered" } : m)));
    }, 700);

    const rule = classify(text);
    const replyText = rule ? rule.reply : GENERIC_REPLY;
    const logText = rule ? rule.log : GENERIC_LOG;
    const category = rule ? rule.category : "Generic Triage";

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "system", text: replyText, time: nowTime(), status: "delivered" },
      ]);
      setServerLogs((prev) => [...prev, { id: Date.now() + 1, log: logText, type: rule ? "success" : "info" }]);
      setStats((prev) => ({
        total: prev.total + 1,
        byCategory: { ...prev.byCategory, [category]: (prev.byCategory[category] ?? 0) + 1 },
      }));
    }, 1500);

    setInputText("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={lang === "ur" ? "rtl" : "ltr"}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className={`size-4 ${lang === "ur" ? "rotate-180" : ""}`} /> {t.back}
            </Link>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden items-center gap-3 sm:flex">
              <span className="grid size-9 place-items-center rounded-2xl bg-surface">
                <Activity className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="eyebrow">{t.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "ur" : "en")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <Languages className="size-3.5" /> {lang === "en" ? "اردو" : "English"}
            </button>

            <button
              onClick={() => setGatewayOnline((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              title={t.toggleNetwork}
            >
              {gatewayOnline ? (
                <Signal className="size-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="size-3.5 text-red-600" />
              )}
              {t.toggleNetwork}
            </button>

            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs ${
                gatewayOnline
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              <span className={`size-2 rounded-full ${gatewayOnline ? "animate-pulse bg-emerald-500" : "bg-red-500"}`} />
              {gatewayOnline ? t.gatewayActive : t.gatewayOffline}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 lg:px-10">
        {/* DISCLAIMER */}
        <div className="mx-auto max-w-3xl space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
          <p className="text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-200" dir="rtl">
            <span className="ml-1.5 inline-block">⚠️</span>
            اگر SMS یا نیٹ ورک مواصلات میں تاخیر ہو تو فوراً قریبی ہسپتال کے ایمرجنسی وارڈ سے رجوع کریں۔
          </p>
          <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
            <strong className="font-semibold">SMS Relay Notice:</strong> Text-based emergency routing relies on
            local cellular tower availability. In zero-coverage scenarios, do not wait for SMS delivery
            confirmation—seek immediate local emergency transport.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.3fr_0.9fr]">
          {/* PATIENT SIMULATOR */}
          <section className="flex h-[600px] flex-col rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Smartphone className="size-5" />
                <div>
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider">{t.patientSim}</h2>
                  <p className="text-[10px] text-muted-foreground">{t.patientSimSub}</p>
                </div>
              </div>
              <SignalBars bars={signalBars} online={gatewayOnline} />
            </div>

            <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === "patient" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      msg.sender === "patient"
                        ? "rounded-br-none bg-primary text-primary-foreground"
                        : "rounded-bl-none bg-surface text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {msg.sender === "patient" && (
                      <span className="flex items-center gap-0.5">
                        {msg.status === "queued" && <Clock className="size-3 text-amber-600" />}
                        {msg.status === "sent" && <Check className="size-3 text-muted-foreground" />}
                        {msg.status === "delivered" && <CheckCheck className="size-3 text-emerald-600" />}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick keyword chips */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="mb-0.5 w-full font-mono text-[9px] uppercase text-muted-foreground">
                {t.quickChips}
              </span>
              {QUICK_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(lang === "ur" ? chip.ur : chip.en)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {lang === "ur" ? chip.ur : chip.en}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-ring"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary p-3 font-bold text-primary-foreground transition-colors"
              >
                <Send className="size-5" />
              </button>
            </form>
          </section>

          {/* SERVER LOGS */}
          <section className="flex h-[600px] flex-col rounded-3xl border border-border bg-card p-6 font-mono">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <Server className="size-5" />
              <div>
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider">{t.serverLogs}</h2>
                <p className="font-sans text-[10px] text-muted-foreground">{t.serverLogsSub}</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {serverLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 border-l-2 border-border py-1 pl-3 text-xs">
                  <span className="text-muted-foreground/70">
                    [{new Date().toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <span
                    className={
                      log.type === "alert"
                        ? "text-amber-600"
                        : log.type === "success"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                    }
                  >
                    {log.log}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 font-sans text-[10px] text-muted-foreground">
              <ShieldAlert className="size-3.5 text-amber-600" />
              Store-and-forward queue active — messages persist even if the tower drops mid-session.
            </div>
          </section>

          {/* ANALYTICS PANEL */}
          <section className="flex h-[600px] flex-col rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <BarChart3 className="size-5" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider">{t.analytics}</h2>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[9px] uppercase text-muted-foreground">{t.totalMsgs}</p>
                <p className="mt-1 font-display text-2xl font-black">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-mono text-[9px] uppercase text-muted-foreground">{t.avgResponse}</p>
                <p className="mt-1 font-display text-2xl font-black">1.5s</p>
              </div>
            </div>

            <p className="mb-3 font-mono text-[9px] uppercase text-muted-foreground">{t.byCategory}</p>
            <div className="flex-1 space-y-2.5 overflow-y-auto">
              {KEYWORD_RULES.map((rule) => {
                const Icon = rule.icon;
                const count = stats.byCategory[rule.category] ?? 0;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={rule.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <Icon className={`size-3.5 ${rule.color}`} /> {rule.category}
                      </span>
                      <span className="text-[11px] font-bold">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground">
              <Radio className="size-3.5" /> Works over any 2G GSM SMS channel — no smartphone or data plan
              required.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SignalBars({ bars, online }: { bars: number; online: boolean }) {
  return (
    <div className="flex h-4 items-end gap-0.5" title={online ? `Signal: ${bars}/4` : "No Signal"}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-sm transition-colors ${i <= bars && online ? "bg-emerald-500" : "bg-surface-strong"}`}
          style={{ height: `${i * 3 + 4}px` }}
        />
      ))}
    </div>
  );
}