import { useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

/**
 * FirstAidModule.tsx
 * HayatPulse AI — Snakebite & First-Aid Guidance Engine (Module 15)
 *
 * Fully self-contained, no backend or API calls required: the guidance
 * content below IS the module. A user picks a situation, gets clear
 * step-by-step instructions immediately, works fully offline.
 *
 * Styled with the shared design system (bg-background / bg-card /
 * border-border / bg-primary / eyebrow / font-display) so it matches
 * Module 1 (ICU mesh) and Module 2 (GSM fallback).
 */

type GuideKey = "snakebite" | "burns" | "choking" | "bleeding" | "fractures" | "seizure";

type Guide = {
  title: string;
  titleUr: string;
  icon: LucideIcon;
  doSteps: string[];
  dontSteps: string[];
};

const GUIDES: Record<GuideKey, Guide> = {
  snakebite: {
    title: "Snakebite",
    titleUr: "سانپ کا کاٹنا",
    icon: Crosshair,
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

  const selected = selectedKey ? GUIDES[selectedKey] : null;
  const SelectedIcon = selected?.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 lg:px-10">
        {/* EMERGENCY BANNER */}
        <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4">
          <Phone className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm leading-relaxed text-destructive">
            <strong className="font-semibold">
              This guidance is not a substitute for professional medical care.
            </strong>{" "}
            If the situation is severe or the person is unconscious, not breathing, or bleeding
            heavily, call emergency services or get to the nearest hospital immediately while
            giving first aid.
          </p>
        </div>

        {!selected ? (
          <>
            <div>
              <p className="eyebrow">Offline guidance</p>
              <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                What&apos;s the situation?
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Select the emergency below for immediate step-by-step guidance. Nothing here
                requires a network connection.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(GUIDES) as [GuideKey, Guide][]).map(([key, guide]) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className="group rounded-3xl border border-border bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-ring"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold">{guide.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{guide.titleUr}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold">
                      <span>View steps</span>
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <button
              onClick={() => setSelectedKey(null)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Choose a different situation
            </button>

            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-surface">
                {SelectedIcon && <SelectedIcon className="size-6" />}
              </span>
              <div>
                <h1 className="font-display text-3xl font-bold md:text-4xl">{selected.title}</h1>
                <p className="text-sm text-muted-foreground">{selected.titleUr}</p>
              </div>
            </div>

            {/* DO STEPS */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <CheckCircle2 className="size-5" />
                <h2 className="font-display text-xl font-bold">What to do, in order</h2>
              </div>
              <ol className="mt-5 space-y-3">
                {selected.doSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* DON'T STEPS */}
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6">
              <div className="flex items-center gap-2 border-b border-destructive/20 pb-4">
                <AlertTriangle className="size-5 text-destructive" />
                <h2 className="font-display text-xl font-bold">What NOT to do</h2>
              </div>
              <ul className="mt-5 space-y-2">
                {selected.dontSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-destructive">
                    <span className="shrink-0">•</span>
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