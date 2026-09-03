import { ArrowUpRight, HeartPulse, Lock, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login — HayatPulse emergency mesh" },
      {
        name: "description",
        content:
          "Sign in to HayatPulse to route ICU beds, match blood donors and run Urdu voice triage across Pakistan.",
      },
      { property: "og:title", content: "Login — HayatPulse emergency mesh" },
      {
        property: "og:description",
        content: "Sign in to route ICU beds, match donors and run Urdu voice triage.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, navigate, session]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    if (result.error) {
      setErrorMessage(result.error.message);
    } else if (mode === "signin") {
      navigate({ to: "/dashboard", replace: true });
    } else {
      setSuccessMessage(
        "Account created. Check your email if confirmation is required, then sign in.",
      );
      setMode("signin");
      setPassword("");
    }

    setBusy(false);
  };

  const onResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage("Enter your work email first, then request a password reset.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    setSuccessMessage("");
    const result = await resetPassword(email.trim());
    if (result.error) setErrorMessage(result.error.message);
    else
      setSuccessMessage("Password reset instructions have been sent if that email is registered.");
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-surface p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="aura pointer-events-none absolute -left-24 top-1/4 size-[34rem] rounded-full opacity-70"
        />
        <Link to="/" className="relative flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <HeartPulse className="size-4" />
          </span>
          <span className="font-display text-xl font-bold">HayatPulse</span>
        </Link>

        <div className="relative max-w-lg">
          <h1 className="font-display text-5xl font-bold leading-[1.05]">
            <span className="text-ink-soft">don&apos;t wait for help.</span> route it.
          </h1>
          <p className="mt-6 text-muted-foreground">
            One sign-in unlocks live ICU telemetry, the CNIC vault, blood matching and Urdu voice
            triage across the whole mesh.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-3">
          {["Live ICU beds", "Offline SMS", "16 modules"].map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"
            >
              <span className="size-1.5 rounded-full bg-foreground" />
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-16 lg:px-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <HeartPulse className="size-4" />
            </span>
            <span className="font-display text-xl font-bold">HayatPulse</span>
          </Link>

          <p className="eyebrow">Secure access</p>
          <h2 className="mt-3 font-display text-4xl font-bold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Clinician, dispatcher and pharmacy accounts share one console.
          </p>

          <div className="mt-8 inline-flex rounded-full bg-surface p-1 text-sm">
            {(["signin", "signup"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => {
                  setMode(nextMode);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`rounded-full px-5 py-2 font-semibold transition-colors ${mode === nextMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {nextMode === "signin" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Work email</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 focus-within:border-ring">
                <Mail className="size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hospital.pk"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 focus-within:border-ring">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </label>

            {mode === "signin" && (
              <button
                type="button"
                onClick={onResetPassword}
                disabled={busy}
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p
                role="status"
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
              >
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || authLoading}
              className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Login to console" : "Create account"}
                  <ArrowUpRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            Authentication is handled securely by the connected Supabase project. No demo session is
            created in the browser.
          </p>
          <p className="mt-8 text-sm text-muted-foreground">
            <Link
              to="/"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
