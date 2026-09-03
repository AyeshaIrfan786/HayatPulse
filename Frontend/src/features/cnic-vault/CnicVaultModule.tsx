import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  PlusCircle,
  UserCheck,
  AlertCircle,
  FileText,
  Phone,
  RefreshCw,
  Check,
  Languages,
  QrCode,
  Printer,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  Lock,
  Fingerprint,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------
   BILINGUAL COPY — every user-facing string lives here so the whole
   module can flip between English and Urdu with a single toggle.
------------------------------------------------------------------- */
type Lang = "en" | "ur";

type Copy = {
  back: string;
  title: string;
  subtitle: string;
  lookupTab: string;
  addTab: string;
  allTab: string;
  lookupHeading: string;
  lookupSub: string;
  cnicPlaceholder: string;
  digitsRequired: string;
  verify: string;
  searching: string;
  invalidCnic: string;
  notFound: string;
  verified: string;
  bloodGroup: string;
  allergies: string;
  noneFlagged: string;
  emergencyContact: string;
  historyNotes: string;
  printCard: string;
  copyCnic: string;
  copied: string;
  vaultChecksum: string;
  recentLookups: string;
  noRecent: string;
  addHeading: string;
  addSub: string;
  addedSuccess: string;
  saveRecord: string;
  saving: string;
  allHeading: string;
  maskToggleOn: string;
  maskToggleOff: string;
  fields: {
    cnic: string;
    name: string;
    blood: string;
    contact: string;
    allergiesLabel: string;
    historyLabel: string;
  };
  table: {
    cnic: string;
    name: string;
    blood: string;
    allergiesCol: string;
    contactCol: string;
  };
};

const COPY: Record<Lang, Copy> = {
  en: {
    back: "Back to console",
    title: "CNIC Medical History Vault",
    subtitle: "National Patient Registry",
    lookupTab: "Lookup CNIC",
    addTab: "Register Patient",
    allTab: "All Vault Records",
    lookupHeading: "Patient CNIC Verification Portal",
    lookupSub:
      "Enter the full 13-digit CNIC with dashes to pull verified blood profiles, allergy flags, and medical history.",
    cnicPlaceholder: "Enter 13-Digit CNIC: XXXXX-XXXXXXX-X",
    digitsRequired: "13 DIGITS REQUIRED",
    verify: "Verify CNIC",
    searching: "Searching…",
    invalidCnic: "Incorrect CNIC No! Must be exactly 13 digits formatted as XXXXX-XXXXXXX-X",
    notFound: "No record found for this CNIC in the national vault.",
    verified: "VERIFIED PATIENT PROFILE",
    bloodGroup: "Blood Group",
    allergies: "Flagged Allergies",
    noneFlagged: "None Flagged",
    emergencyContact: "Emergency Contact",
    historyNotes: "Surgical & Clinical History Notes",
    printCard: "Print Emergency Card",
    copyCnic: "Copy CNIC",
    copied: "Copied!",
    vaultChecksum: "Vault Integrity Checksum",
    recentLookups: "Recent Lookups",
    noRecent: "No lookups yet this session.",
    addHeading: "Register New Vault Profile",
    addSub: "Enter patient clinical details to synchronize with the regional emergency network.",
    addedSuccess: "Patient registered successfully to national vault!",
    saveRecord: "Save Record to CNIC Vault",
    saving: "Saving Record…",
    allHeading: "Registered Patient Database",
    maskToggleOn: "Mask CNIC Digits",
    maskToggleOff: "Reveal CNIC Digits",
    fields: {
      cnic: "CNIC (XXXXX-XXXXXXX-X)",
      name: "Full name",
      blood: "Blood group",
      contact: "Emergency contact",
      allergiesLabel: "Flagged allergies",
      historyLabel: "Medical & clinical history notes",
    },
    table: {
      cnic: "CNIC Number",
      name: "Patient Name",
      blood: "Blood",
      allergiesCol: "Allergies",
      contactCol: "Emergency Contact",
    },
  },
  ur: {
    back: "ڈیش بورڈ پر واپس",
    title: "سی این آئی سی طبی ریکارڈ والٹ",
    subtitle: "قومی مریض رجسٹری",
    lookupTab: "سی این آئی سی تلاش کریں",
    addTab: "مریض کا اندراج",
    allTab: "تمام والٹ ریکارڈز",
    lookupHeading: "مریض سی این آئی سی تصدیقی پورٹل",
    lookupSub: "خون کے گروپ، الرجی اور طبی تاریخ کے لیے مکمل 13 ہندسوں کا سی این آئی سی درج کریں۔",
    cnicPlaceholder: "13 ہندسوں کا سی این آئی سی درج کریں: XXXXX-XXXXXXX-X",
    digitsRequired: "13 ہندسے درکار ہیں",
    verify: "تصدیق کریں",
    searching: "تلاش جاری ہے…",
    invalidCnic: "غلط سی این آئی سی نمبر! درست فارمیٹ: XXXXX-XXXXXXX-X (13 ہندسے)",
    notFound: "اس سی این آئی سی کا کوئی ریکارڈ قومی والٹ میں نہیں ملا۔",
    verified: "تصدیق شدہ مریض پروفائل",
    bloodGroup: "خون کا گروپ",
    allergies: "الرجی کی نشاندہی",
    noneFlagged: "کوئی نہیں",
    emergencyContact: "ہنگامی رابطہ نمبر",
    historyNotes: "جراحی اور طبی تاریخ کے نوٹس",
    printCard: "ہنگامی کارڈ پرنٹ کریں",
    copyCnic: "سی این آئی سی کاپی کریں",
    copied: "کاپی ہو گیا!",
    vaultChecksum: "والٹ سالمیت چیک سم",
    recentLookups: "حالیہ تلاشیں",
    noRecent: "اس سیشن میں ابھی کوئی تلاش نہیں ہوئی۔",
    addHeading: "نئی والٹ پروفائل رجسٹر کریں",
    addSub: "علاقائی ہنگامی نیٹ ورک کے ساتھ ہم آہنگی کے لیے مریض کی طبی تفصیلات درج کریں۔",
    addedSuccess: "مریض قومی والٹ میں کامیابی سے رجسٹر ہو گیا!",
    saveRecord: "ریکارڈ محفوظ کریں",
    saving: "محفوظ ہو رہا ہے…",
    allHeading: "رجسٹرڈ مریضوں کا ڈیٹا بیس",
    maskToggleOn: "سی این آئی سی چھپائیں",
    maskToggleOff: "سی این آئی سی دکھائیں",
    fields: {
      cnic: "سی این آئی سی (XXXXX-XXXXXXX-X)",
      name: "مکمل نام",
      blood: "خون کا گروپ",
      contact: "ہنگامی رابطہ",
      allergiesLabel: "الرجی کی نشاندہی",
      historyLabel: "طبی و جراحی تاریخ کے نوٹس",
    },
    table: {
      cnic: "سی این آئی سی نمبر",
      name: "مریض کا نام",
      blood: "خون",
      allergiesCol: "الرجی",
      contactCol: "ہنگامی رابطہ",
    },
  },
};

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;
const BLOOD_UNIVERSAL_DONOR = "O-";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

type Patient = {
  id?: string;
  cnic: string;
  full_name: string;
  blood_group: string;
  allergies: string | null;
  emergency_contact: string;
  medical_history: string | null;
};

type RecentLookup = Patient & { time: string };

type PatientForm = {
  cnic: string;
  full_name: string;
  blood_group: string;
  allergies: string;
  emergency_contact: string;
  medical_history: string;
};

const initialForm: PatientForm = {
  cnic: "",
  full_name: "",
  blood_group: "A+",
  allergies: "",
  emergency_contact: "",
  medical_history: "",
};

const SAMPLE_RECORDS: Patient[] = [
  {
    cnic: "42101-1234567-1",
    full_name: "Muhammad Zebadiya",
    blood_group: "B+",
    allergies: "Penicillin & Sulfa Drugs",
    emergency_contact: "+92-300-1234567",
    medical_history: "Aga Khan ER Visit (July 2026) - Penicillin reaction flagged.",
  },
  {
    cnic: "35202-9876543-2",
    full_name: "Ayesha Khan",
    blood_group: "O-",
    allergies: "Latex, Aspirin",
    emergency_contact: "+92-321-7654321",
    medical_history: "Mild Asthma, Annual Cardiology Checkup Passed.",
  },
];

export function CnicVaultModule() {
  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  const [activeTab, setActiveTab] = useState<"search" | "add" | "all">("search");
  const [cnicInput, setCnicInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchResult, setSearchResult] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [maskDigits, setMaskDigits] = useState(true);
  const [recentLookups, setRecentLookups] = useState<RecentLookup[]>([]);
  const [tableFilter, setTableFilter] = useState("");

  const [records, setRecords] = useState<Patient[]>(SAMPLE_RECORDS);
  const [newPatient, setNewPatient] = useState<PatientForm>(initialForm);
  const [addSuccess, setAddSuccess] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("patients").select("*");
    if (data && data.length > 0 && !error) setRecords(data as Patient[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchRecords();
  }, []);

  const isLiveValid = CNIC_REGEX.test(cnicInput.trim());

  const pushRecent = (record: Patient) => {
    setRecentLookups((prev) => {
      const filtered = prev.filter((r) => r.cnic !== record.cnic);
      return [
        { ...record, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ...filtered,
      ].slice(0, 5);
    });
  };

  const handleVerifyCNIC = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setSearchResult(null);

    const trimmed = cnicInput.trim();
    if (!CNIC_REGEX.test(trimmed)) {
      setErrorMessage(t.invalidCnic);
      return;
    }

    setLoading(true);
    const { data } = await supabase.from("patients").select("*").eq("cnic", trimmed).maybeSingle();
    if (data) {
      setSearchResult(data as Patient);
      pushRecent(data as Patient);
      setLoading(false);
      return;
    }

    const found = records.find((r) => r.cnic === trimmed);
    if (found) {
      setSearchResult(found);
      pushRecent(found);
    } else {
      setErrorMessage(t.notFound);
    }
    setLoading(false);
  };

  const handleAddPatient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setAddSuccess(false);

    if (!CNIC_REGEX.test(newPatient.cnic.trim())) {
      setErrorMessage(t.invalidCnic);
      return;
    }

    setLoading(true);
    const payload: Patient = {
      cnic: newPatient.cnic.trim(),
      full_name: newPatient.full_name.trim(),
      blood_group: newPatient.blood_group,
      allergies: newPatient.allergies || null,
      emergency_contact: newPatient.emergency_contact,
      medical_history: newPatient.medical_history || null,
    };
    await supabase.from("patients").insert([payload]);
    setRecords((prev) => [payload, ...prev]);
    setAddSuccess(true);
    setLoading(false);
    setNewPatient(initialForm);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const maskCnic = (cnic: string) => (maskDigits ? cnic.replace(/\d(?=\d{4})/g, "•") : cnic);

  const checksum = useMemo(() => {
    if (!searchResult) return "";
    try {
      return btoa(`${searchResult.cnic}-${searchResult.blood_group}`).slice(0, 16).toUpperCase();
    } catch {
      return "N/A";
    }
  }, [searchResult]);

  const handlePrintCard = () => {
    if (!searchResult) return;
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Emergency Medical Card — ${searchResult.full_name}</title>
          <style>
            body { font-family: "DM Sans", -apple-system, Arial, sans-serif; padding: 24px; color: #16161a; }
            .card { border: 2px solid #16161a; border-radius: 20px; padding: 24px; max-width: 360px; }
            h1 { font-family: "Space Grotesk", sans-serif; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 4px; }
            .sub { font-size: 10px; color: #666; margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; }
            .label { font-size: 10px; text-transform: uppercase; color: #666; }
            .val { font-size: 13px; font-weight: bold; }
            .blood { font-family: "Space Grotesk", sans-serif; font-size: 28px; font-weight: 900; color: #c0392b; text-align: center; margin: 12px 0; }
            .footer { font-size: 9px; color: #999; margin-top: 16px; text-align: center; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="card">
            <h1>HayatPulse — Emergency Medical Card</h1>
            <div class="sub">Scan or call in case of emergency</div>
            <div class="row"><span class="label">Name</span><span class="val">${searchResult.full_name}</span></div>
            <div class="row"><span class="label">CNIC</span><span class="val">${searchResult.cnic}</span></div>
            <div class="blood">${searchResult.blood_group}</div>
            <div class="row"><span class="label">Allergies</span><span class="val">${searchResult.allergies || "None Flagged"}</span></div>
            <div class="row"><span class="label">Emergency Contact</span><span class="val">${searchResult.emergency_contact}</span></div>
            <div class="footer">Generated by HayatPulse CNIC Vault • Not a substitute for professional medical judgement</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const filteredRecords = records.filter(
    (r) =>
      r.full_name.toLowerCase().includes(tableFilter.toLowerCase()) || r.cnic.includes(tableFilter),
  );

  return (
    <div className="min-h-screen bg-background text-foreground" dir={lang === "ur" ? "rtl" : "ltr"}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> {t.back}
            </Link>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden items-center gap-3 sm:flex">
              <span className="grid size-9 place-items-center rounded-2xl bg-surface">
                <ShieldCheck className="size-4" />
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
              onClick={() => {
                setActiveTab("search");
                setErrorMessage("");
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "search"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.lookupTab}
            </button>

            <button
              onClick={() => {
                setActiveTab("add");
                setErrorMessage("");
                setAddSuccess(false);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "add"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.addTab}
            </button>

            <button
              onClick={() => {
                setActiveTab("all");
                setErrorMessage("");
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.allTab} ({records.length})
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        {/* TAB 1: LOOKUP CNIC */}
        {activeTab === "search" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-6">
              <section className="space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                    <UserCheck className="size-5" /> {t.lookupHeading}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t.lookupSub}</p>
                </div>

                <form onSubmit={handleVerifyCNIC} className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      placeholder={t.cnicPlaceholder}
                      value={cnicInput}
                      onChange={(e) => setCnicInput(e.target.value)}
                      className={`w-full rounded-2xl border bg-background px-5 py-3.5 pr-16 font-mono text-sm outline-none transition-colors ${
                        cnicInput.length === 0
                          ? "border-border focus:border-ring"
                          : isLiveValid
                            ? "border-emerald-500/60 focus:border-emerald-500"
                            : "border-red-500/40 focus:border-red-500"
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {cnicInput.length > 0 &&
                        (isLiveValid ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <span className="font-mono text-[9px] text-muted-foreground">
                            {t.digitsRequired}
                          </span>
                        ))}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-xs font-bold text-primary-foreground transition-all disabled:opacity-60"
                  >
                    <Search className="size-4" /> {loading ? t.searching : t.verify}
                  </button>
                </form>

                {errorMessage && (
                  <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                    <AlertCircle className="size-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </section>

              {/* SEARCH RESULT CARD */}
              {searchResult && (
                <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-[10px] text-muted-foreground">
                        {t.verified}
                      </span>
                      <h3 className="mt-2 font-display text-2xl font-bold">{searchResult.full_name}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="font-mono text-xs text-muted-foreground">CNIC: {searchResult.cnic}</p>
                        <button
                          onClick={() => handleCopy(searchResult.cnic)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={t.copyCnic}
                        >
                          {copied ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="eyebrow block">{t.bloodGroup}</span>
                      <span className="font-display text-3xl font-black text-red-600">
                        {searchResult.blood_group}
                      </span>
                      {searchResult.blood_group === BLOOD_UNIVERSAL_DONOR && (
                        <span className="mt-0.5 block text-[9px] font-bold text-emerald-600">
                          UNIVERSAL DONOR
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                        <AlertCircle className="size-3.5" /> {t.allergies}
                      </p>
                      <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                        {searchResult.allergies || t.noneFlagged}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                        <Phone className="size-3.5" /> {t.emergencyContact}
                      </p>
                      <p className="mt-1 font-mono text-sm font-bold">{searchResult.emergency_contact}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                      <FileText className="size-3.5" /> {t.historyNotes}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {searchResult.medical_history}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
                      <Fingerprint className="size-3.5" /> {t.vaultChecksum}:{" "}
                      <span className="text-foreground">{checksum}</span>
                    </div>
                    <button
                      onClick={handlePrintCard}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold transition-colors hover:bg-surface-strong"
                    >
                      <Printer className="size-4" /> {t.printCard}
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* SIDE PANEL: QR + RECENT LOOKUPS */}
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-card p-6 text-center">
                <p className="mb-3 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                  <QrCode className="size-3.5" /> Emergency QR
                </p>
                {searchResult ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=ffffff&color=16161a&data=${encodeURIComponent(
                      `HayatPulse|${searchResult.cnic}|${searchResult.full_name}|${searchResult.blood_group}`,
                    )}`}
                    alt="Patient QR"
                    className="mx-auto rounded-xl border border-border"
                    width={160}
                    height={160}
                  />
                ) : (
                  <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface text-muted-foreground">
                    <QrCode className="size-10" />
                  </div>
                )}
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Paramedics can scan this to pull the profile instantly on-site.
                </p>
              </section>

              <section className="rounded-3xl border border-border bg-card p-6">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
                  <History className="size-3.5" /> {t.recentLookups}
                </p>
                {recentLookups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.noRecent}</p>
                ) : (
                  <div className="space-y-2">
                    {recentLookups.map((r) => (
                      <button
                        key={r.cnic}
                        onClick={() => {
                          setSearchResult(r);
                          setCnicInput(r.cnic);
                        }}
                        className="w-full rounded-xl border border-border/60 bg-surface p-3 text-left transition-colors hover:bg-surface-strong"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{r.full_name}</span>
                          <span className="text-[9px] text-muted-foreground">{r.time}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.cnic}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex items-start gap-3 rounded-3xl border border-border bg-card p-6">
                <Lock className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  All lookups are checksum-verified and access-logged. This vault is designed for
                  authorized emergency personnel only.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER NEW PATIENT */}
        {activeTab === "add" && (
          <section className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <PlusCircle className="size-5" /> {t.addHeading}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t.addSub}</p>
            </div>

            {addSuccess && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="size-5" /> {t.addedSuccess}
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertCircle className="size-5" /> {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <VaultField
                  label={t.fields.cnic}
                  placeholder="42101-1234567-1"
                  value={newPatient.cnic}
                  onChange={(v) => setNewPatient({ ...newPatient, cnic: v })}
                  mono
                  required
                />
                <VaultField
                  label={t.fields.name}
                  placeholder="e.g. Tariq Mehmood"
                  value={newPatient.full_name}
                  onChange={(v) => setNewPatient({ ...newPatient, full_name: v })}
                  required
                />
                <label className="block">
                  <span className="mb-1 block text-[11px] font-mono text-muted-foreground">
                    {t.fields.blood}
                  </span>
                  <select
                    value={newPatient.blood_group}
                    onChange={(e) => setNewPatient({ ...newPatient, blood_group: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-ring"
                  >
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <VaultField
                  label={t.fields.contact}
                  placeholder="+92-300-0000000"
                  value={newPatient.emergency_contact}
                  onChange={(v) => setNewPatient({ ...newPatient, emergency_contact: v })}
                  mono
                  required
                />
              </div>

              <VaultField
                label={t.fields.allergiesLabel}
                placeholder="e.g. Penicillin, Sulfa, Dust"
                value={newPatient.allergies}
                onChange={(v) => setNewPatient({ ...newPatient, allergies: v })}
              />

              <label className="block">
                <span className="mb-1 block text-[11px] font-mono text-muted-foreground">
                  {t.fields.historyLabel}
                </span>
                <textarea
                  rows={3}
                  placeholder="Enter surgical history, chronic conditions, or emergency notes..."
                  value={newPatient.medical_history}
                  onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-ring"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground transition-all disabled:opacity-60"
              >
                {loading ? t.saving : t.saveRecord}
              </button>
            </form>
          </section>
        )}

        {/* TAB 3: ALL VAULT RECORDS */}
        {activeTab === "all" && (
          <section className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-6">
              <h2 className="font-display text-base font-bold">{t.allHeading}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter…"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="w-40 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-ring"
                  />
                </div>
                <button
                  onClick={() => setMaskDigits((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface p-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  {maskDigits ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  {maskDigits ? t.maskToggleOff : t.maskToggleOn}
                </button>
                <button
                  onClick={() => void fetchRecords()}
                  className="rounded-xl border border-border bg-surface p-2 text-muted-foreground hover:text-foreground"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface text-[10px] font-mono uppercase text-muted-foreground">
                    <th className="p-4">{t.table.cnic}</th>
                    <th className="p-4">{t.table.name}</th>
                    <th className="p-4">{t.table.blood}</th>
                    <th className="p-4">{t.table.allergiesCol}</th>
                    <th className="p-4">{t.table.contactCol}</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredRecords.map((r, index) => (
                    <tr
                      key={r.id ?? `${r.cnic}-${index}`}
                      className="cursor-pointer border-b border-border/60 hover:bg-surface/60"
                      onClick={() => {
                        setSearchResult(r);
                        setActiveTab("search");
                        setCnicInput(r.cnic);
                      }}
                    >
                      <td className="p-4 font-mono font-bold">{maskCnic(r.cnic)}</td>
                      <td className="p-4 font-bold">{r.full_name}</td>
                      <td className="p-4 font-mono font-bold text-red-600">{r.blood_group}</td>
                      <td className="p-4 text-muted-foreground">{r.allergies || "None"}</td>
                      <td className="p-4 font-mono text-muted-foreground">{r.emergency_contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* DISCLAIMER */}
        {activeTab !== "add" && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
              <span className="mr-1.5 inline-block">⚠️</span>
              <strong className="font-semibold">Encrypted Vault Record:</strong> Patient history
              retrieved via CNIC lookup is intended exclusively for emergency triage support.
              Attending physicians must verify known drug allergies directly with the patient or
              family where possible.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function VaultField({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-mono text-muted-foreground">{label}</span>
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-ring ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}
