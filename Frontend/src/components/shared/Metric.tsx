export function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value === null || value === undefined ? "—" : String(value)}
      </p>
    </div>
  );
}