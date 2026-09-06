import { useEffect, useState } from "react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";
import { SelectField } from "@/components/shared/SelectField";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const urgencyLevels = ["Standard", "Urgent", "Critical"];

export function BloodMatcherModule() {
  const module = getModule(10)!;
  const [donors, setDonors] = useState<Array<Record<string, unknown>>>([]);
  const [group, setGroup] = useState("A+");
  
  const [donor, setDonor] = useState({ name: "", blood_group: "A+", phone: "", city: "" });
  const [request, setRequest] = useState({
    blood_group: "A+",
    units: "1",
    urgency: "Critical",
    hospital: "",
    phone: "",
  });
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error: queryError } = await supabase
      .from("blood_donors")
      .select("*")
      .eq("available", true)
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setDonors((data ?? []) as Array<Record<string, unknown>>);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveDonor = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const { error: insertError } = await supabase.from("blood_donors").insert(donor);
    if (insertError) setError(insertError.message);
    else {
      setMessage("Donor successfully registered in the live registry.");
      setDonor({ name: "", blood_group: "A+", phone: "", city: "" });
      await load();
    }
    setSaving(false);
  };

  const saveRequest = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const { error: insertError } = await supabase
      .from("blood_requests")
      .insert({ ...request, units: Number(request.units) });
    if (insertError) setError(insertError.message);
    else {
      setMessage(`Blood request (${request.urgency}) submitted to the live queue.`);
      setRequest({ blood_group: "A+", units: "1", urgency: "Critical", hospital: "", phone: "" });
    }
    setSaving(false);
  };

  const matches = donors.filter((item) => String(item.blood_group ?? "").toUpperCase() === group);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow text-red-600 font-semibold tracking-wider uppercase text-sm">Live donor registry</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Emergency blood matcher.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Donors and requests are persisted in Supabase. Matching is filtered against the live
            donor rows returned for the selected blood group.
          </p>
        </div>

        {/* Critical Medical Disclaimer */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 flex gap-4 items-start">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">Emergency Protocol & Liability Disclaimer</h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
              This system facilitates rapid donor discovery during critical emergencies. Al Khidmat Foundation requires that standard cross-matching and infectious disease screening be performed by certified hospital staff prior to any transfusion. Do not bypass medical verification.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Blood Request Section (Urgent Styling) */}
          <section className="rounded-3xl border-2 border-red-500/20 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-display text-2xl font-bold">Create blood request</h2>
            </div>
            
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Blood group"
                value={request.blood_group}
                onChange={(value) => setRequest({ ...request, blood_group: value })}
                options={bloodGroups}
              />
              <Field
                label="Units required"
                type="number"
                value={request.units}
                onChange={(value) => setRequest({ ...request, units: value })}
              />
              <SelectField
                label="Urgency level"
                value={request.urgency}
                onChange={(value) => setRequest({ ...request, urgency: value })}
                options={urgencyLevels}
              />
              <Field
                label="Hospital / Clinic"
                value={request.hospital}
                onChange={(value) => setRequest({ ...request, hospital: value })}
              />
              <Field
                label="Contact phone"
                value={request.phone}
                onChange={(value) => setRequest({ ...request, phone: value })}
              />
            </div>
            <button
              onClick={() => void saveRequest()}
              disabled={saving}
              className="mt-6 w-full rounded-full bg-red-600 hover:bg-red-700 px-5 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              Submit emergency request
            </button>
          </section>

          {/* Donor Registration Section (Standard Styling) */}
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Register donor</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Full Name"
                value={donor.name}
                onChange={(value) => setDonor({ ...donor, name: value })}
              />
              <SelectField
                label="Blood group"
                value={donor.blood_group}
                onChange={(value) => setDonor({ ...donor, blood_group: value })}
                options={bloodGroups}
              />
              <Field
                label="Phone number"
                value={donor.phone}
                onChange={(value) => setDonor({ ...donor, phone: value })}
              />
              <Field
                label="City / Area"
                value={donor.city}
                onChange={(value) => setDonor({ ...donor, city: value })}
              />
            </div>
            <button
              onClick={() => void saveDonor()}
              disabled={saving}
              className="mt-6 w-full rounded-full border border-border bg-surface hover:bg-secondary px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              Save to donor registry
            </button>
          </section>
        </div>

        {/* Status Messages */}
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400 font-medium"
          >
            {message}
          </p>
        )}

        {/* Matches Section */}
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-muted-foreground uppercase text-xs tracking-widest font-semibold">Live Feed</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Potential Matches</h2>
            </div>
            <SelectField
              label="Filter group"
              value={group}
              onChange={setGroup}
              options={bloodGroups}
            />
          </div>
          
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((item, index) => (
              <article
                key={String(item.id ?? index)}
                className="rounded-2xl border border-border bg-surface p-4 hover:border-red-500/30 transition-colors"
              >
                <p className="font-semibold">{String(item.name ?? "Unnamed donor")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                    {String(item.blood_group)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · {String(item.city ?? "Location unavailable")}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  📞 {String(item.phone ?? "No phone recorded")}
                </p>
              </article>
            ))}
            {matches.length === 0 && (
              <div className="col-span-full py-8 text-center rounded-2xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No available donor rows match <strong className="text-foreground">{group}</strong> at this time.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}