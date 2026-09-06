import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Bone,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Droplets,
  Flame,
  Phone,
  Wind,
  Zap,
  Volume2,
  VolumeX,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Search,
  Check,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

/**
 * FirstAidModule.tsx
 * HayatPulse AI — Snakebite & First-Aid Guidance Engine (Module 15)
 *
 * Fully self-contained, no backend or API calls required: offline ready.
 * Includes interactive step checklists, Web Speech TTS, emergency timers,
 * and quick search utilities.
 */

type GuideKey = "snakebite" | "burns" | "choking" | "bleeding" | "fractures" | "seizure";

type Guide = {
  title: string;
  titleUr: string;
  icon: LucideIcon;
  keywords: string[];
  doSteps: string[];
  dontSteps: string[];
};

const GUIDES: Record<GuideKey, Guide> = {
  snakebite: {
    title: "Snakebite",
    titleUr: "سانپ کا کاٹنا",
    icon: Crosshair,
    keywords: ["snake", "bite", "venom", "poison", "sanp", "kaatna"],
    doSteps: [
      "Keep the person calm and as still as possible — movement spreads venom faster.",
      "Remove rings, watches, or tight clothing near the bite before swelling starts.",
      "Keep the bitten limb lower than the heart if possible.",
      "Note the time of the bite and, if safe, the snake's color/pattern (do not chase it).",
      "Get to the nearest hospital or clinic immediately — antivenom is time-critical.",
    ],
    dontSteps: [
      "Do NOT cut the wound or try to suck out venom.",
      "Do NOT apply a tight tourniquet.",
      "Do NOT apply ice or immerse in water.",
      "Do NOT give the person food, alcohol, or caffeine.",
    ],
  },
  burns: {
    title: "Burns",
    titleUr: "جلنا",
    icon: Flame,
    keywords: ["burn", "fire", "heat", "hot", "steam", "jalna"],
    doSteps: [
      "Cool the burn under clean, cool (not ice-cold) running water for 10-20 minutes.",
      "Remove any tight clothing or jewelry near the burn before swelling starts.",
      "Cover loosely with a clean, non-fluffy cloth or sterile dressing.",
      "For large or deep burns, or burns on the face/hands/genitals, go to a hospital immediately.",
    ],
    dontSteps: [
      "Do NOT apply butter, oil, toothpaste, or ice directly to the burn.",
      "Do NOT pop any blisters that form.",
      "Do NOT peel off clothing that is stuck to the skin.",
    ],
  },
  choking: {
    title: "Choking",
    titleUr: "دم گھٹنا",
    icon: Wind,
    keywords: ["choke", "breath", "throat", "heimlich", "dam ghutna"],
    doSteps: [
      'Ask "Are you choking?" — if they can cough or speak, encourage them to keep coughing.',
      "If they cannot breathe, speak, or cough: give 5 sharp back blows between the shoulder blades.",
      "If that doesn't clear it, give 5 abdominal thrusts (Heimlich maneuver) — fist above navel, sharp inward-and-upward pulls.",
      "Alternate 5 back blows and 5 abdominal thrusts until the object is dislodged or help arrives.",
      "If the person becomes unconscious, lower them to the ground and begin CPR, and call for emergency help immediately.",
    ],
    dontSteps: [
      "Do NOT perform abdominal thrusts on infants under 1 year — use back blows and chest thrusts instead.",
      "Do NOT blindly sweep the mouth with your finger unless you can clearly see the object.",
    ],
  },
  bleeding: {
    title: "Severe Bleeding",
    titleUr: "شدید خون بہنا",
    icon: Droplets,
    keywords: ["blood", "bleed", "cut", "wound", "khoon"],
    doSteps: [
      "Apply firm, direct pressure to the wound with a clean cloth or bandage.",
      "Keep pressing continuously — do not lift the cloth to check, add more layers on top if it soaks through.",
      "Raise the injured area above heart level if possible.",
      "Once bleeding is controlled, bandage firmly and get to a hospital.",
      "If bleeding is severe and won't stop, call for emergency transport immediately.",
    ],
    dontSteps: [
      "Do NOT remove any object that is embedded in the wound — stabilize it and seek help instead.",
      "Do NOT apply a tourniquet unless bleeding is life-threatening and you've been trained to.",
    ],
  },
  fractures: {
    title: "Fractures & Sprains",
    titleUr: "ہڈی ٹوٹنا",
    icon: Bone,
    keywords: ["bone", "break", "fracture", "sprain", "leg", "arm", "haddi"],
    doSteps: [
      "Keep the injured area still — avoid moving or straightening it.",
      "Support the area above and below the injury with a splint (rolled cloth, cardboard, or a firm object) if you must move the person.",
      "Apply a cold pack wrapped in cloth to reduce swelling (never directly on skin).",
      "Get the person to a hospital for proper imaging and treatment.",
    ],
    dontSteps: [
      "Do NOT try to push a bone back into place.",
      "Do NOT let the person walk on a suspected broken leg or ankle.",
    ],
  },
  seizure: {
    title: "Seizure",
    titleUr: "مرگی کا دورہ",
    icon: Zap,
    keywords: ["seizure", "fit", "epilepsy", "shaking", "margi"],
    doSteps: [
      "Clear the area around the person of any hard or sharp objects.",
      "Cushion their head with something soft.",
      "Turn them gently onto their side once the shaking stops, to keep the airway clear.",
      "Time the seizure — if it lasts longer than 5 minutes, call for emergency help.",
      "Stay with them until they are fully alert.",
    ],
    dontSteps: [
      "Do NOT hold the person down or restrict their movements.",
      "Do NOT put anything in their mouth.",
    ],
  },
};

export function FirstAidModule() {
  const module = getModule(15)!;
  const [selectedKey, setSelectedKey] = useState<GuideKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interactive Checklist State
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Voice Guidance (TTS) State
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);

  // Emergency Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selected = selectedKey ? GUIDES[selectedKey] : null;
  const SelectedIcon = selected?.icon;

  // Cleanup speech & timer on unmount or view change
  useEffect(() => {
    return () => {
      stopSpeech();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedKey]);

  // Timer Tick Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Speech Helper
  const speakText = (text: string, index?: number) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    if (speakingIndex === index && !isSpeakingAll) {
      setSpeakingIndex(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for emergency clarity
    utterance.onend = () => {
      setSpeakingIndex(null);
      setIsSpeakingAll(false);
    };
    utterance.onerror = () => {
      setSpeakingIndex(null);
      setIsSpeakingAll(false);
    };

    if (index !== undefined) {
      setSpeakingIndex(index);
      setIsSpeakingAll(false);
    } else {
      setIsSpeakingAll(true);
    }

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    setIsSpeakingAll(false);
  };

  const speakAllSteps = () => {
    if (!selected) return;
    if (isSpeakingAll) {
      stopSpeech();
      return;
    }
    const fullText = `${selected.title}. Steps to follow: ${selected.doSteps.join(". ")}. Things NOT to do: ${selected.dontSteps.join(". ")}`;
    speakText(fullText);
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter guides based on search input
  const filteredGuides = (Object.entries(GUIDES) as [GuideKey, Guide][]).filter(
    ([_, guide]) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.titleUr.includes(searchQuery) ||
      guide.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        
        {/* EMERGENCY BANNER WITH DIRECT CALL UTILITY */}
        <div className="flex flex-col gap-4 rounded-3xl border border-destructive/30 bg-destructive/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm leading-relaxed text-destructive">
              <strong className="font-semibold">
                This guidance is not a substitute for professional medical care.
              </strong>{" "}
              If the situation is severe or the person is unconscious, not breathing, or bleeding
              heavily, call emergency services immediately.
            </p>
          </div>
          <a
            href="tel:1122"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-destructive px-5 py-3 text-sm font-bold text-destructive-foreground shadow-md transition-transform active:scale-95 hover:opacity-90"
          >
            <PhoneCall className="size-4 animate-bounce" />
            Call Emergency (1122 / 911)
          </a>
        </div>

        {!selected ? (
          <>
            <div>
              <p className="eyebrow">Offline guidance</p>
              <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                What&apos;s the situation?
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Select the emergency below or search by keywords for immediate step-by-step guidance.
                Works completely offline.
              </p>

              {/* SEARCH UTILITY */}
              <div className="relative mt-6 max-w-md">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search emergency (e.g. blood, fire, poison, sanp)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGuides.map(([key, guide]) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedKey(key);
                      setCompletedSteps({});
                      resetTimer();
                    }}
                    className="group rounded-3xl border border-border bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-ring shadow-sm hover:shadow-md"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold">{guide.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{guide.titleUr}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                      <span>View steps</span>
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
              {filteredGuides.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  No emergency protocols found matching &quot;{searchQuery}&quot;. Please review the options or call medical assistance.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* BACK BUTTON & ACTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => {
                  setSelectedKey(null);
                  stopSpeech();
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Choose a different situation
              </button>

              {/* VOICE GUIDANCE TOP CONTROL */}
              <button
                onClick={speakAllSteps}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                  isSpeakingAll
                    ? "bg-amber-500 text-slate-950 animate-pulse"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {isSpeakingAll ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                {isSpeakingAll ? "Stop Reading Aloud" : "Listen to All Guidance"}
              </button>
            </div>

            {/* TITLE & ICON HEADER */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-surface shadow-sm">
                  {SelectedIcon && <SelectedIcon className="size-6" />}
                </span>
                <div>
                  <h1 className="font-display text-3xl font-bold md:text-4xl">{selected.title}</h1>
                  <p className="text-sm text-muted-foreground">{selected.titleUr}</p>
                </div>
              </div>

              {/* ACTIVE EMERGENCY TIMER UTILITY */}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                <Timer className={`size-5 ${isTimerRunning ? "text-amber-500 animate-spin" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Emergency Stopwatch</p>
                  <p className={`font-mono text-xl font-black ${timerSeconds >= 300 ? "text-destructive" : "text-foreground"}`}>
                    {formatTimer(timerSeconds)}
                  </p>
                </div>
                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                    title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                  >
                    {isTimerRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <button
                    onClick={resetTimer}
                    className="grid size-8 place-items-center rounded-xl bg-surface text-muted-foreground hover:text-foreground active:scale-95"
                    title="Reset Timer"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SEIZURE / SNAKEBITE CRITICAL TIMER ALERT */}
            {timerSeconds >= 300 && (
              <div className="flex items-center gap-3 rounded-2xl border border-destructive bg-destructive/15 p-4 text-xs font-bold text-destructive">
                <AlertTriangle className="size-5 shrink-0" />
                <span>
                  CRITICAL: Event timer has exceeded 5 minutes! If this is a ongoing seizure or unaddressed snakebite, contact emergency services (1122 / 911) immediately!
                </span>
              </div>
            )}

            {/* DO STEPS WITH INTERACTIVE CHECKLIST & AUDIO PER STEP */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <h2 className="font-display text-xl font-bold">What to do, in order</h2>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Tap step to check off
                </span>
              </div>
              <ol className="mt-5 space-y-3">
                {selected.doSteps.map((step, i) => {
                  const isDone = !!completedSteps[i];
                  const isSpeakingThis = speakingIndex === i;

                  return (
                    <li
                      key={i}
                      className={`group flex items-start justify-between gap-3 rounded-2xl p-3 transition-colors ${
                        isDone ? "bg-emerald-500/10 text-muted-foreground line-through" : "hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => toggleStep(i)}>
                        <button
                          type="button"
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                            isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {isDone ? <Check className="size-3.5" /> : i + 1}
                        </button>
                        <span className="pt-0.5 text-sm leading-relaxed select-none">
                          {step}
                        </span>
                      </div>

                      {/* SPEAK STEP BUTTON */}
                      <button
                        onClick={() => speakText(step, i)}
                        className={`grid size-8 shrink-0 place-items-center rounded-xl transition-all ${
                          isSpeakingThis
                            ? "bg-amber-500 text-slate-950 animate-pulse"
                            : "text-muted-foreground hover:bg-surface hover:text-foreground"
                        }`}
                        title="Read this step aloud"
                      >
                        <Volume2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* DON'T STEPS */}
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-destructive/20 pb-4">
                <AlertTriangle className="size-5 text-destructive" />
                <h2 className="font-display text-xl font-bold text-destructive">What NOT to do</h2>
              </div>
              <ul className="mt-5 space-y-2">
                {selected.dontSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-destructive">
                    <span className="shrink-0 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}