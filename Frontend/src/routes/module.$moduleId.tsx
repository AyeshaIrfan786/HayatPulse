import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { getModule } from "@/lib/modules";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GsmFallbackModule } from "@/features/gsm-fallback/GsmFallbackModule";
import { PakSignPortalModule } from "@/features/psl-portal/PakSignPortalModule";
import { VisionDiagnosticsModule } from "@/features/vision-diagnostics/VisionDiagnosticsModule";
import { MaternalMonitorModule } from "@/features/maternal-monitor/MaternalMonitorModule";
import { FloodRescueModule } from "@/features/flood-rescue/FloodRescueModule";
import { VoiceTriageModule } from "@/features/voice-triage/VoiceTriageModule";
import { BloodMatcherModule } from "@/features/blood-matcher/BloodMatcherModule";
import { TeleClinicModule } from "@/features/tele-clinic/TeleClinicModule";
import { BhuDispatcherModule } from "@/features/bhu-dispatcher/BhuDispatcherModule";
import { HospitalMeshModule } from "@/features/icu/HospitalMeshModule";
import { SymptomReportsModule } from "@/features/epidemic-heatmap/SymptomReportsModule";
import { FirstAidModule } from "@/features/first-aid/FirstAidModule";
import { CnicVaultModule } from "@/features/cnic-vault/CnicVaultModule";
import { VaccineChildImmunizationModule } from "@/features/vaccine-immunization/VaccineChildImmunizationModule";
import { PrescriptionSafetyModule } from "@/features/prescription-drugsafety/PrescriptionSafetyModule";
import { MentalHealthModule } from "@/features/mental-health/MentalHealthModule";
import { Field } from "@/components/shared/Field";
import { SelectField } from "@/components/shared/SelectField";
import { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL, type TriageChatMessage } from "@/lib/groq";

export const Route = createFileRoute("/module/$moduleId")({
  ssr: false,
  component: ModuleWorkspace,
});

const backendContracts: Record<number, { table?: string; endpoint?: string; note: string }> = {
  1: {
    table: "hospitals",
    note: "Live ICU beds and facility telemetry will appear when the hospitals table is exposed in this Supabase project.",
  },
  2: {
    endpoint: "SMS gateway / Edge Function",
    note: "The UI is ready for a server-side SMS provider, but no SMS Edge Function is present in the supplied project.",
  },
  3: {
    table: "patients",
    note: "CNIC history requires the patients table with row-level security policies for authenticated operators.",
  },
  4: {
    endpoint: "PSL translation service",
    note: "Camera translation requires a deployed inference endpoint; the old UI did not include a production endpoint.",
  },
  6: {
    endpoint: "Prescription OCR / drug safety API",
    note: "No OCR or drug-safety API contract was present in the old frontend or supplied backend.",
  },
  7: {
    table: "symptom_reports",
    note: "Heatmapping needs a symptom-report event table and a geospatial aggregation endpoint.",
  },
  8: {
    endpoint: "Mental-health assistant",
    note: "A server-side AI function is required so provider credentials are not exposed in the browser.",
  },
  9: {
    endpoint: "Voice triage assistant",
    note: "The old UI called Groq directly from the browser. This needs a server-side proxy before production use.",
  },
  10: {
    table: "blood_donors / blood_requests",
    note: "Donor matching requires both blood tables and authenticated insert/select policies.",
  },
  12: {
    table: "bhu_vans / bhu_visits",
    note: "Fleet dispatch requires both BHU tables and authenticated operator policies.",
  },
  15: {
    note: "This module is available as an offline clinical decision guide below; it does not invent facility or inventory data.",
  },
  16: {
    table: "immunization_patients / vaccine_events",
    note: "Immunization tracking requires patient and vaccine-event tables plus reminder delivery configuration.",
  },
};

function ModuleWorkspace() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { moduleId } = Route.useParams();
  const id = Number(moduleId);
  const module = getModule(id);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, navigate, session]);

  if (loading || !session)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  if (!module)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Module not found.
      </div>
    );

  if (id === 1) return <HospitalMeshModule />;
  if (id === 2) return <GsmFallbackModule />;
  if (id === 3) return <CnicVaultModule />;
  if (id === 4) return <PakSignPortalModule />;
  if (id === 6) return <PrescriptionSafetyModule />;
  if (id === 5) return <VisionDiagnosticsModule />;
  if (id === 7) return <SymptomReportsModule />;
  if (id === 8) return <MentalHealthModule />;
  if (id === 9) return <VoiceTriageModule />;
  if (id === 10) return <BloodMatcherModule />;
  if (id === 12) return <BhuDispatcherModule />;
  if (id === 11) return <TeleClinicModule />;
  if (id === 13) return <FloodRescueModule />;
  if (id === 14) return <MaternalMonitorModule />;
  if (id === 15) return <FirstAidModule />;
  if (id === 16) return <VaccineChildImmunizationModule />;
  return <BackendStatusModule moduleId={id} />;
}

function ModuleHeader({
  title,
  category,
  icon: Icon,
}: {
  title: string;
  category: string;
  icon: LucideIcon;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 lg:px-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to console
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-surface">
            <Icon className="size-4" />
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{title}</p>
            <p className="eyebrow">{category}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function BackendStatusModule({ moduleId }: { moduleId: number }) {
  const module = getModule(moduleId)!;
  const contract = backendContracts[moduleId] ?? {
    note: "No production backend contract was present in the supplied frontend.",
  };
  const Icon = module.icon;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={Icon} />
      <main className="mx-auto max-w-4xl px-5 py-16 lg:px-10">
        <div className="rounded-3xl border border-border bg-card p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface">
            <Icon className="size-5" />
          </span>
          <p className="eyebrow mt-8">Backend contract</p>
          <h1 className="mt-3 font-display text-4xl font-bold">{module.title}</h1>
          <p className="mt-4 text-muted-foreground">{module.desc}</p>
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Waiting for a live service contract
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
              {contract.note}
            </p>
            {contract.table && (
              <p className="mt-3 font-mono text-xs text-amber-800 dark:text-amber-200">
                Expected table: {contract.table}
              </p>
            )}
            {contract.endpoint && (
              <p className="mt-3 font-mono text-xs text-amber-800 dark:text-amber-200">
                Expected endpoint: {contract.endpoint}
              </p>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Return to console <ArrowLeft className="size-4 rotate-180" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
