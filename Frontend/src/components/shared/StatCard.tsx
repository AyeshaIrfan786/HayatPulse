export function StatCard({
  value,
  label,
  loading = false,
}: {
  value: number | string;
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="font-display text-3xl font-bold">
        {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-surface" /> : value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}