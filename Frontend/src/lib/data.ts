import { supabase } from "./supabase";

export type Hospital = {
  id: string;
  name?: string | null;
  city?: string | null;
  available_icus?: number | null;
  available_beds?: number | null;
  ventilators?: number | null;
  [key: string]: unknown;
};

export type DashboardActivity = {
  id: string;
  time: string;
  module: string;
  detail: string;
  status: string;
};

export type DashboardStats = {
  openIcuBeds: number | null;
  activeDispatches: number | null;
  pendingBloodRequests: number | null;
  facilities: number | null;
};

export async function fetchHospitals() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .order("available_icus", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Hospital[];
}

export async function fetchDashboardActivity(): Promise<DashboardActivity[]> {
  const activityResult = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (!activityResult.error && activityResult.data) {
    return activityResult.data.map((row) => ({
      id: String(row.id),
      time: formatTime(String(row.created_at ?? new Date().toISOString())),
      module: String(row.module ?? row.event_type ?? "System activity"),
      detail: String(row.detail ?? row.message ?? "Activity recorded in HayatPulse."),
      status: String(row.status ?? "Recorded"),
    }));
  }

  const floodResult = await supabase
    .from("flood_pins")
    .select("id, reporter_name, people_count, severity, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (floodResult.error) throw floodResult.error;

  return (floodResult.data ?? []).map((row) => ({
    id: String(row.id),
    time: formatTime(String(row.created_at ?? new Date().toISOString())),
    module: "Flood rescue pins",
    detail: `${row.people_count ?? 0} people reported${row.reporter_name ? ` by ${row.reporter_name}` : ""}; severity ${row.severity ?? "unknown"}.`,
    status: String(row.status ?? "pending"),
  }));
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [hospitalsResult, dispatchesResult, bloodResult] = await Promise.all([
    supabase.from("hospitals").select("available_icus"),
    supabase
      .from("bhu_visits")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "open"]),
  ]);

  if (hospitalsResult.error) throw hospitalsResult.error;

  return {
    openIcuBeds: (hospitalsResult.data ?? []).reduce(
      (total, row) => total + Number(row.available_icus ?? 0),
      0,
    ),
    activeDispatches: dispatchesResult.error ? null : (dispatchesResult.count ?? 0),
    pendingBloodRequests: bloodResult.error ? null : (bloodResult.count ?? 0),
    facilities: hospitalsResult.data?.length ?? 0,
  };
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
