import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Facebook,
  HeartPulse,
  Instagram,
  Mail,
  Plus,
  ShieldCheck,
  Signal,
  Twitter,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HayatPulse — don't wait for help. route it." },
      {
        name: "description",
        content:
          "Pakistan's unified emergency healthcare mesh: live ICU beds, offline SMS fallback and Urdu voice triage. Sign in to open the 16-module console.",
      },
      { property: "og:title", content: "HayatPulse — don't wait for help. route it." },
      {
        property: "og:description",
        content:
          "Live ICU telemetry, offline GSM fallback and Urdu voice triage for Pakistan. Sign in to open the console.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: Signal,
    title: "Reach",
    body: "Every bed, ventilator and ambulance in the mesh reports live, so nobody phones around during a golden hour.",
  },
  {
    icon: Waves,
    title: "Resilience",
    body: "When data drops, HayatPulse falls back to plain GSM — a text message still routes a patient.",
  },
  {
    icon: ShieldCheck,
    title: "Record",
    body: "CNIC-linked history, allergies and blood type arrive before the patient does, and every dispatch is logged.",
  },
];

const footerLinks = {
  Product: [
    { label: "Why HayatPulse", href: "#why" },
    { label: "Coverage", href: "#coverage" },
    { label: "Inside the console", href: "#inside" },
  ],
  Modules: [
    { label: "ICU & bed mesh", href: "/login" },
    { label: "Offline SMS fallback", href: "/login" },
    { label: "Urdu voice triage", href: "/login" },
    { label: "Snakebite & first aid", href: "/login" },
  ],
  Access: [
    { label: "Login", href: "/login" },
    { label: "Request an account", href: "/login" },
  ],
};

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <HeartPulse className="size-4" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">HayatPulse</span>
          </div>

          <nav className="hidden items-center gap-1 rounded-full bg-surface px-2 py-1.5 text-sm text-muted-foreground lg:flex">
            <a
              href="#why"
              className="rounded-full px-4 py-1.5 transition-colors hover:text-foreground"
            >
              Why HayatPulse
            </a>
            <span className="text-border">•</span>
            <a
              href="#coverage"
              className="rounded-full px-4 py-1.5 transition-colors hover:text-foreground"
            >
              Coverage
            </a>
            <span className="text-border">•</span>
            <a
              href="#inside"
              className="rounded-full px-4 py-1.5 transition-colors hover:text-foreground"
            >
              Inside the console
            </a>
          </nav>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-primary py-2.5 pl-3 pr-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="grid size-6 place-items-center rounded-full bg-primary-foreground/15">
              <ArrowUpRight className="size-3.5" />
            </span>
            Login
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden px-5 pb-20 pt-20 lg:px-10 lg:pb-28 lg:pt-28">
          <div
            aria-hidden
            className="aura pointer-events-none absolute left-1/2 top-24 -z-10 size-[46rem] -translate-x-1/2 rounded-full opacity-80"
          />
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="font-display text-6xl font-bold leading-[0.95] md:text-8xl">
              HayatPulse
            </h1>
            <p className="mt-2 font-display text-4xl leading-[1.05] md:text-7xl">
              <span className="text-ink-soft">don't wait for help.</span>{" "}
              <span className="font-bold">route it.</span>
            </p>
            <p className="mx-auto mt-8 max-w-xl text-muted-foreground">
              One emergency mesh for Pakistan — beds, donors, dispatch and triage, verified in real
              time. The full 16-module console opens after you sign in.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-3 rounded-full bg-primary py-4 pl-4 pr-6 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/15">
                  <HeartPulse className="size-4" />
                </span>
                Login to the console
                <ArrowUpRight className="size-4" />
              </Link>
              <a
                href="#why"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-4 text-base font-semibold transition-colors hover:bg-surface"
              >
                <Plus className="size-4" /> What is HayatPulse?
              </a>
            </div>
          </div>

          <div className="mx-auto mt-24 grid max-w-7xl items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">Reach before rescue</p>
              <p className="mt-4 font-display text-3xl leading-tight md:text-4xl">
                Emergency care is uneven. We make every bed, donor and dispatch checkable in real
                time.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {["Live ICU beds", "Offline SMS", "Urdu voice triage"].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
                >
                  <span className="size-1.5 rounded-full bg-foreground" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* WHY */}
        <section
          id="why"
          className="scroll-mt-24 border-y border-border bg-surface px-5 py-20 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <p className="eyebrow">Why it exists</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold md:text-5xl">
              Three promises we hold, even when the network doesn't.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <article key={p.title} className="rounded-3xl border border-border bg-card p-8">
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-6 font-display text-2xl font-bold">{p.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* COVERAGE */}
        <section id="coverage" className="scroll-mt-24 px-5 py-20 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "16", v: "Connected care modules" },
              { k: "Live", v: "Backend data when connected" },
              { k: "16", v: "Routed care modules" },
              { k: "SMS", v: "Fallback-ready workflow" },
            ].map((s) => (
              <div key={s.v}>
                <p className="font-display text-5xl font-bold">{s.k}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INSIDE THE CONSOLE (teaser only) */}
        <section
          id="inside"
          className="scroll-mt-24 border-t border-border bg-surface px-5 py-20 lg:px-10"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">Behind the login</p>
              <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                Sixteen modules wait on the other side.
              </h2>
              <p className="mt-5 max-w-lg text-muted-foreground">
                ICU bed routing, the CNIC vault, blood matching, PakSign translation, epidemic
                heatmaps and more — grouped into one console for clinicians, dispatchers and
                pharmacies. Access is credentialed; nothing sensitive lives on this page.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-primary py-4 pl-6 pr-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign in to see them
                <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/15">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Console preview</span>
                <span className="rounded-full bg-surface-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  Locked
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-surface p-4"
                    style={{ opacity: 1 - i * 0.07 }}
                  >
                    <div className="size-8 rounded-xl bg-surface-strong" />
                    <div className="mt-4 h-2 w-4/5 rounded-full bg-surface-strong" />
                    <div className="mt-2 h-2 w-2/3 rounded-full bg-surface-strong" />
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Module grid, live counters and session history unlock with your account.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 py-24 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-4xl font-bold md:text-6xl">
              Put the mesh behind your emergency room.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Sign in to route beds, match donors and triage in Urdu — even when the network is
              down.
            </p>
            <Link
              to="/login"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-primary py-4 pl-6 pr-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Login to HayatPulse
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/15">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-5 pb-8 pt-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            {/* BRAND */}
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <HeartPulse className="size-4" />
                </span>
                <span className="font-display text-xl font-bold tracking-tight">HayatPulse</span>
              </div>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                One emergency mesh for Pakistan — beds, donors, dispatch and triage, verified in
                real time, with an offline fallback for when the network isn't.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <a
                  href="mailto:hello@hayatpulse.app"
                  aria-label="Email HayatPulse"
                  className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Mail className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="HayatPulse on Twitter"
                  className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Twitter className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="HayatPulse on Facebook"
                  className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Facebook className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="HayatPulse on Instagram"
                  className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  <Instagram className="size-4" />
                </a>
              </div>
            </div>

            {/* LINK COLUMNS */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <p className="eyebrow">{heading}</p>
                <ul className="mt-5 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* EMERGENCY STRIP */}
          <div className="mt-14 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">In a real emergency</p>
              <p className="mt-2 font-display text-lg font-semibold">
                Call Rescue 1122 or Edhi Foundation 115 — don&apos;t wait on any app.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open the console
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {/* BOTTOM BAR */}
          <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} HayatPulse. Built for Pakistan's emergency mesh.</span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-foreground" />
              v2.6 · 16 active modules
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}