import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export function ModuleHeader({
  title,
  category,
  icon: Icon,
}: {
  title: string;
  category: string;
  icon: LucideIcon;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 lg:px-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to console
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-surface">
            <Icon className="size-4" />
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{title}</p>
            <p className="eyebrow">{category}</p>
          </div>
        </div>
      </div>
    </header>
  );
}