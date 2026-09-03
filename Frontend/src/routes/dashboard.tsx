import { ArrowUpRight, HeartPulse, LogOut, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  fetchDashboardActivity,
  fetchDashboardStats,
  type DashboardActivity,
  type DashboardStats,
} from "@/lib/data";
import { categories, modules } from "@/lib/modules";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Console — HayatPulse 16 care modules" },
      {
        name: "description",
        content:
          "Signed-in HayatPulse console: launch ICU bed routing, blood matching, Urdu voice triage and more connected care modules.",
      },
      { property: "og:title", content: "Console — HayatPulse 16 care modules" },
      {
        property: "og:description",
        content: "Launch ICU bed routing, blood matching and Urdu voice triage from one console.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { session, user, loading: authLoading, signOut } = useAuth();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const refreshData = async () => {
    setLoadingData(true);
    setDataError("");
    const [statsResult, activityResult] = await Promise.allSettled([
      fetchDashboardStats(),
      fetchDashboardActivity(),
    ]);

    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    if (activityResult.status === "fulfilled") setActivity(activityResult.value);

    const failures = [statsResult, activityResult].filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      const firstFailure = failures[0];
      setDataError(
        firstFailure.status === "rejected"
          ? (firstFailure.reason?.message ?? "Could not load live Supabase data.")
          : "Could not load live Supabase data.",
      );
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/login", replace: true });
  }, [authLoading, navigate, session]);

  useEffect(() => {
    if (!session) return;
    void refreshData();

    const channel = supabase
      .channel("hayatpulse-dashboard-flood-pins")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flood_pins" },
        () => void refreshData(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session]);

  const list = useMemo(
    () =>
      modules
        .filter((module) => active === "All" || module.category === active)
        .filter((module) => module.title.toLowerCase().includes(query.trim().toLowerCase())),
    [active, query],
  );

  if (authLoading || !session || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    const result = await signOut();
    if (result.error) {
      setDataError(result.error.message);
      setSigningOut(false);
      return;
    }
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <HeartPulse className="size-4" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">HayatPulse</span>
          </Link>

          <div className="hidden items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm text-muted-foreground md:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected to Supabase · live data
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}{" "}
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-10">
        <p className="eyebrow">Operations console</p>
        <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
          <span className="text-ink-soft">welcome back.</span> route it.
        </h1>

        {dataError && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
          >
            <span>Live data warning: {dataError}</span>
            <button
              onClick={() => void refreshData()}
              className="font-semibold underline underline-offset-4"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value={stats?.openIcuBeds} label="Open ICU beds" loading={loadingData} />
          <StatCard
            value={stats?.activeDispatches}
            label="Active dispatches"
            loading={loadingData}
          />
          <StatCard
            value={stats?.pendingBloodRequests}
            label="Blood requests pending"
            loading={loadingData}
          />
          <StatCard value={stats?.facilities} label="Connected facilities" loading={loadingData} />
        </div>

        <div className="mt-14 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Your modules</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Sixteen modules, one mesh.
            </h2>
          </div>
          <label className="flex w-full items-center gap-3 rounded-full border border-border bg-card px-5 py-3 md:w-72">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActive(category)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${active === category ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((module) => {
            const Icon = module.icon;
            return (
              <a
                key={module.id}
                href={module.path}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {String(module.id).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {module.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="eyebrow">{module.category}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-0.5">
                    Open <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </a>
            );
          })}
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">No modules match that search.</p>
          )}
        </div>

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Live activity</p>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
                Every dispatch leaves a record.
              </h2>
            </div>
            <button
              onClick={() => void refreshData()}
              disabled={loadingData}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {" "}
              <RefreshCw className={`size-4 ${loadingData ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
            {activity.length === 0 && !loadingData && (
              <p className="p-6 text-sm text-muted-foreground">
                No activity has been recorded in the connected backend yet.
              </p>
            )}
            {activity.map((item, index) => (
              <div
                key={item.id}
                className={`grid gap-2 p-6 md:grid-cols-[11rem_12rem_1fr_7rem] md:items-center ${index ? "border-t border-border" : ""}`}
              >
                <span className="text-xs text-muted-foreground">{item.time}</span>
                <span className="text-sm font-semibold">{item.module}</span>
                <span className="text-sm text-muted-foreground">{item.detail}</span>
                <span className="justify-self-start rounded-full bg-surface-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-wider md:justify-self-end">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  value,
  label,
  loading,
}: {
  value: number | null | undefined;
  label: string;
  loading: boolean;
}) {
  const displayValue = loading
    ? "…"
    : value === null || value === undefined
      ? "—"
      : value.toLocaleString();
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <p className="font-display text-4xl font-bold">{displayValue}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
