import { useEffect, useState } from "react";
import { getModule } from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Field } from "@/components/shared/Field";
import { SelectField } from "@/components/shared/SelectField";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function BloodMatcherModule() {
  const module = getModule(10)!;
  const [donors, setDonors] = useState<Array<Record<string, unknown>>>([]);
  const [group, setGroup] = useState("A+");
  const [donor, setDonor] = useState({ name: "", blood_group: "A+", phone: "", city: "" });
  const [request, setRequest] = useState({
    blood_group: "A+",
    units: "1",
    urgency: "critical",
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
      setMessage("Donor registered in the live donor registry.");
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
      setMessage("Blood request submitted to the live queue.");
      setRequest({ blood_group: "A+", units: "1", urgency: "critical", hospital: "", phone: "" });
    }
    setSaving(false);
  };
  const matches = donors.filter((item) => String(item.blood_group ?? "").toUpperCase() === group);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-10">
        <div>
          <p className="eyebrow">Live donor registry</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Emergency blood matcher.</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Donors and requests are persisted in Supabase. Matching is filtered against the live
            donor rows returned for the selected blood group.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Create blood request</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Blood group"
                value={request.blood_group}
                onChange={(value) => setRequest({ ...request, blood_group: value })}
                options={bloodGroups}
              />
              <Field
                label="Units"
                type="number"
                value={request.units}
                onChange={(value) => setRequest({ ...request, units: value })}
              />
              <Field
                label="Hospital"
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
              className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Submit request
            </button>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl font-bold">Register donor</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Name"
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
                label="Phone"
                value={donor.phone}
                onChange={(value) => setDonor({ ...donor, phone: value })}
              />
              <Field
                label="City"
                value={donor.city}
                onChange={(value) => setDonor({ ...donor, city: value })}
              />
            </div>
            <button
              onClick={() => void saveDonor()}
              disabled={saving}
              className="mt-5 w-full rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              Save donor
            </button>
          </section>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground"
          >
            {message}
          </p>
        )}
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Available now</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Potential matches</h2>
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
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="font-semibold">{String(item.name ?? "Unnamed donor")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {String(item.blood_group)} · {String(item.city ?? "Location unavailable")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {String(item.phone ?? "No phone recorded")}
                </p>
              </article>
            ))}
            {matches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No available donor rows match this group.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}