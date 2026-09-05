import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw, PanelLeftClose, PanelLeftOpen, Map, Activity, Truck, Users, Search, Bell,
  Phone, Stethoscope, AlertTriangle, CheckCircle, Clock,
  Languages, Download, SlidersHorizontal, TrendingUp, Gauge
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Metric } from "@/components/shared/Metric";

/* ------------------------------------------------------------------
   BILINGUAL COPY
------------------------------------------------------------------- */
const COPY = {
  en: {
    back: 'Back to Ecosystem',
    moduleControls: 'Module Controls',
    tabs: { map: 'Regional Map', telemetry: 'Telemetry Stream', fleet: 'Active Fleet', roster: 'Staff Duty Roster' },
    headerTitle: 'Live Cloud Mesh',
    searchPlaceholder: 'Search facilities…',
    alerts: 'System Alerts',
    noAlerts: 'No new notifications',
    latency: 'System Latency',
    availableIcus: 'Available ICUs',
    activeUnits: 'Active Units',
    exportCsv: 'Export Report (CSV)',
    filterAll: 'All Status',
    filterOptimal: 'Optimal',
    filterLimited: 'Limited',
    filterCritical: 'Critical',
    sortByCapacity: 'Sort by Open ICUs',
    icuOpen: 'Open ICUs',
    totalBeds: 'Total Beds',
    capacity: 'ICU Occupancy',
    dispatch: 'Initiate Dispatch',
    deviceId: 'Device ID', location: 'Location', o2: 'Patient O2', bp: 'Blood Pressure', status: 'Status',
    driver: 'Driver', destination: 'Destination', eta: 'ETA',
    onDuty: 'On Duty', nextShift: 'Next Shift',
    auditLog: 'Live Audit Log',
    secure: 'System Secure • SSL Encrypted',
  },
  ur: {
    back: 'ایکو سسٹم پر واپس',
    moduleControls: 'ماڈیول کنٹرولز',
    tabs: { map: 'علاقائی نقشہ', telemetry: 'ٹیلی میٹری سٹریم', fleet: 'فعال بیڑہ', roster: 'عملے کا شیڈول' },
    headerTitle: 'ماڈیول 01: لائیو کلاؤڈ میش',
    searchPlaceholder: 'اسپتال تلاش کریں…',
    alerts: 'سسٹم الرٹس',
    noAlerts: 'کوئی نئی اطلاع نہیں',
    latency: 'سسٹم تاخیر',
    availableIcus: 'دستیاب آئی سی یو',
    activeUnits: 'فعال یونٹس',
    exportCsv: 'رپورٹ ڈاؤن لوڈ کریں (CSV)',
    filterAll: 'تمام حالت',
    filterOptimal: 'بہترین',
    filterLimited: 'محدود',
    filterCritical: 'نازک',
    sortByCapacity: 'کھلے آئی سی یو کے مطابق ترتیب دیں',
    icuOpen: 'کھلے آئی سی یو',
    totalBeds: 'کل بستر',
    capacity: 'آئی سی یو اشغال',
    dispatch: 'ڈسپیچ شروع کریں',
    deviceId: 'ڈیوائس آئی ڈی', location: 'مقام', o2: 'مریض آکسیجن', bp: 'بلڈ پریشر', status: 'حالت',
    driver: 'ڈرائیور', destination: 'منزل', eta: 'متوقع وقت',
    onDuty: 'ڈیوٹی پر', nextShift: 'اگلی شفٹ',
    auditLog: 'براہ راست آڈٹ لاگ',
    secure: 'محفوظ سسٹم • SSL خفیہ کاری',
  },
} as const;

type Lang = keyof typeof COPY;

export function HospitalMeshModule() {
  // Modal State for Dispatch Confirmation
const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

const handleOpenDispatch = (hospital: any) => {
  setSelectedHospital(hospital);
  setIsDispatchModalOpen(true);
};

const handleConfirmDispatch = () => {
  if (selectedHospital) {
    // Logic to decrease available ICU count dynamically if state-managed
    if (selectedHospital.available_icus > 0) {
      selectedHospital.available_icus -= 1;
    }
  }
  setIsDispatchModalOpen(false);
  setSelectedHospital(null);
};
  const module = getModule(1)!;
  const [lang, setLang] = useState<Lang>('en');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const t = COPY[lang];

  // --- SUPABASE STATE ---
  const [hospitals, setHospitals] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('Regional Map');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortByOpen, setSortByOpen] = useState(false);

  // --- MOCK DATA FOR OTHER TABS ---
  const notifications = [
    { id: 1, title: 'Ventilator Shortage', desc: 'JPMC is currently at 0 open ICUs.', time: '2m ago', type: 'urgent' },
    { id: 2, title: 'Fleet Update', desc: 'Unit BLS-74 arrived at Civil Hospital.', time: '10m ago', type: 'info' },
  ];
  const telemetryData = [
    { id: 'V-104', location: 'Civil Hospital - Ward 3', status: 'Online', patientO2: '98%', bp: '120/80', uptime: '99.9%' },
    { id: 'V-105', location: 'Civil Hospital - Ward 3', status: 'Offline', patientO2: '--', bp: '--', uptime: '0.0%' },
    { id: 'V-201', location: 'Aga Khan - Trauma', status: 'Online', patientO2: '94%', bp: '135/85', uptime: '99.9%' },
  ];
  const activeFleet = [
    { id: 'BLS-74', type: 'Basic Life Support', driver: 'Ahmed Ali', destination: 'Civil Hospital', eta: '4 mins', status: 'En Route' },
    { id: 'ALS-12', type: 'Advanced Life Support', driver: 'Tariq Mehmood', destination: 'JPMC', eta: '12 mins', status: 'En Route' },
    { id: 'M-04', type: 'Mobile Clinic Van', driver: 'Kamran Khan', destination: 'Malir Cantt', eta: '--', status: 'Stationary' },
  ];
  const staffRoster = [
    { name: 'Dr. Sarah Tariq', role: 'Chief of Trauma', shift: '08:00 AM - 08:00 PM', hospital: 'Aga Khan', status: 'On Duty' },
    { name: 'Dr. Faisal Rehman', role: 'ER Surgeon', shift: '08:00 AM - 08:00 PM', hospital: 'Civil Hospital', status: 'On Duty' },
    { name: 'Nurse Amina', role: 'ICU Head Nurse', shift: '08:00 PM - 08:00 AM', hospital: 'JPMC', status: 'Next Shift' },
  ];

  // --- DATA LOADING ---
  const load = async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("hospitals")
      .select("*")
      .order("available_icus", { ascending: false });
    
    if (queryError) {
      setError(queryError.message);
    }
    
    // Fallback to sample hospital data if Supabase table is empty
    if (data && data.length > 0) {
      setHospitals(data as Array<Record<string, unknown>>);
    } else {
      setHospitals([
        { id: 1, name: "Civil Hospital Emergency Unit", city: "Karachi", available_icus: 12, ventilators: 5, available_beds: 150, phone: "+92-21-99215740" },
        { id: 2, name: "Aga Khan University Hospital", city: "Karachi", available_icus: 4, ventilators: 8, available_beds: 200, phone: "+92-21-34930051" },
        { id: 3, name: "Jinnah Postgraduate Medical Centre (JPMC)", city: "Karachi", available_icus: 0, ventilators: 2, available_beds: 300, phone: "+92-21-99201300" }
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // --- DERIVED DATA ---
  const getHospitalStatus = (h: Record<string, unknown>) => {
    const icus = Number(h.available_icus ?? 0);
    if (icus >= 10) return 'OPTIMAL';
    if (icus > 0) return 'LIMITED';
    return 'CRITICAL';
  };

  const filteredHospitals = useMemo(() => {
    let list = hospitals.filter((h) => String(h.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter !== 'ALL') list = list.filter((h) => getHospitalStatus(h) === statusFilter);
    if (sortByOpen) list = [...list].sort((a, b) => Number(b.available_icus ?? 0) - Number(a.available_icus ?? 0));
    return list;
  }, [hospitals, searchTerm, statusFilter, sortByOpen]);

  const capacityPct = (h: Record<string, unknown>) => {
    const total = Number(h.available_beds ?? 1);
    const open = Number(h.available_icus ?? 0);
    const pct = Math.round(((total - open) / total) * 100);
    return isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
  };

  const capacityColor = (pct: number) => (pct >= 95 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500');

  const statusBadge = (status: string) => {
    if (status === 'OPTIMAL') return 'bg-emerald-500/10 text-emerald-500';
    if (status === 'LIMITED') return 'bg-amber-500/10 text-amber-500';
    return 'bg-destructive/10 text-destructive';
  };

  const handleExportCsv = () => {
    const header = 'Hospital,City,OpenICUs,TotalBeds,OccupancyPct,Status,Ventilators\n';
    const rows = hospitals.map((h) => `"${h.name ?? 'Unnamed'}",${h.city ?? 'Unknown'},${Number(h.available_icus ?? 0)},${Number(h.available_beds ?? 0)},${capacityPct(h)}%,${getHospitalStatus(h)},${Number(h.ventilators ?? 0)}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital-mesh-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden" dir={lang === 'ur' ? 'rtl' : 'ltr'}>

      {/* LEFT SIDEBAR - MODULE CONTROLS */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-card border-r border-border hidden md:flex flex-col`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-border">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-primary" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5 text-primary" />
                <span>{lang === 'ur' ? 'سائیڈ بار بند کریں' : 'Collapse Sidebar'}</span>
              </>
            )}
          </button>
        </div>

        <div className="p-6 flex-1">
          {!sidebarCollapsed && (
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">{t.moduleControls}</p>
          )}
          <nav className="space-y-2">
            {[
              { id: 'Regional Map', label: t.tabs.map, icon: <Map className="w-4 h-4" /> },
              { id: 'Telemetry Stream', label: t.tabs.telemetry, icon: <Activity className="w-4 h-4" /> },
              { id: 'Active Fleet', label: t.tabs.fleet, icon: <Truck className="w-4 h-4" /> },
              { id: 'Staff Duty Roster', label: t.tabs.roster, icon: <Users className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border border-primary/30' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
                }`}
              >
                {tab.icon} {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
          title={lang === 'en' ? 'اردو' : 'English'}
          className={`m-6 mt-0 flex items-center justify-center gap-1.5 bg-accent border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground text-xs font-semibold p-3 rounded-xl transition-colors`}
        >
          <Languages className="w-3.5 h-3.5" /> {!sidebarCollapsed && (lang === 'en' ? 'اردو' : 'English')}
        </button>
      </aside>

      {/* CENTER MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* TOP BAR */}
        <header className="min-h-20 bg-background/50 backdrop-blur-md border-b border-border flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-3 relative z-[100]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-destructive" />
            <h1 className="text-base sm:text-lg font-bold text-foreground">{t.headerTitle}</h1>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            <button
              onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
              className="md:hidden flex items-center gap-1.5 bg-accent border border-border text-muted-foreground text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <Languages className="w-3.5 h-3.5" /> {lang === 'en' ? 'اردو' : 'EN'}
            </button>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-accent border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 w-48 sm:w-64"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-accent border border-border hover:border-primary/50 rounded-lg px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.exportCsv}</span>
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-accent border border-border rounded-lg text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"></span>}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-card border border-border rounded-2xl shadow-2xl z-[110] overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/50">
                  <span className="text-xs font-bold text-foreground">{t.alerts}</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((notif) => (
                    <div key={notif.id} className="p-3 border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[11px] font-bold ${notif.type === 'urgent' ? 'text-destructive' : 'text-primary'}`}>{notif.title}</span>
                        <span className="text-[9px] text-muted-foreground">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{notif.desc}</p>
                    </div>
                  )) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">{t.noAlerts}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 1. MASTER ROW WRAPPER: Forces Left Content and Right Sidebar side-by-side */}
        <div className="flex-1 w-full flex flex-row overflow-hidden relative">
          
          {/* 2. LEFT SCROLLABLE CONTENT */}
          <div className="flex-1 h-full overflow-y-auto p-6 md:p-8">
            
            {/* 3. ALIGN-TOP CONTENT WRAPPER: Kills the empty space and pulls content to the top */}
            <div className="flex flex-col justify-start space-y-6 min-h-max">
              
              <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

              {/* TSX Introduction Header */}
              <div className="flex flex-wrap items-end justify-between gap-4">

              <div>
                <p className="text-sm font-semibold text-primary">Live Telemetry</p>
                <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">ICU & bed mesh.</h1>
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  Facility telemetry is read directly from <code>hospitals</code>; no sample facilities
                  are injected when the table is empty.
                </p>
              </div>
              <button
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

          {error && (
            <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* JSX Disclaimer applied with Tailwind alerts */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-base leading-none">⚠️</span>
            <p className="text-xs text-amber-500/90 leading-relaxed">
              <strong className="font-bold">Real-time Telemetry Disclaimer:</strong> ICU bed counts and ventilator availability are updated via automated mesh feeds. Emergency dispatchers must perform direct verbal confirmation with regional hospital control before routing critical transport.
            </p>
          </div>

          {/* TSX Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              value={hospitals.reduce((sum, row) => sum + Number(row.available_icus ?? 0), 0)}
              label={t.availableIcus}
              loading={loading}
            />
            <StatCard value={hospitals.length} label={t.activeUnits} loading={loading} />
            <StatCard
              value={hospitals.reduce((sum, row) => sum + Number(row.ventilators ?? 0), 0)}
              label="Ventilators available"
              loading={loading}
            />
          </div>

          {/* TAB 1: REGIONAL MAP */}
          {activeTab === 'Regional Map' && (
            <div className="space-y-5">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-2xl p-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground ml-2" />
                {[
                  { id: 'ALL', label: t.filterAll },
                  { id: 'OPTIMAL', label: t.filterOptimal },
                  { id: 'LIMITED', label: t.filterLimited },
                  { id: 'CRITICAL', label: t.filterCritical },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      statusFilter === f.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  onClick={() => setSortByOpen((v) => !v)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    sortByOpen 
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> {t.sortByCapacity}
                </button>
              </div>

              {filteredHospitals.length === 0 && !loading && (
                <p className="p-6 text-sm text-muted-foreground bg-card border border-border rounded-3xl">
                  No hospitals have reported telemetry yet matching your filters.
                </p>
              )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredHospitals.map((hospital, index) => {
                  const pct = capacityPct(hospital);
                  const status = getHospitalStatus(hospital);
                  
                  return (
                    <div key={String(hospital.id ?? index)} className="bg-card/80 border border-border rounded-2xl p-6 relative hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{String(hospital.name ?? "Unnamed facility")}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{String(hospital.city ?? "Location unavailable")} Operations</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge(status)}`}>
                          {status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="bg-muted/40 rounded-xl p-4 border border-border/40 text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{t.icuOpen}</p>
                          <p className={`text-3xl font-black ${Number(hospital.available_icus) > 0 ? 'text-primary' : 'text-destructive'}`}>
                            {Number(hospital.available_icus ?? 0)}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded-xl p-4 border border-border/40 text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{t.totalBeds}</p>
                          <p className="text-3xl font-black text-foreground">
                            {Number(hospital.available_beds ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{t.capacity}</span>
                          <span className="text-[10px] font-bold text-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/30">
                          <div className={`h-full rounded-full ${capacityColor(pct)} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <a 
                          href={`tel:${String(hospital.phone ?? '')}`} 
                          className="p-3.5 bg-accent/60 border border-border hover:border-primary/50 rounded-xl text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                          title={`Call ${String(hospital.phone ?? '')}`}
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                    <button 
                        onClick={() => handleOpenDispatch(hospital)}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-primary/20"
                      >
                        {t.dispatch || "Initiate Dispatch"}
                    </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TELEMETRY STREAM */}
          {activeTab === 'Telemetry Stream' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-accent/50 text-[10px] font-mono text-muted-foreground uppercase border-b border-border">
                    <th className="p-4">{t.deviceId}</th>
                    <th className="p-4">{t.location}</th>
                    <th className="p-4">{t.o2}</th>
                    <th className="p-4">{t.bp}</th>
                    <th className="p-4">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {telemetryData.map((device, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-4 font-bold text-foreground">{device.id}</td>
                      <td className="p-4 text-muted-foreground">{device.location}</td>
                      <td className="p-4 font-mono text-primary">{device.patientO2}</td>
                      <td className="p-4 font-mono text-foreground">{device.bp}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${device.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                          {device.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ACTIVE FLEET */}
          {activeTab === 'Active Fleet' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeFleet.map((vehicle, i) => (
                <div key={i} className="bg-card/80 border border-border rounded-2xl p-5 relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                       <Truck className="w-5 h-5" />
                     </div>
                     <span className="font-mono text-xs text-muted-foreground font-bold">{vehicle.id}</span>
                   </div>

                   <h3 className="font-bold text-foreground text-base">{vehicle.type}</h3>
                   <p className="text-xs text-muted-foreground mb-4">{t.driver}: {vehicle.driver}</p>

                   <div className="bg-muted/40 border border-border/40 rounded-xl p-3 flex justify-between items-center">
                     <div>
                       <p className="text-[9px] font-mono text-muted-foreground uppercase">{t.destination}</p>
                       <p className="font-bold text-xs text-foreground mt-0.5">{vehicle.destination}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[9px] font-mono text-muted-foreground uppercase">{t.eta}</p>
                       <p className="font-mono font-bold text-xs text-primary mt-0.5">{vehicle.eta}</p>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: STAFF ROSTER */}
          {activeTab === 'Staff Duty Roster' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {staffRoster.map((staff, i) => (
                <div key={i} className="bg-card/80 border border-border rounded-2xl p-5 flex items-center gap-4">
                   <div className="p-3 bg-accent rounded-full border border-border text-primary flex-shrink-0">
                     <Stethoscope className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="font-bold text-foreground text-sm">{staff.name}</h3>
                      <p className="text-xs text-primary font-medium">{staff.role} • {staff.hospital}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{staff.shift}</p>
                   </div>
                </div>
              ))}
            </div>
          )}
          
          </div> {/* <-- ADDED: Closes the inner top-aligned space wrapper */}
        </div> {/* <-- ADDED: Closes the left scrollable content area */}
        
        {/* DOCKED RIGHT SIDEBAR - LIVE AUDIT LOG */}
          <aside className="w-80 flex-shrink-0 bg-card/30 border-l border-border hidden xl:flex flex-col justify-between p-6 h-full overflow-y-auto">
            <div>
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">{t.auditLog}</h3>
              </div>

              <div className="space-y-6 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/30">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></span>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">Just Now</span>
                    <p className="text-xs font-bold text-foreground mt-0.5">Unit BLS-74 Dispatched</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Routed to Civil Hospital for P2 Urgent trauma care.</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-border text-center">
              <span className="text-[10px] font-mono text-muted-foreground">{t.secure}</span>
            </div>
          </aside>
        </div>
        {/* DISPATCH CONFIRMATION MODAL */}
      {isDispatchModalOpen && selectedHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Confirm Emergency Dispatch</h3>
                <p className="text-xs text-muted-foreground">{selectedHospital.name}</p>
              </div>
            </div>

            <div className="space-y-3 bg-muted/40 border border-border/40 rounded-xl p-4 text-xs">
              <div className="flex justify-between items-center text-foreground font-medium">
                <span className="text-muted-foreground">Location:</span>
                <span>{selectedHospital.city ?? "Karachi"} Operations</span>
              </div>
              <div className="flex justify-between items-center text-foreground font-medium">
                <span className="text-muted-foreground">Current Available ICUs:</span>
                <span className="font-mono text-primary font-bold">{selectedHospital.available_icus}</span>
              </div>
              <div className="flex justify-between items-center text-destructive font-bold pt-2 border-t border-border/40">
                <span>Action Impact:</span>
                <span>-1 ICU Bed Allocated</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Initiating dispatch will reserve one critical care unit bed and alert regional telemetry dispatches immediately.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="flex-1 py-3 px-4 bg-accent hover:bg-accent/80 text-foreground font-semibold rounded-xl text-xs transition-colors border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all shadow-lg shadow-primary/20"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}