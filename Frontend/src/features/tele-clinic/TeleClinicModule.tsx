import { useEffect, useRef, useState } from "react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

const ROOM_ADJECTIVES = ["sehat", "shifa", "hayat", "amal", "nusrat", "rahat"];
const ROOM_WORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateRoomCode() {
  const adjective = ROOM_ADJECTIVES[Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += ROOM_WORD_CHARS[Math.floor(Math.random() * ROOM_WORD_CHARS.length)];
  }
  return `${adjective}-${suffix}`;
}

function normalizeRoomCode(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

function isValidRoomCode(input: string) {
  const normalized = normalizeRoomCode(input);
  return normalized.length >= 3 && normalized.length <= 50 && /^[a-z0-9-]+$/.test(normalized);
}

function buildJitsiRoomName(code: string) {
  return `HayatPulseTeleclinic-${normalizeRoomCode(code)}`;
}

const JITSI_SCRIPT_SRC = "https://meet.jit.si/external_api.js";

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi script.")));
      return;
    }
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi script."));
    document.body.appendChild(script);
  });
}

export function TeleClinicModule() {
  const module = getModule(11)!;
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "in-call">("idle");
  const [audioOnly, setAudioOnly] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any | null>(null);

  const startCall = async (code: string) => {
    setError("");
    if (!isValidRoomCode(code)) {
      setError("Enter a valid room code (letters, numbers, and dashes, 3-50 characters).");
      return;
    }
    setStatus("loading");
    try {
      await loadJitsiScript();
      const JitsiMeetExternalAPI = (window as unknown as { JitsiMeetExternalAPI: any })
        .JitsiMeetExternalAPI;
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      const api = new JitsiMeetExternalAPI("meet.jit.si", {
        roomName: buildJitsiRoomName(code),
        parentNode: containerRef.current ?? undefined,
        width: "100%",
        height: "100%",
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: audioOnly },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
      apiRef.current = api;
      setStatus("in-call");
    } catch {
      setError("Could not start the video call. Check your internet connection and try again.");
      setStatus("idle");
    }
  };

  const endCall = () => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    setStatus("idle");
    setRoomCode("");
    setJoinCode("");
  };

  const toggleAudioOnly = () => {
    const next = !audioOnly;
    setAudioOnly(next);
    if (apiRef.current) {
      apiRef.current.executeCommand("toggleVideo");
    }
  };

  useEffect(() => {
    return () => {
      if (apiRef.current) apiRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live video module — no server required</p>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Connect a rural unit to a specialist.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Uses Jitsi Meet&apos;s free public server, loaded directly from their CDN. No account,
            API key, or backend service is required for this call to work.
          </p>
        </div>

        {status !== "in-call" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-bold">Create consultation room</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Generates a short room code you can read aloud over a phone call.
              </p>
              <button
                onClick={() => {
                  const code = generateRoomCode();
                  setRoomCode(code);
                  void startCall(code);
                }}
                disabled={status === "loading"}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {status === "loading" ? "Connecting…" : "Create consultation room"}
              </button>
              {roomCode && (
                <p className="mt-4 font-mono text-sm text-muted-foreground">
                  Room code: <span className="font-semibold text-foreground">{roomCode}</span>
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-bold">Join a room</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the code shared with you by the other party.
              </p>
              <div className="mt-6 flex gap-3">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="sehat-x7k2m"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-ring"
                />
                <button
                  onClick={() => void startCall(joinCode)}
                  disabled={status === "loading"}
                  className="shrink-0 rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  Join room
                </button>
              </div>
            </section>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {status === "in-call" && (
          <section className="rounded-3xl border border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Room: <span className="font-mono">{roomCode || joinCode}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={toggleAudioOnly}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold"
                >
                  {audioOnly ? "Turn video on" : "Audio only"}
                </button>
                <button
                  onClick={endCall}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  End call
                </button>
              </div>
            </div>
            <div
              ref={(node) => {
                containerRef.current = node;
              }}
              className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
            />
          </section>
        )}

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          Uses the free public Jitsi server — fine for pilot use, but a private/self-hosted Jitsi
          deployment is recommended before handling real patient consultations at scale.
        </div>
      </main>
    </div>
  );
}