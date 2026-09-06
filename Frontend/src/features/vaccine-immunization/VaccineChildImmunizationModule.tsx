import { useEffect, useState, useMemo } from "react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Bell,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Search,
  Baby,
  Syringe,
  ShieldCheck,
  Clock,
  Sparkles,
  Calendar,
  Phone,
  MapPin,
  RefreshCw,
  UserCheck,
  ChevronRight,
  Filter,
} from "lucide-react";

// Official Pakistan EPI Routine Immunization Schedule definition
const PAKISTAN_EPI_SCHEDULE = [
  { name: "BCG", ageDays: 0, label: "At Birth" },
  { name: "OPV-0", ageDays: 0, label: "At Birth" },
  { name: "Pentavalent-1", ageDays: 42, label: "6 Weeks" },
  { name: "PCV-1", ageDays: 42, label: "6 Weeks" },
  { name: "Rotavirus-1", ageDays: 42, label: "6 Weeks" },
  { name: "OPV-1", ageDays: 42, label: "6 Weeks" },
  { name: "Pentavalent-2", ageDays: 70, label: "10 Weeks" },
  { name: "PCV-2", ageDays: 70, label: "10 Weeks" },
  { name: "Rotavirus-2", ageDays: 70, label: "10 Weeks" },
  { name: "OPV-2", ageDays: 70, label: "10 Weeks" },
  { name: "Pentavalent-3", ageDays: 98, label: "14 Weeks" },
  { name: "PCV-3", ageDays: 98, label: "14 Weeks" },
  { name: "IPV-1", ageDays: 98, label: "14 Weeks" },
  { name: "OPV-3", ageDays: 98, label: "14 Weeks" },
  { name: "Measles-1", ageDays: 270, label: "9 Months" },
  { name: "IPV-2", ageDays: 270, label: "9 Months" },
  { name: "Measles-2", ageDays: 450, label: "15 Months" },
];

const EPI_VACCINE_SUGGESTIONS = Array.from(
  new Set(PAKISTAN_EPI_SCHEDULE.map((s) => s.name))
);

type ImmunizationPatient = {
  id: string;
  child_name: string;
  guardian_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  district: string | null;
  created_at: string | null;
};

type VaccineEvent = {
  id: string;
  patient_id: string;
  vaccine_name: string;
  administered_at: string | null;
  next_due_at: string | null;
  status: string;
  created_at: string | null;
  immunization_patients?: { child_name: string } | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function calculateAge(dobStr: string | null): string {
  if (!dobStr) return "Age unknown";
  const birth = new Date(dobStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return "Not born yet";
  if (diffDays < 30) return `${diffDays} days old`;
  const months = Math.floor(diffDays / 30.4375);
  if (months < 24) return `${months} month${months > 1 ? "s" : ""} old`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years} yr${years > 1 ? "s" : ""}${remMonths > 0 ? ` ${remMonths}m` : ""} old`;
}

export function VaccineChildImmunizationModule() {
  const module = getModule(16)!;
  const [patients, setPatients] = useState<ImmunizationPatient[]>([]);
  const [events, setEvents] = useState<VaccineEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"alerts" | "directory" | "register">("alerts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const [autoScheduleEPI, setAutoScheduleEPI] = useState(true);

  const [form, setForm] = useState({
    child_name: "",
    guardian_name: "",
    phone: "",
    date_of_birth: todayISO(),
    district: "",
  });

  const [eventForm, setEventForm] = useState({
    patient_id: "",
    vaccine_name: "",
    next_due_at: todayISO(),
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingChild, setSavingChild] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [generatingEPI, setGeneratingEPI] = useState<string | null>(null);

  const loadPatients = async () => {
    const { data, error: queryError } = await supabase
      .from("immunization_patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setPatients((data ?? []) as ImmunizationPatient[]);
  };

  const loadEvents = async () => {
    const { data, error: queryError } = await supabase
      .from("vaccine_events")
      .select("*, immunization_patients(child_name)")
      .order("next_due_at", { ascending: true });
    if (queryError) setError(queryError.message);
    else setEvents((data ?? []) as VaccineEvent[]);
  };

  useEffect(() => {
    void loadPatients();
    void loadEvents();
    const channel = supabase
      .channel("hayatpulse-immunization")
      .on("postgres_changes", { event: "*", schema: "public", table: "immunization_patients" }, () => void loadPatients())
      .on("postgres_changes", { event: "*", schema: "public", table: "vaccine_events" }, () => void loadEvents())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const generateEpiScheduleForChild = async (patientId: string, dobStr: string | null) => {
    if (!dobStr) return;
    setGeneratingEPI(patientId);
    const inserts = PAKISTAN_EPI_SCHEDULE.map((item) => ({
      patient_id: patientId,
      vaccine_name: item.name,
      next_due_at: addDaysToDate(dobStr, item.ageDays),
      status: "scheduled",
    }));

    const { error: insertError } = await supabase.from("vaccine_events").insert(inserts);
    if (insertError) {
      setError(`Failed to auto-schedule EPI: ${insertError.message}`);
    } else {
      setMessage("Full Pakistan EPI Routine Schedule automatically generated!");
      await loadEvents();
    }
    setGeneratingEPI(null);
  };

  const saveChild = async () => {
    setError("");
    setMessage("");
    if (!form.child_name.trim()) {
      setError("Child name is required.");
      return;
    }
    setSavingChild(true);

    const { data, error: insertError } = await supabase
      .from("immunization_patients")
      .insert({ ...form, date_of_birth: form.date_of_birth || null })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      const newChild = data as ImmunizationPatient;
      setMessage(`Child '${newChild.child_name}' added to registry.`);
      setForm({ child_name: "", guardian_name: "", phone: "", date_of_birth: todayISO(), district: "" });

      if (autoScheduleEPI && newChild.date_of_birth) {
        await generateEpiScheduleForChild(newChild.id, newChild.date_of_birth);
      }

      await loadPatients();
      setActiveTab("directory");
    }
    setSavingChild(false);
  };

  const saveEvent = async () => {
    setError("");
    setMessage("");
    if (!eventForm.patient_id) {
      setError("Choose which child this vaccine is for.");
      return;
    }
    if (!eventForm.vaccine_name.trim()) {
      setError("Vaccine name is required.");
      return;
    }
    setSavingEvent(true);
    const { error: insertError } = await supabase.from("vaccine_events").insert({
      patient_id: eventForm.patient_id,
      vaccine_name: eventForm.vaccine_name.trim(),
      next_due_at: eventForm.next_due_at || null,
      status: "scheduled",
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Vaccine successfully added to calendar.");
      setEventForm({ patient_id: eventForm.patient_id, vaccine_name: "", next_due_at: todayISO() });
      await loadEvents();
    }
    setSavingEvent(false);
  };

  const markReminderSent = async (eventId: string) => {
    setError("");
    const { error: updateError } = await supabase
      .from("vaccine_events")
      .update({ status: "reminder_sent" })
      .eq("id", eventId);
    if (updateError) setError(updateError.message);
    else await loadEvents();
  };

  const markAdministered = async (eventId: string) => {
    setError("");
    const { error: updateError } = await supabase
      .from("vaccine_events")
      .update({ status: "administered", administered_at: todayISO() })
      .eq("id", eventId);
    if (updateError) setError(updateError.message);
    else await loadEvents();
  };

  const dueSoonCutoff = daysFromToday(7);

  const dueAndOverdue = useMemo(() => {
    return events
      .filter((event) => event.status !== "administered" && event.next_due_at)
      .filter((event) => (event.next_due_at as string) <= dueSoonCutoff)
      .filter((event) => {
        if (selectedChildFilter !== "all" && event.patient_id !== selectedChildFilter) return false;
        return true;
      })
      .sort((a, b) => (a.next_due_at ?? "").localeCompare(b.next_due_at ?? ""));
  }, [events, dueSoonCutoff, selectedChildFilter]);

  const stats = useMemo(() => {
    const totalKids = patients.length;
    const totalVaccines = events.length;
    const administered = events.filter((e) => e.status === "administered").length;
    const overdue = events.filter(
      (e) => e.status !== "administered" && e.next_due_at && e.next_due_at < todayISO()
    ).length;
    const dueSoon = events.filter(
      (e) =>
        e.status !== "administered" &&
        e.next_due_at &&
        e.next_due_at >= todayISO() &&
        e.next_due_at <= dueSoonCutoff
    ).length;
    return { totalKids, totalVaccines, administered, overdue, dueSoon };
  }, [patients, events, dueSoonCutoff]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.child_name.toLowerCase().includes(q) ||
        (p.guardian_name && p.guardian_name.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
    );
  }, [patients, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background text-foreground pb-16">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <ShieldCheck className="size-3.5" />
              Pakistan EPI Digital Registry
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Child Immunization Tracker
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Register newborns, auto-schedule Pakistan EPI routine vaccines, dispatch due alerts, and record administered doses.
            </p>
          </div>

          <button
            onClick={() => setActiveTab("register")}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-all self-start md:self-auto"
          >
            <Plus className="size-4" /> Register New Child
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Metric Cards Banner */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Baby className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Registered Children</p>
              <p className="font-display text-2xl font-bold">{stats.totalKids}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Overdue Doses</p>
              <p className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.overdue}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Due in Next 7 Days</p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.dueSoon}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Syringe className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Administered Doses</p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.administered}</p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "alerts"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="size-4" />
            Urgent Action Queue ({stats.overdue + stats.dueSoon})
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "directory"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Baby className="size-4" />
            Child Directory ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
              activeTab === "register"
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="size-4" />
            Register &amp; Schedule
          </button>
        </div>

        {/* TAB 1: URGENT ACTION QUEUE */}
        {activeTab === "alerts" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-sm">
              <div>
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Bell className="size-4 text-teal-600" />
                  Due &amp; Overdue Vaccination Queue
                </h2>
                <p className="text-xs text-muted-foreground">
                  Vaccines scheduled on or before {dueSoonCutoff} requiring administrative action or SMS reminder flags.
                </p>
              </div>

              {/* Filter by child */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <Filter className="size-3.5 text-muted-foreground" />
                <select
                  value={selectedChildFilter}
                  onChange={(e) => setSelectedChildFilter(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-teal-500"
                >
                  <option value="all">All Children ({patients.length})</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.child_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {dueAndOverdue.map((event) => {
                const isOverdue = (event.next_due_at as string) < todayISO();
                return (
                  <div
                    key={event.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between transition-all ${
                      isOverdue
                        ? "border-rose-300 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20"
                        : "border-amber-300 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isOverdue
                              ? "bg-rose-200 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200"
                              : "bg-amber-200 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200"
                          }`}
                        >
                          {isOverdue ? "OVERDUE" : "DUE SOON"}
                        </span>
                        <p className="font-bold text-sm">
                          {event.immunization_patients?.child_name ?? "Unknown Child"}
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-foreground/90">
                        Vaccine Dose: <span className="text-teal-700 dark:text-teal-300 font-bold">{event.vaccine_name}</span>
                      </p>

                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {isOverdue ? "Was due on" : "Scheduled due date"}: <strong className="text-foreground">{event.next_due_at}</strong>
                        {event.status === "reminder_sent" && (
                          <span className="ml-2 rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                            Reminder Flagged
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                      <button
                        onClick={() => void markReminderSent(event.id)}
                        disabled={event.status === "reminder_sent"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                      >
                        <Bell className="size-3.5 text-amber-600" />
                        {event.status === "reminder_sent" ? "Flagged" : "Flag SMS Reminder"}
                      </button>

                      <button
                        onClick={() => void markAdministered(event.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all"
                      >
                        <CheckCircle2 className="size-3.5" /> Mark Administered
                      </button>
                    </div>
                  </div>
                );
              })}

              {dueAndOverdue.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-2">
                  <ShieldCheck className="mx-auto size-8 text-emerald-500" />
                  <p className="text-sm font-semibold">No pending or overdue vaccinations!</p>
                  <p className="text-xs text-muted-foreground">
                    All registered children in this filter view are up to date for the next 7 days.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: CHILD DIRECTORY */}
        {activeTab === "directory" && (
          <section className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by child name, guardian, district, or phone..."
                className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPatients.map((patient) => {
                const childEvents = events.filter((e) => e.patient_id === patient.id);
                const administeredCount = childEvents.filter((e) => e.status === "administered").length;
                const overdueCount = childEvents.filter(
                  (e) => e.status !== "administered" && e.next_due_at && e.next_due_at < todayISO()
                ).length;

                return (
                  <div
                    key={patient.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-teal-500/50 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base">{patient.child_name}</h3>
                          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                            {calculateAge(patient.date_of_birth)}
                          </p>
                        </div>
                        {overdueCount > 0 ? (
                          <span className="rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 px-2.5 py-0.5 text-[10px] font-bold">
                            {overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                            Up to date
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                        <p className="flex items-center gap-1.5">
                          <UserCheck className="size-3.5 shrink-0 text-slate-400" />
                          Guardian: <span className="text-foreground font-medium">{patient.guardian_name || "—"}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3.5 shrink-0 text-slate-400" />
                          Phone: <span className="text-foreground font-medium">{patient.phone || "—"}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0 text-slate-400" />
                          District: <span className="text-foreground font-medium">{patient.district || "—"}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 shrink-0 text-slate-400" />
                          DOB: <span className="text-foreground font-medium">{patient.date_of_birth || "—"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">EPI Progress:</span>
                        <span className="font-bold text-foreground">
                          {administeredCount} / {childEvents.length} doses
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full transition-all duration-500"
                          style={{
                            width: `${childEvents.length > 0 ? (administeredCount / childEvents.length) * 100 : 0}%`,
                          }}
                        />
                      </div>

                      {childEvents.length === 0 ? (
                        <button
                          onClick={() => void generateEpiScheduleForChild(patient.id, patient.date_of_birth)}
                          disabled={generatingEPI === patient.id || !patient.date_of_birth}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/30 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                        >
                          <Sparkles className="size-3.5" />
                          {generatingEPI === patient.id ? "Generating..." : "Auto-Generate EPI Schedule"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {filteredPatients.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground space-y-2">
                  <Baby className="mx-auto size-8 text-slate-400" />
                  <p className="text-sm font-semibold">No children registered or matching search criteria.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: REGISTER & SCHEDULE FORMS */}
        {activeTab === "register" && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Form 1: Register Child */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Baby className="size-5 text-teal-600" />
                  Register Newborn or Child
                </h2>
                <p className="text-xs text-muted-foreground">
                  Adds child to the live district immunization registry.
                </p>
              </div>

              <div className="space-y-4">
                <Field
                  label="Child Name *"
                  value={form.child_name}
                  onChange={(value) => setForm({ ...form, child_name: value })}
                />
                <Field
                  label="Guardian / Parent Name"
                  value={form.guardian_name}
                  onChange={(value) => setForm({ ...form, guardian_name: value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Phone Number"
                    value={form.phone}
                    onChange={(value) => setForm({ ...form, phone: value })}
                  />
                  <Field
                    label="District"
                    value={form.district}
                    onChange={(value) => setForm({ ...form, district: value })}
                  />
                </div>
                <Field
                  label="Date of Birth *"
                  type="date"
                  value={form.date_of_birth}
                  onChange={(value) => setForm({ ...form, date_of_birth: value })}
                />

                <label className="flex items-center gap-2.5 rounded-xl border border-border bg-background p-3 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={autoScheduleEPI}
                    onChange={(e) => setAutoScheduleEPI(e.target.checked)}
                    className="size-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="font-bold text-foreground">Auto-generate Pakistan EPI Schedule</p>
                    <p className="text-[11px] text-muted-foreground">Creates all 17 routine doses from Birth to 15 Months automatically.</p>
                  </div>
                </label>
              </div>

              <button
                onClick={() => void saveChild()}
                disabled={savingChild}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                <Plus className="size-4" />
                {savingChild ? "Registering..." : "Register Child"}
              </button>
            </section>

            {/* Form 2: Manual Vaccine Schedule */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Syringe className="size-5 text-teal-600" />
                  Schedule Individual Vaccine
                </h2>
                <p className="text-xs text-muted-foreground">
                  Schedule custom doses or catch-up booster shots for registered children.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Select Child *</span>
                  <select
                    value={eventForm.patient_id}
                    onChange={(e) => setEventForm({ ...eventForm, patient_id: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="">Choose registered child...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.child_name} (DOB: {p.date_of_birth || "N/A"})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Vaccine Dose *</span>
                  <input
                    type="text"
                    list="epi-vaccine-suggestions"
                    value={eventForm.vaccine_name}
                    onChange={(e) => setEventForm({ ...eventForm, vaccine_name: e.target.value })}
                    placeholder="Select or type (e.g., Pentavalent-1)"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-teal-500"
                  />
                  <datalist id="epi-vaccine-suggestions">
                    {EPI_VACCINE_SUGGESTIONS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>

                <Field
                  label="Next Due Date *"
                  type="date"
                  value={eventForm.next_due_at}
                  onChange={(value) => setEventForm({ ...eventForm, next_due_at: value })}
                />
              </div>

              <button
                onClick={() => void saveEvent()}
                disabled={savingEvent || patients.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                <CalendarClock className="size-4" />
                {savingEvent ? "Scheduling..." : "Add to Calendar"}
              </button>
            </section>

          </div>
        )}

      </main>
    </div>
  );
}