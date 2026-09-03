import {
  Baby,
  Crosshair,
  Droplet,
  Eye,
  FileText,
  Hand,
  HeartPulse,
  MapPin,
  MessageSquare,
  Mic,
  Navigation,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Module = {
  id: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  category: string;
  path: string;
};

export const modules: Module[] = [
  {
    id: 1,
    title: "Emergency ICU & Bed Mesh",
    desc: "Live telemetry on open ICUs, ventilators and emergency beds across regional centres.",
    icon: HeartPulse,
    category: "Emergency",
    path: "/module/1",
  },
  {
    id: 2,
    title: "Offline GSM / SMS Fallback",
    desc: "Disaster-resilient SMS gateway that routes critical requests when data networks fail.",
    icon: MessageSquare,
    category: "Resilience",
    path: "/module/2",
  },
  {
    id: 3,
    title: "CNIC Medical History Vault",
    desc: "Instant allergy, blood type and surgical history retrieval linked to national CNIC.",
    icon: ShieldCheck,
    category: "Vault",
    path: "/module/3",
  },
  {
    id: 4,
    title: "PakSign PSL Portal",
    desc: "Computer vision translating Pakistan Sign Language gestures into text for deaf patients.",
    icon: Hand,
    category: "Inclusion",
    path: "/module/4",
  },
  {
    id: 5,
    title: "AI Vision Diagnostics",
    desc: "Instant screening of chest X-rays, CT scans and skin lesions via edge vision models.",
    icon: Eye,
    category: "Diagnostics",
    path: "/module/5",
  },
  {
    id: 6,
    title: "Prescription OCR & Drug Safety",
    desc: "Digitises handwritten notes and flags fatal multi-drug contraindications.",
    icon: FileText,
    category: "Diagnostics",
    path: "/module/6",
  },
  {
    id: 7,
    title: "Epidemic Heatmapping",
    desc: "Early outbreak warnings from localised symptom spikes for dengue, cholera and malaria.",
    icon: Thermometer,
    category: "Surveillance",
    path: "/module/7",
  },
  {
    id: 8,
    title: "Urdu Mental Health Companion",
    desc: "Culturally sensitive Urdu conversation for immediate psychological support.",
    icon: Sparkles,
    category: "Triage",
    path: "/module/8",
  },
  {
    id: 9,
    title: "Native Urdu Voice Triage",
    desc: "Voice-first emergency assistant for low-literacy users in regional dialects.",
    icon: Mic,
    category: "Triage",
    path: "/module/9",
  },
  {
    id: 10,
    title: "Emergency Blood Matcher",
    desc: "Connects urgent ICU blood requests with nearby donors and registered blood banks.",
    icon: Droplet,
    category: "Emergency",
    path: "/module/10",
  },
  {
    id: 11,
    title: "Low-Bandwidth Tele-Clinic",
    desc: "Compressed WebRTC linking basic rural health units to urban specialists.",
    icon: Video,
    category: "Rural care",
    path: "/module/11",
  },
  {
    id: 12,
    title: "Mobile BHU Van Dispatcher",
    desc: "Geospatial fleet manager scheduling medical vans to unserved union councils.",
    icon: Navigation,
    category: "Rural care",
    path: "/module/12",
  },
  {
    id: 13,
    title: "Disaster Flood Rescue Pins",
    desc: "SOS pin grid letting stranded citizens drop GPS coordinates for boat rescue.",
    icon: MapPin,
    category: "Resilience",
    path: "/module/13",
  },
  {
    id: 14,
    title: "Maternal & Chronic Monitor",
    desc: "Automated triage tracking high-risk pregnancies and diabetic patients.",
    icon: Baby,
    category: "Care",
    path: "/module/14",
  },
  {
    id: 15,
    title: "Snakebite & First-Aid Engine",
    desc: "Decision tree for venomous bites plus an antiserum locator across district clinics.",
    icon: Crosshair,
    category: "Emergency",
    path: "/module/15",
  },
  {
    id: 16,
    title: "Child Immunization Tracker",
    desc: "Digital vaccine calendar with SMS reminder dispatch for infant immunisation drives.",
    icon: Zap,
    category: "Care",
    path: "/module/16",
  },
];

export const categories = ["All", ...Array.from(new Set(modules.map((module) => module.category)))];

export function getModule(id: number) {
  return modules.find((module) => module.id === id) ?? null;
}
